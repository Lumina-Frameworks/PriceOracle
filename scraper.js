const fs = require("fs");
const path = require("path");
const Parser = require("rss-parser");

const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
});

// Feeds from authorized, credible tech sources
const FEEDS = [
    { name: "Tom's Hardware", url: "https://www.tomshardware.com/feeds/all" },
    { name: "TechPowerUp", url: "https://www.techpowerup.com/rss/news" },
    { name: "PC Gamer", url: "https://www.pcgamer.com/rss/" }
];

const DATA_FILE_PATH = path.join(__dirname, "data.json");

// Load current database
function loadData() {
    try {
        const raw = fs.readFileSync(DATA_FILE_PATH, "utf8");
        return JSON.parse(raw);
    } catch (e) {
        console.error("Error reading data.json, returning empty structure", e);
        return null;
    }
}

// Save database
function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), "utf8");
        console.log("data.json updated successfully.");
    } catch (e) {
        console.error("Error writing data.json", e);
    }
}

// Parse headlines to match categories & items
function matchItemsAndCategories(title, desc, items) {
    const text = (title + " " + desc).toLowerCase();
    const matchedItems = [];
    let matchedCategory = null;

    // Keyword definitions
    const catKeywords = {
        ram: ["ram", "ddr4", "ddr5", "dram", "memory", "corsair", "g.skill"],
        gpu: ["gpu", "graphics", "card", "rtx", "nvidia", "geforce", "radeon", "amd", "rx 7", "rx 6", "blackwell", "battlemage"],
        cpu: ["cpu", "processor", "intel", "ryzen", "core i", "7800x3d", "14700k", "arrow lake", "zen 5"],
        laptop: ["laptop", "notebook", "macbook", "zephyrus", "thinkpad", "legion", "razer blade", "zenbook", "yoga", "gaming laptop"]
    };

    // 1. Identify category
    for (const [cat, keywords] of Object.entries(catKeywords)) {
        if (keywords.some(kw => text.includes(kw))) {
            matchedCategory = cat;
            break;
        }
    }

    // 2. Identify specific items
    items.forEach(item => {
        const itemId = item.id;
        let searchTerms = [item.name.toLowerCase(), itemId];
        
        if (itemId.includes("4070")) searchTerms.push("4070", "rtx 4070");
        if (itemId.includes("4080")) searchTerms.push("4080", "rtx 4080");
        if (itemId.includes("7800-xt")) searchTerms.push("7800 xt", "7800xt", "rx 7800");
        if (itemId.includes("7800x3d")) searchTerms.push("7800x3d", "ryzen 7 7800x3d", "7800x 3d");
        if (itemId.includes("14700k")) searchTerms.push("14700k", "i7-14700k", "14700");
        if (itemId.includes("ddr4")) searchTerms.push("ddr4", "ddr4 memory");
        if (itemId.includes("ddr5")) searchTerms.push("ddr5", "ddr5 memory");
        if (itemId.includes("zephyrus")) searchTerms.push("zephyrus", "g14", "zephyrus g14");
        if (itemId.includes("macbook")) searchTerms.push("macbook", "macbook air", "macbook air m3");
        if (itemId.includes("legion")) searchTerms.push("legion", "legion 5", "legion 5 pro");

        if (searchTerms.some(term => text.includes(term))) {
            matchedItems.push(itemId);
        }
    });

    return { matchedCategory, matchedItems };
}

// Perform simple sentiment analysis
function analyzeSentiment(title, desc) {
    const text = (title + " " + desc).toLowerCase();
    
    const bullishWords = ["rise", "rising", "increase", "shortage", "up", "growth", "high", "expensive", "inflation", "hike", "outpace", "demand", "stockout", "higher", "profit", "gain"];
    const bearishWords = ["cut", "drop", "plunge", "plummet", "slash", "reduction", "sale", "discount", "surplus", "down", "low", "cheap", "overproduction", "lower", "loss", "oversupply", "clearance"];

    let bullishCount = 0;
    let bearishCount = 0;

    bullishWords.forEach(w => { if (text.includes(w)) bullishCount++; });
    bearishWords.forEach(w => { if (text.includes(w)) bearishCount++; });

    if (bullishCount > bearishCount) return "bullish";
    if (bearishCount > bullishCount) return "bearish";
    return "neutral";
}

