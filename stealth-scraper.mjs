// ESM module — cloakbrowser is ESM-only ("type": "module", no CJS export).
// Run: node stealth-scraper.mjs
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');

// Resolve cloakbrowser from the AnyCrawl pnpm workspace (not installed in this repo).
const CLOAK_PATH = "C:/Users/Aliff Ros/Documents/AnyCrawl/packages/scrape/node_modules/cloakbrowser/dist/index.js";
const DATA_FILE = path.join(process.cwd(), "data.json");

function loadData() {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function analyzeSentiment(title) {
    const text = title.toLowerCase();
    const bull = ["jump", "surge", "increase", "shortage", "expensive", "hike", "soar", "rise", "scalper", "price increase"];
    const bear = ["cut", "drop", "discount", "plummet", "slash", "reduction", "cheap", "sale", "decline", "price cut"];

    let bCount = 0, rCount = 0;
    bull.forEach(w => { if (text.includes(w)) bCount++; });
    bear.forEach(w => { if (text.includes(w)) rCount++; });

    if (bCount > rCount) return "bullish";
    if (rCount > bCount) return "bearish";
    return "neutral";
}

async function runStealthScrape() {
    console.log("🥷 Stealth scraper: CloakBrowser engine starting...");
    let browser;
    try {
        const cloak = await import(pathToFileURL(CLOAK_PATH).href);
        browser = await cloak.launch({ headless: true });
        const page = await browser.newPage();

        const targets = [
            { name: "VideoCardz", url: "https://videocardz.com/" },
            { name: "Wccftech", url: "https://wccftech.com/category/hardware/" }
        ];

        const scrapedArticles = [];

        for (const target of targets) {
            console.log(`📡 Crawling ${target.name} via stealth browser...`);
            try {
                await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 30000 });
                await page.waitForTimeout(2000);

                const items = await page.evaluate((sourceName) => {
                    const res = [];
                    const seen = new Set();
                    document.querySelectorAll("article, h2.entry-title, h3, .post-title").forEach(el => {
                        const linkEl = el.querySelector("a") || el.closest("a");
                        const text = el.innerText.trim();
                        if (text && text.length > 15 && linkEl && linkEl.href && !seen.has(linkEl.href)) {
                            seen.add(linkEl.href);
                            res.push({
                                headline: text.split("\n")[0].trim(),
                                url: linkEl.href,
                                source: sourceName,
                                date: new Date().toISOString().split("T")[0]
                            });
                        }
                    });
                    return res;
                }, target.name);

                console.log(`✅ ${target.name}: ${items.length} headlines extracted.`);
                scrapedArticles.push(...items.slice(0, 12));
            } catch (err) {
                console.error(`❌ ${target.name} failed (non-critical):`, err.message);
            }
        }

        if (scrapedArticles.length > 0) {
            const db = loadData();
            const cleanUrl = (u) => (u || "").split("?")[0].trim().toLowerCase();
            const existingUrls = new Set((db.globalNews || []).map(n => cleanUrl(n.url)));

            let addedCount = 0;
            scrapedArticles.forEach(art => {
                const uKey = cleanUrl(art.url);
                if (!existingUrls.has(uKey) && art.headline) {
                    existingUrls.add(uKey);
                    addedCount++;
                    db.globalNews.unshift({
                        headline: art.headline,
                        source: art.source,
                        date: art.date,
                        impact: analyzeSentiment(art.headline),
                        url: art.url,
                        affectedItems: []
                    });
                }
            });

            if (db.globalNews.length > 14) {
                db.globalNews = db.globalNews.slice(0, 14);
            }

            db.lastUpdated = new Date().toISOString();
            saveData(db);
            console.log(`✨ Stealth scrape complete: ${addedCount} new articles merged into data.json.`);
            return addedCount;
        }
        console.log("ℹ️ No new stealth articles found.");
        return 0;

    } catch (e) {
        // Non-fatal by design: RSS pipeline remains primary source of truth.
        console.error("⚠️ Stealth scraper unavailable this run:", e.message);
        return 0;
    } finally {
        if (browser) await browser.close();
    }
}

export { runStealthScrape, analyzeSentiment };

// CLI entry: node stealth-scraper.mjs
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    runStealthScrape().then(() => process.exit(0));
}
