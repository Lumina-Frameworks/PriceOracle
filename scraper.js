const fs = require("fs");
const path = require("path");
const Parser = require("rss-parser");

const parser = new Parser({
    headers: {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
});

// Broader authorized tech sources for better price-signal coverage
const FEEDS = [
    { name: "Tom's Hardware", url: "https://www.tomshardware.com/feeds/all" },
    { name: "TechPowerUp", url: "https://www.techpowerup.com/rss/news" },
    { name: "PC Gamer", url: "https://www.pcgamer.com/rss/" },
    { name: "AnandTech", url: "https://www.anandtech.com/rss/" },
    { name: "VideoCardz", url: "https://videocardz.com/feed" },
];

const CATEGORIES = ["ram", "gpu", "cpu", "storage", "laptop"];
const DATA_FILE_PATH = path.join(__dirname, "data.json");

function loadData() {
    try {
        const raw = fs.readFileSync(DATA_FILE_PATH, "utf8");
        return JSON.parse(raw);
    } catch (e) {
        console.error("Error reading data.json, returning empty structure", e);
        return null;
    }
}

function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), "utf8");
        console.log("data.json updated successfully.");
    } catch (e) {
        console.error("Error writing data.json", e);
    }
}

function getAllItems(db) {
    return CATEGORIES.flatMap((cat) => (db[cat] && db[cat].items ? db[cat].items : []));
}

function getItemSearchTerms(item) {
    const itemId = item.id;
    const terms = new Set([item.name.toLowerCase(), itemId.replace(/-/g, " "), itemId]);

    const aliasMap = {
        "4070": ["4070", "rtx 4070"],
        "4060": ["4060", "rtx 4060"],
        "4080": ["4080", "rtx 4080"],
        "5090": ["5090", "rtx 5090"],
        "7800-xt": ["7800 xt", "7800xt", "rx 7800"],
        "9070": ["9070", "rx 9070", "9070 xt"],
        "7800x3d": ["7800x3d", "ryzen 7 7800x3d", "7800x 3d"],
        "9800x3d": ["9800x3d", "ryzen 7 9800x3d", "9800x 3d"],
        "7600x": ["7600x", "ryzen 5 7600x"],
        "14600k": ["14600k", "i5-14600k", "core i5-14600k"],
        "14700k": ["14700k", "i7-14700k", "core i7-14700k"],
        "14900k": ["14900k", "i9-14900k", "core i9-14900k"],
        ddr4: ["ddr4", "ddr4 memory", "ddr4 ram"],
        ddr5: ["ddr5", "ddr5 memory", "ddr5 ram"],
        "ssd-1tb-nvme": ["1tb nvme", "1tb ssd", "pcie 4.0 ssd"],
        "ssd-2tb-nvme": ["2tb nvme", "2tb ssd"],
        "ssd-4tb-nvme": ["4tb nvme", "4tb ssd"],
        "ssd-1tb-pcie5": ["pcie 5", "pcie5", "pcie 5.0 ssd"],
        "hdd-4tb": ["4tb hdd", "4tb hard drive"],
        "hdd-8tb": ["8tb hdd", "8tb hard drive"],
        zephyrus: ["zephyrus", "g14", "zephyrus g14"],
        macbook: ["macbook", "macbook air", "macbook pro"],
        legion: ["legion", "legion 5", "legion 5 pro"],
        razer: ["razer blade", "blade 16"],
        thinkpad: ["thinkpad", "x1 carbon"],
    };

    for (const [key, aliases] of Object.entries(aliasMap)) {
        if (itemId.includes(key) || item.name.toLowerCase().includes(key)) {
            aliases.forEach((a) => terms.add(a));
        }
    }

    return [...terms];
}

function matchItemsAndCategories(title, desc, items) {
    const text = `${title} ${desc}`.toLowerCase();
    const matchedItems = [];
    let matchedCategory = null;

    const catKeywords = {
        storage: [
            "ssd",
            "nvme",
            "nand",
            "hdd",
            "hard drive",
            "storage",
            "pcie 5",
            "pcie5",
            "solid state",
        ],
        ram: ["ram", "ddr4", "ddr5", "dram", "memory", "corsair", "g.skill", "hbm"],
        gpu: [
            "gpu",
            "graphics",
            "graphics card",
            "rtx",
            "nvidia",
            "geforce",
            "radeon",
            "blackwell",
            "battlemage",
            "gddr",
            "rx 7",
            "rx 9",
        ],
        cpu: [
            "cpu",
            "processor",
            "intel",
            "ryzen",
            "core i",
            "arrow lake",
            "zen 5",
            "x3d",
            "desktop cpu",
        ],
        laptop: [
            "laptop",
            "notebook",
            "macbook",
            "zephyrus",
            "thinkpad",
            "legion",
            "razer blade",
            "zenbook",
            "yoga",
            "gaming laptop",
            "ultrabook",
        ],
    };

    // Prefer more specific categories first
    for (const cat of CATEGORIES) {
        if (catKeywords[cat].some((kw) => text.includes(kw))) {
            matchedCategory = cat;
            break;
        }
    }

    items.forEach((item) => {
        const searchTerms = getItemSearchTerms(item);
        if (searchTerms.some((term) => text.includes(term))) {
            matchedItems.push(item.id);
        }
    });

    return { matchedCategory, matchedItems };
}