async function scrapeDailyNews() {
    console.log("Initializing daily scraper run...");
    const db = loadData();
    if (!db) return;

    // Flatten all items across categories to simplify mapping
    const allItems = [
        ...db.ram.items,
        ...db.gpu.items,
        ...db.cpu.items,
        ...db.laptop.items
    ];

    let newNewsCount = 0;
    const scrapedArticles = [];

    // Crawl RSS feeds
    for (const feed of FEEDS) {
        try {
            console.log(`Fetching RSS from ${feed.name}...`);
            const feedData = await parser.parseURL(feed.url);
            
            feedData.items.forEach(article => {
                const title = article.title || "";
                const content = article.contentSnippet || article.content || "";
                const pubDate = article.pubDate || new Date().toISOString();
                const link = article.link || "";

                const { matchedCategory, matchedItems } = matchItemsAndCategories(title, content, allItems);
                
                // If it is related to computer components, store it
                if (matchedCategory || matchedItems.length > 0) {
                    const sentiment = analyzeSentiment(title, content);
                    
                    scrapedArticles.push({
                        headline: title,
                        source: feed.name,
                        date: new Date(pubDate).toISOString().split("T")[0],
                        impact: sentiment,
                        url: link,
                        category: matchedCategory || "laptop", // default fallback
                        affectedItems: matchedItems
                    });
                }
            });
        } catch (e) {
            console.error(`Error crawling ${feed.name}:`, e.message);
        }
    }

    // Filter duplicates and append news
    const cleanUrl = url => url.split("?")[0].trim().toLowerCase();
    
    // Build quick set of existing URLs to avoid duplicates
    const existingUrls = new Set();
    db.globalNews.forEach(n => existingUrls.add(cleanUrl(n.url)));
    db.ram.news.forEach(n => existingUrls.add(cleanUrl(n.url)));
    db.gpu.news.forEach(n => existingUrls.add(cleanUrl(n.url)));
    db.cpu.news.forEach(n => existingUrls.add(cleanUrl(n.url)));
    db.laptop.news.forEach(n => existingUrls.add(cleanUrl(n.url)));

    // Process new articles
    const itemSentimentMap = {}; // itemId -> array of sentiments

    scrapedArticles.forEach(art => {
        const urlKey = cleanUrl(art.url);
        if (!existingUrls.has(urlKey)) {
            existingUrls.add(urlKey);
            newNewsCount++;

            // Create client-facing news object
            const clientNews = {
                headline: art.headline,
                source: art.source,
                date: art.date,
                impact: art.impact,
                url: art.url,
                affectedItems: art.affectedItems
            };

            // 1. Add to global feed
            db.globalNews.unshift(clientNews);

            // 2. Add to category news
            if (art.category && db[art.category]) {
                db[art.category].news.unshift(clientNews);
                // Keep category news at max 5
                if (db[art.category].news.length > 5) {
                    db[art.category].news.pop();
                }
            }

            // 3. Keep track of item sentiments for price calculations
            art.affectedItems.forEach(itemId => {
                if (!itemSentimentMap[itemId]) itemSentimentMap[itemId] = [];
                itemSentimentMap[itemId].push(art.impact);
            });
        }
    });

    // Keep global news capped at 10 items
    if (db.globalNews.length > 10) {
        db.globalNews = db.globalNews.slice(0, 10);
    }

    console.log(`Scraping complete. Found ${newNewsCount} new articles.`);

    // Daily Price Action Simulation
    const now = new Date();
    const lastUpdateDate = new Date(db.lastUpdated);
    const dayHasPassed = now.toDateString() !== lastUpdateDate.toDateString();

    if (dayHasPassed || newNewsCount > 0) {
        console.log("Simulating daily price changes based on news sentiment...");
        
        const categories = ["ram", "gpu", "cpu", "laptop"];
        categories.forEach(cat => {
            db[cat].items.forEach(item => {
                const sentiments = itemSentimentMap[item.id] || [];
                
                // Determine direction based on news sentiment
                let multiplier = 0;
                let bullishCount = sentiments.filter(s => s === "bullish").length;
                let bearishCount = sentiments.filter(s => s === "bearish").length;

                if (bullishCount > bearishCount) {
                    multiplier = 0.005 + Math.random() * 0.02; // +0.5% to +2.5%
                } else if (bearishCount > bullishCount) {
                    multiplier = -(0.005 + Math.random() * 0.02); // -0.5% to -2.5%
                } else {
                    multiplier = (Math.random() - 0.5) * 0.006; // -0.3% to +0.3%
                }

                const lastPrice = item.price;
                const newPrice = Math.max(10, lastPrice * (1 + multiplier));
                
                item.history.shift();
                item.history.push(parseFloat(newPrice.toFixed(2)));
                item.price = parseFloat(newPrice.toFixed(2));

                const price7dAgo = item.history[item.history.length - 7];
                const changePct = ((newPrice - price7dAgo) / price7dAgo) * 100;
                item.change = parseFloat(changePct.toFixed(1));
                item.trend = changePct >= 0 ? "up" : "down";

                let baseConf = 55 + Math.floor(Math.random() * 15);
                if (sentiments.length > 0) {
                    baseConf = Math.min(95, baseConf + 15);
                }
                item.confidence = baseConf;
            });
        });

        db.lastUpdated = now.toISOString();
    }

    saveData(db);
}

// Run scraper
scrapeDailyNews();