function analyzeSentiment(title, desc) {
    const text = `${title} ${desc}`.toLowerCase();

    const bullishWords = [
        "rise",
        "rising",
        "increase",
        "shortage",
        "growth",
        "expensive",
        "inflation",
        "hike",
        "outpace",
        "demand",
        "stockout",
        "higher",
        "profit",
        "gain",
        "premium",
        "tight",
        "allocation",
        "sold out",
        "surge",
        "climb",
        "upward",
        "scarce",
    ];
    const bearishWords = [
        "cut",
        "drop",
        "plunge",
        "plummet",
        "slash",
        "reduction",
        "sale",
        "discount",
        "surplus",
        "cheap",
        "overproduction",
        "lower",
        "loss",
        "oversupply",
        "clearance",
        "deal",
        "markdown",
        "softening",
        "decline",
        "falling",
        "price cut",
    ];

    let bullishCount = 0;
    let bearishCount = 0;
    bullishWords.forEach((w) => {
        if (text.includes(w)) bullishCount += 1;
    });
    bearishWords.forEach((w) => {
        if (text.includes(w)) bearishCount += 1;
    });

    if (bullishCount > bearishCount) return "bullish";
    if (bearishCount > bullishCount) return "bearish";
    return "neutral";
}

function computeConfidence(item, sentiments, multiplier) {
    const history = item.history || [];
    let trendConsistency = 0.5;
    let volatilityPenalty = 0;

    if (history.length >= 8) {
        const recent = history.slice(-7);
        const ups = recent.filter((p, idx) => idx > 0 && p >= recent[idx - 1]).length;
        const downs = recent.filter((p, idx) => idx > 0 && p < recent[idx - 1]).length;
        const directionUp = multiplier >= 0;
        trendConsistency = (directionUp ? ups : downs) / Math.max(1, recent.length - 1);

        const returns = [];
        for (let i = 1; i < history.length; i += 1) {
            returns.push((history[i] - history[i - 1]) / history[i - 1]);
        }
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance =
            returns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / Math.max(1, returns.length);
        const std = Math.sqrt(variance);
        volatilityPenalty = Math.min(18, std * 900);
    }

    const newsSupport = Math.min(18, sentiments.length * 6);
    const agreementBoost =
        sentiments.length > 0
            ? (() => {
                  const bull = sentiments.filter((s) => s === "bullish").length;
                  const bear = sentiments.filter((s) => s === "bearish").length;
                  const total = sentiments.length;
                  const majority = Math.max(bull, bear) / total;
                  return majority * 10;
              })()
            : 0;

    // Base confidence + evidence - noise
    let conf = 58 + trendConsistency * 20 + newsSupport + agreementBoost - volatilityPenalty;
    conf = Math.round(Math.max(55, Math.min(95, conf)));
    return conf;
}

function ensureCategoryScaffold(db) {
    CATEGORIES.forEach((cat) => {
        if (!db[cat]) {
            db[cat] = {
                displayName: cat.toUpperCase(),
                items: [],
                outlook: "",
                news: [],
            };
        }
        if (!Array.isArray(db[cat].news)) db[cat].news = [];
        if (!Array.isArray(db[cat].items)) db[cat].items = [];
    });
    if (!Array.isArray(db.globalNews)) db.globalNews = [];
}

async function scrapeDailyNews() {
    console.log("Initializing daily scraper run...");
    const db = loadData();
    if (!db) return;

    ensureCategoryScaffold(db);
    const allItems = getAllItems(db);

    let newNewsCount = 0;
    const scrapedArticles = [];

    for (const feed of FEEDS) {
        try {
            console.log(`Fetching RSS from ${feed.name}...`);
            const feedData = await parser.parseURL(feed.url);

            feedData.items.forEach((article) => {
                const title = article.title || "";
                const content = article.contentSnippet || article.content || "";
                const pubDate = article.pubDate || new Date().toISOString();
                const link = article.link || "";

                const { matchedCategory, matchedItems } = matchItemsAndCategories(
                    title,
                    content,
                    allItems
                );

                if (matchedCategory || matchedItems.length > 0) {
                    const sentiment = analyzeSentiment(title, content);
                    scrapedArticles.push({
                        headline: title.trim(),
                        source: feed.name,
                        date: new Date(pubDate).toISOString().split("T")[0],
                        impact: sentiment,
                        url: link,
                        category: matchedCategory || "gpu",
                        affectedItems: matchedItems,
                    });
                }
            });
        } catch (e) {
            console.error(`Error crawling ${feed.name}:`, e.message);
        }
    }

    const cleanUrl = (url) => (url || "").split("?")[0].trim().toLowerCase();
    const existingUrls = new Set();
    db.globalNews.forEach((n) => existingUrls.add(cleanUrl(n.url)));
    CATEGORIES.forEach((cat) => {
        db[cat].news.forEach((n) => existingUrls.add(cleanUrl(n.url)));
    });

    const itemSentimentMap = {};

    scrapedArticles.forEach((art) => {
        const urlKey = cleanUrl(art.url);
        if (!urlKey || existingUrls.has(urlKey)) return;

        existingUrls.add(urlKey);
        newNewsCount += 1;

        const clientNews = {
            headline: art.headline,
            source: art.source,
            date: art.date,
            impact: art.impact,
            url: art.url,
            affectedItems: art.affectedItems,
        };

        db.globalNews.unshift(clientNews);

        if (art.category && db[art.category]) {
            db[art.category].news.unshift(clientNews);
            if (db[art.category].news.length > 8) {
                db[art.category].news = db[art.category].news.slice(0, 8);
            }
        }

        art.affectedItems.forEach((itemId) => {
            if (!itemSentimentMap[itemId]) itemSentimentMap[itemId] = [];
            itemSentimentMap[itemId].push(art.impact);
        });
    });

    if (db.globalNews.length > 14) {
        db.globalNews = db.globalNews.slice(0, 14);
    }

    console.log(`Scraping complete. Found ${newNewsCount} new articles.`);

    // Daily Price Action Simulation with improved confidence model
    const now = new Date();
    const lastUpdateDate = new Date(db.lastUpdated || 0);
    const dayHasPassed = now.toDateString() !== lastUpdateDate.toDateString();

    if (dayHasPassed || newNewsCount > 0) {
        console.log("Simulating daily price changes based on news sentiment...");

        CATEGORIES.forEach((cat) => {
            db[cat].items.forEach((item) => {
                const sentiments = itemSentimentMap[item.id] || [];
                let multiplier = 0;
                const bullishCount = sentiments.filter((s) => s === "bullish").length;
                const bearishCount = sentiments.filter((s) => s === "bearish").length;

                if (bullishCount > bearishCount) {
                    multiplier = 0.004 + Math.random() * 0.018; // +0.4% to +2.2%
                } else if (bearishCount > bullishCount) {
                    multiplier = -(0.004 + Math.random() * 0.018);
                } else {
                    // mild mean-reversion noise when news is quiet
                    multiplier = (Math.random() - 0.5) * 0.005;
                }

                // Category priors from known market regimes
                if (cat === "storage" && bullishCount >= bearishCount) {
                    multiplier += 0.002;
                }
                if (cat === "cpu" && item.id.includes("x3d") && bullishCount >= bearishCount) {
                    multiplier += 0.0015;
                }
                if (cat === "cpu" && (item.id.includes("14600") || item.id.includes("14700") || item.id.includes("14900"))) {
                    multiplier -= 0.001;
                }

                const lastPrice = item.price;
                const newPrice = Math.max(8, lastPrice * (1 + multiplier));

                if (!Array.isArray(item.history)) item.history = [lastPrice];
                item.history.shift();
                item.history.push(parseFloat(newPrice.toFixed(2)));
                item.price = parseFloat(newPrice.toFixed(2));

                const price7dAgo = item.history[Math.max(0, item.history.length - 7)];
                const changePct = ((newPrice - price7dAgo) / price7dAgo) * 100;
                item.change = parseFloat(changePct.toFixed(1));
                item.trend = changePct >= 0 ? "up" : "down";
                item.confidence = computeConfidence(item, sentiments, multiplier);
            });
        });

        db.lastUpdated = now.toISOString();
    } else {
        // Always ensure confidence exists even on quiet days
        CATEGORIES.forEach((cat) => {
            db[cat].items.forEach((item) => {
                if (typeof item.confidence !== "number") {
                    item.confidence = computeConfidence(item, [], 0);
                }
            });
        });
    }

    saveData(db);
}

scrapeDailyNews();
