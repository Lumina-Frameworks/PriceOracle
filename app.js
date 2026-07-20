/**
 * PriceOracle - Application Logic
 * Implements Hash-Based SPA Router, Category Valuation Indexes, news-item mappings, and interactive charts.
 */

document.addEventListener("DOMContentLoaded", () => {
    let marketData = null;
    let currentCategory = "ram";
    let currentItem = null;

    // Route Mappings for SPA
    const routes = {
        "/home": "page-home",
        "/dashboard": "page-dashboard",
        "/analytics": "page-analytics",
        "/news": "page-news",
        "/about": "page-about"
    };

    // Elements
    const loader = document.getElementById("loader");
    const liveClockEl = document.getElementById("live-clock");
    const themeToggleBtn = document.getElementById("theme-toggle");
    const dashboardGrid = document.getElementById("dashboard-grid");
    
    // Detailed Analysis Elements
    const categoryTabs = document.getElementById("category-tabs");
    const itemSelect = document.getElementById("item-select");
    const chartWrapper = document.getElementById("price-chart-wrapper");
    const chartItemTitle = document.getElementById("chart-item-title");
    const chartItemTrend = document.getElementById("chart-item-trend");
    const categoryOutlook = document.getElementById("category-outlook");
    const categoryNewsList = document.getElementById("category-news-list");
    
    // News Feed Element
    const newsFeedContainer = document.getElementById("news-feed-container");

    // 1. Loader dismissal
    setTimeout(() => {
        if (loader) {
            loader.classList.add("fade-out");
        }
    }, 600);

    // 2. SPA Hash Router (No-scrolling multi-page experience)
    const handleRouting = () => {
        const hash = window.location.hash || "#/home";
        const path = hash.replace("#", "");
        const targetPageId = routes[path] || "page-home";

        // Hide all views, display target page view
        document.querySelectorAll(".page-view").forEach(page => {
            page.classList.remove("active");
        });
        const activePage = document.getElementById(targetPageId);
        if (activePage) {
            activePage.classList.add("active");
        }

        // Update nav link active highlight states
        document.querySelectorAll(".nav-link").forEach(link => {
            link.classList.remove("active");
            const hrefAttr = link.getAttribute("href");
            if (hrefAttr === hash || (hash === "#/home" && hrefAttr === "#/home")) {
                link.classList.add("active");
            }
        });

        // Reset scroll position on route switch
        window.scrollTo(0, 0);

        // Re-draw visible canvas elements on target switch to prevent rendering width bugs
        if (targetPageId === "page-dashboard") {
            hydrateDashboard();
        } else if (targetPageId === "page-analytics") {
            renderDetailedContent();
        }
    };

    window.addEventListener("hashchange", handleRouting);
    window.addEventListener("load", handleRouting);

    // 3. Theme Toggle & State Persistence
    const initializeTheme = () => {
        const savedTheme = localStorage.getItem("theme") || "dark";
        document.documentElement.setAttribute("data-theme", savedTheme);
    };

    themeToggleBtn.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
    });

    initializeTheme();

    // 4. Live Clock (Syncs locally and ticks every second)
    const updateClock = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        });
        const timeStr = now.toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
        if (liveClockEl) {
            liveClockEl.textContent = `${dateStr} ${timeStr}`;
        }
    };
    setInterval(updateClock, 1000);
    updateClock();

    // 5. Data Fetch & Hydration sequence
    async function loadData() {
        try {
            const response = await fetch("data.json");
            if (!response.ok) throw new Error("Fetch failed.");
            marketData = await response.json();
            
            // Populate initial datasets
            hydrateDashboard();
            hydrateDetailedAnalysis();
            hydrateNewsFeed();
            
            // Run routing once data is hydrated
            handleRouting();
        } catch (e) {
            console.warn("Hydration failed, using embedded fallback details.", e);
            loadFallbackData();
        }
    }

    // 6. Dashboard Hydrator (Main cards + Overall Category Index Cards)
    function hydrateDashboard() {
        if (!dashboardGrid || !marketData) return;
        dashboardGrid.innerHTML = "";

        const categories = ["ram", "gpu", "cpu", "laptop"];
        
        categories.forEach(cat => {
            const catData = marketData[cat];
            const items = catData.items;
            const mainTrend = items[0].trend;
            
            const card = document.createElement("div");
            card.className = `dashboard-card card-trend-${mainTrend}`;
            
            let iconSvg = "";
            if (cat === "ram") {
                iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6" y2="6.01"></line><line x1="12" y1="6" x2="12" y2="6.01"></line><line x1="18" y1="6" x2="18" y2="6.01"></line><line x1="6" y1="18" x2="6" y2="18.01"></line><line x1="12" y1="18" x2="12" y2="18.01"></line><line x1="18" y1="18" x2="18" y2="18.01"></line></svg>`;
            } else if (cat === "gpu") {
                iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
            } else if (cat === "cpu") {
                iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="15" x2="23" y2="15"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="15" x2="4" y2="15"></line></svg>`;
            } else {
                iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="12" rx="2"></rect><path d="M2 20h20"></path><path d="M5 16h14"></path></svg>`;
            }

            const headerHtml = `
                <div class="card-header">
                    <div class="card-category">
                        <div class="card-category-icon">${iconSvg}</div>
                        <div class="card-category-info">
                            <h3>${catData.displayName}</h3>
                            <span>Predictive Index</span>
                        </div>
                    </div>
                </div>
            `;
            
            card.innerHTML = headerHtml;
            const itemsContainer = document.createElement("div");
            itemsContainer.className = "card-items-container";

            items.forEach(item => {
                const isUp = item.trend === "up";
                const trendArrow = isUp ? "↑" : "↓";
                const trendColorClass = isUp ? "trend-up" : "trend-down";
                const displayChange = (isUp ? "+" : "") + item.change + "%";

                const sparklinePoints = item.history.slice(-7);
                const sparklinePath = generateSparklinePath(sparklinePoints, 100, 25);

                const itemRow = document.createElement("div");
                itemRow.className = "card-item-row";
                itemRow.style.cursor = "pointer";
                
                // Clicking item row takes you directly to Analytics view
                itemRow.addEventListener("click", () => {
                    currentCategory = cat;
                    document.querySelectorAll(".tab-btn").forEach(btn => {
                        btn.classList.toggle("active", btn.dataset.category === cat);
                    });
                    window.location.hash = "#/analytics";
                    // Need small timeout to let SPA switch routing display active DOM
                    setTimeout(() => {
                        updateSelectors(item.id);
                    }, 50);
                });

                itemRow.innerHTML = `
                    <div class="item-row-header">
                        <span class="item-name" title="${item.name}">${item.name}</span>
                        <span class="item-price">$${item.price.toFixed(2)}</span>
                    </div>
                    <div class="item-row-body ${trendColorClass}">
                        <div class="item-trend-badge ${trendColorClass}">
                            <span class="trend-icon">${trendArrow}</span>
                            <span class="trend-val">${displayChange}</span>
                        </div>
                        <div class="item-sparkline">
                            <svg class="sparkline-svg" viewBox="0 0 100 25">
                                <path class="sparkline-path" d="${sparklinePath}"></path>
                            </svg>
                        </div>
                        <div class="item-confidence">
                            <div class="conf-progress-wrap">
                                <svg class="circular-progress" viewBox="0 0 20 20">
                                    <circle class="bg-circle" cx="10" cy="10" r="8"></circle>
                                    <circle class="fg-circle" cx="10" cy="10" r="8" 
                                            stroke-dasharray="50.26" 
                                            stroke-dashoffset="${50.26 - (50.26 * item.confidence) / 100}">
                                    </circle>
                                </svg>
                                <span class="conf-text">${item.confidence}% <span class="conf-label">conf</span></span>
                            </div>
                        </div>
                    </div>
                `;
                itemsContainer.appendChild(itemRow);
            });

            card.appendChild(itemsContainer);
            dashboardGrid.appendChild(card);
        });

        // Hydrate Category Price Index Charts (Aggregate valuations)
        hydrateCategoryIndexes();
    }

    // 7. Category price action index logic
    function hydrateCategoryIndexes() {
        const categories = ["ram", "gpu", "cpu", "laptop"];
        categories.forEach(cat => {
            const catData = marketData[cat];
            const items = catData.items;
            const historyLength = items[0].history.length;

            // Generate overall price index history (average price of all items per day)
            const indexHistory = [];
            for (let day = 0; day < historyLength; day++) {
                let sum = 0;
                items.forEach(item => {
                    sum += item.history[day];
                });
                indexHistory.push(parseFloat((sum / items.length).toFixed(2)));
            }

            const currentVal = indexHistory[indexHistory.length - 1];
            const val7dAgo = indexHistory[indexHistory.length - 7];
            const changePct = ((currentVal - val7dAgo) / val7dAgo) * 100;
            const isUp = changePct >= 0;

            // Hydrate HTML fields
            const valEl = document.getElementById(`${cat}-index-val`);
            const changeEl = document.getElementById(`${cat}-index-change`);
            const chartWrapper = document.getElementById(`${cat}-index-chart`);

            if (valEl) valEl.textContent = `$${currentVal.toFixed(2)}`;
            if (changeEl) {
                changeEl.textContent = `${isUp ? "↑" : "↓"} ${isUp ? "+" : ""}${changePct.toFixed(1)}%`;
                changeEl.className = `index-change ${isUp ? 'up' : 'down'}`;
            }

            // Draw index mini-chart
            if (chartWrapper) {
                chartWrapper.innerHTML = "";
                drawMiniIndexChart(chartWrapper, indexHistory, isUp ? "up" : "down");
            }
        });
    }

    function drawMiniIndexChart(container, history, trend) {
        const viewWidth = 300;
        const viewHeight = 110;
        const padding = { top: 10, right: 10, bottom: 10, left: 10 };
        const w = viewWidth - padding.left - padding.right;
        const h = viewHeight - padding.top - padding.bottom;

        const min = Math.min(...history);
        const max = Math.max(...history);
        const range = max - min || 1;

        const scaleX = idx => padding.left + (idx / (history.length - 1)) * w;
        const scaleY = val => viewHeight - padding.bottom - ((val - min) / range) * h;

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", `0 0 ${viewWidth} ${viewHeight}`);
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.style.overflow = "visible";

        const points = history.map((val, idx) => `${scaleX(idx).toFixed(1)},${scaleY(val).toFixed(1)}`).join(" ");
        
        // Linear Gradient Area
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const gradId = `grad-${container.id}`;
        const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        gradient.setAttribute("id", gradId);
        gradient.setAttribute("x1", "0");
        gradient.setAttribute("y1", "0");
        gradient.setAttribute("x2", "0");
        gradient.setAttribute("y2", "1");
        
        const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop1.setAttribute("offset", "0%");
        stop1.setAttribute("stop-color", trend === "up" ? "var(--accent-green)" : "var(--accent-red)");
        stop1.setAttribute("stop-opacity", "0.15");

        const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop2.setAttribute("offset", "100%");
        stop2.setAttribute("stop-color", trend === "up" ? "var(--accent-green)" : "var(--accent-red)");
        stop2.setAttribute("stop-opacity", "0.0");

        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);
        svg.appendChild(defs);

        // Fill area
        const areaPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const areaPoints = `M ${padding.left},${viewHeight - padding.bottom} L ${points} L ${viewWidth - padding.right},${viewHeight - padding.bottom} Z`;
        areaPath.setAttribute("d", areaPoints);
        areaPath.setAttribute("fill", `url(#${gradId})`);
        svg.appendChild(areaPath);

        // Trend line
        const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        polyline.setAttribute("points", points);
        polyline.setAttribute("fill", "none");
        polyline.setAttribute("stroke", trend === "up" ? "var(--accent-green)" : "var(--accent-red)");
        polyline.setAttribute("stroke-width", "2");
        polyline.setAttribute("stroke-linecap", "round");
        polyline.setAttribute("stroke-linejoin", "round");
        polyline.style.filter = `drop-shadow(0 2px 4px ${trend === 'up' ? 'var(--accent-green-glow)' : 'var(--accent-red-glow)'})`;
        svg.appendChild(polyline);

        container.appendChild(svg);
    }

    // Mathematical Sparkline coordinate path generator
    function generateSparklinePath(points, width, height) {
        if (points.length < 2) return "";
        const min = Math.min(...points);
        const max = Math.max(...points);
        const range = max - min || 1;
        const padding = 2;
        const useHeight = height - padding * 2;
        
        return points.map((p, i) => {
            const x = (i / (points.length - 1)) * width;
            const y = height - padding - ((p - min) / range) * useHeight;
            return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
        }).join(" ");
    }

    // 8. Detailed Analysis Setup
    function hydrateDetailedAnalysis() {
        if (!categoryTabs || !marketData) return;

        categoryTabs.querySelectorAll(".tab-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                categoryTabs.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
                e.currentTarget.classList.add("active");
                currentCategory = e.currentTarget.dataset.category;
                updateSelectors();
            });
        });

        updateSelectors();
    }

    // Update hardware model options based on active tab
    function updateSelectors(selectItemId = null) {
        if (!marketData) return;
        
        const catData = marketData[currentCategory];
        itemSelect.innerHTML = "";
        
        catData.items.forEach(item => {
            const opt = document.createElement("option");
            opt.value = item.id;
            opt.textContent = item.name;
            itemSelect.appendChild(opt);
        });

        if (selectItemId) {
            itemSelect.value = selectItemId;
        }

        currentItem = catData.items.find(i => i.id === itemSelect.value) || catData.items[0];
        
        itemSelect.onchange = (e) => {
            currentItem = catData.items.find(i => i.id === e.target.value);
            renderDetailedContent();
        };

        renderDetailedContent();
    }

    // Hydrates the chart and specific item-level news components
    function renderDetailedContent() {
        if (!currentItem || !marketData) return;

        const catData = marketData[currentCategory];
        categoryOutlook.textContent = catData.outlook;
        
        // Hydrate Specific Item News
        hydrateItemLevelNews(currentItem.id, catData.news);
        
        chartItemTitle.textContent = currentItem.name;
        const isUp = currentItem.trend === "up";
        chartItemTrend.className = `trend-badge ${isUp ? 'up' : 'down'}`;
        chartItemTrend.textContent = `${isUp ? "↑" : "↓"} Predicted: ${isUp ? "+" : ""}${currentItem.change.toFixed(1)}%`;
        
        const chartItemConfidence = document.getElementById("chart-item-confidence");
        if (chartItemConfidence) {
            chartItemConfidence.textContent = `${currentItem.confidence}% CONFIDENCE`;
        }

        // --- NEW EXPERT FEATURES ---
        // 1. Calculate and populate 30D price extremes metrics panel
        const history = currentItem.history;
        const minPrice = Math.min(...history);
        const maxPrice = Math.max(...history);
        const avgPrice = history.reduce((sum, val) => sum + val, 0) / history.length;
        
        const statsStrip = document.getElementById("chart-stats-strip");
        if (statsStrip) {
            statsStrip.innerHTML = `
                <div class="stat-strip-item">
                    <span class="stat-strip-label">30D Low Price</span>
                    <span class="stat-strip-value">$${minPrice.toFixed(2)}</span>
                </div>
                <div class="stat-strip-item">
                    <span class="stat-strip-label">30D High Price</span>
                    <span class="stat-strip-value">$${maxPrice.toFixed(2)}</span>
                </div>
                <div class="stat-strip-item">
                    <span class="stat-strip-label">30D Average</span>
                    <span class="stat-strip-value">$${avgPrice.toFixed(2)}</span>
                </div>
            `;
        }

        // 2. Calculate and populate Buy/Sell/Hold market recommendation engine
        let recType = "hold";
        let recLabel = "Hold";
        let recDesc = "";
        
        const change = currentItem.change;
        const conf = currentItem.confidence;
        
        if (isUp) {
            if (change > 2.0 && conf > 75) {
                recType = "strong-buy";
                recLabel = "Strong Buy";
                recDesc = `High confidence forecasting (${conf}% accuracy rating) coupled with strong upward pressure (+${change}%) indicates an optimal acquisition window before imminent retailer price spikes.`;
            } else {
                recType = "buy";
                recLabel = "Buy";
                recDesc = `Forecast models project positive price movement (+${change}%) over the next 7 days. Recommended entry point for immediate system upgrades.`;
            }
        } else {
            if (change < -2.0 && conf > 75) {
                recType = "strong-sell";
                recLabel = "Strong Sell";
                recDesc = `High probability of price correction (-${Math.abs(change)}%) ahead. Postpone acquisition or liquidate existing assets to minimize capital depreciation.`;
            } else {
                recType = "sell";
                recLabel = "Sell / Delay";
                recDesc = `Pricing structures are projected to settle downward (-${Math.abs(change)}%). We advise postponing purchases for 7 days to capitalize on cheaper retailer inventories.`;
            }
        }
        
        if (conf < 60) {
            recType = "hold";
            recLabel = "Hold";
            recDesc = `Confidence indicators are moderate (${conf}%). Price fluctuations are anticipated to remain range-bound. Monitor market intelligence boards for upcoming volatility triggers.`;
        }
        
        const recContent = document.getElementById("recommendation-content");
        if (recContent) {
            recContent.innerHTML = `
                <span class="rec-badge ${recType}">${recLabel}</span>
                <p class="rec-description">${recDesc}</p>
            `;
        }
        // ---------------------------
        
        renderHistoryChart(currentItem);
    }

    // Filters and displays news tagged to the specific hardware item (New Requirement)
    function hydrateItemLevelNews(itemId, fallbackCategoryNews) {
        if (!categoryNewsList || !marketData) return;
        categoryNewsList.innerHTML = "";
        
        // Filter global news for items that explicitly list this itemId
        const matchedNews = marketData.globalNews.filter(n => n.affectedItems && n.affectedItems.includes(itemId));
        
        // Fall back to category-level news if no item specific news exists
        const newsSourceList = matchedNews.length > 0 ? matchedNews : fallbackCategoryNews;

        if (newsSourceList.length === 0) {
            categoryNewsList.innerHTML = `<p class="outlook-text">No articles matched for this component.</p>`;
            return;
        }

        newsSourceList.forEach(news => {
            const article = document.createElement("div");
            article.className = "mini-news-item";
            article.innerHTML = `
                <div class="mini-news-header">
                    <span class="mini-news-source">${news.source}</span>
                    <span class="trend-badge ${news.impact === 'bullish' ? 'up' : news.impact === 'bearish' ? 'down' : ''}" style="font-size: 9px; padding: 2px 6px;">
                        ${news.impact}
                    </span>
                </div>
                <a href="${news.url}" target="_blank" rel="noopener noreferrer" class="mini-news-headline">${news.headline}</a>
            `;
            categoryNewsList.appendChild(article);
        });
    }

    // SVG elements creator helper
    function createSVGElement(tag, attrs = {}) {
        const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
        for (const [key, val] of Object.entries(attrs)) {
            el.setAttribute(key, val);
        }
        return el;
    }

    // Interactive Price History Chart Renderer (30-day Line Chart)
    function renderHistoryChart(item) {
        if (!chartWrapper) return;
        chartWrapper.innerHTML = ""; 

        const history = item.history;
        const totalPoints = history.length;
        const viewWidth = 600;
        const viewHeight = 300;
        
        const padding = { top: 30, right: 30, bottom: 40, left: 60 };
        const chartWidth = viewWidth - padding.left - padding.right;
        const chartHeight = viewHeight - padding.top - padding.bottom;

        const minVal = Math.min(...history);
        const maxVal = Math.max(...history);
        const range = maxVal - minVal || 1;
        
        // 5% margins
        const paddingMultiplier = 0.05;
        const paddedMin = Math.max(0, minVal - range * paddingMultiplier);
        const paddedMax = maxVal + range * paddingMultiplier;
        const paddedRange = paddedMax - paddedMin;

        const scaleX = idx => padding.left + (idx / (totalPoints - 1)) * chartWidth;
        const scaleY = val => viewHeight - padding.bottom - ((val - paddedMin) / paddedRange) * chartHeight;

        const svg = createSVGElement("svg", {
            class: "main-chart-svg",
            viewBox: `0 0 ${viewWidth} ${viewHeight}`,
            width: "100%",
            height: "100%"
        });

        const defs = createSVGElement("defs");
        const isUp = item.trend === "up";
        const themeColor = isUp ? "var(--accent-green)" : "var(--accent-red)";

        const areaGradient = createSVGElement("linearGradient", {
            id: "chartAreaGrad",
            x1: "0", y1: "0", x2: "0", y2: "1"
        });
        areaGradient.appendChild(createSVGElement("stop", { offset: "0%", "stop-color": themeColor, "stop-opacity": "0.15" }));
        areaGradient.appendChild(createSVGElement("stop", { offset: "100%", "stop-color": themeColor, "stop-opacity": "0.00" }));
        
        defs.appendChild(areaGradient);
        svg.appendChild(defs);

        // Horizontal Gridlines & Labels
        const gridLinesCount = 4;
        for (let i = 0; i <= gridLinesCount; i++) {
            const gridVal = paddedMin + (paddedRange / gridLinesCount) * i;
            const y = scaleY(gridVal);
            
            const line = createSVGElement("line", {
                class: "chart-grid-line",
                x1: padding.left, y1: y, x2: viewWidth - padding.right, y2: y
            });
            svg.appendChild(line);

            const text = createSVGElement("text", {
                class: "chart-axis-text",
                x: padding.left - 10, y: y + 4, "text-anchor": "end"
            });
            text.textContent = `$${gridVal.toFixed(2)}`;
            svg.appendChild(text);
        }

        // Vertical Gridlines
        const dateIntervals = 3;
        for (let i = 0; i <= dateIntervals; i++) {
            const index = Math.round(((totalPoints - 1) / dateIntervals) * i);
            const x = scaleX(index);

            const line = createSVGElement("line", {
                class: "chart-grid-line",
                x1: x, y1: padding.top, x2: x, y2: viewHeight - padding.bottom
            });
            svg.appendChild(line);

            const text = createSVGElement("text", {
                class: "chart-axis-text",
                x: x, y: viewHeight - padding.bottom + 20, "text-anchor": "middle"
            });
            
            let label = "";
            if (i === 0) label = "30d ago";
            else if (i === 1) label = "20d ago";
            else if (i === 2) label = "10d ago";
            else label = "Today";

            text.textContent = label;
            svg.appendChild(text);
        }

        const pointsCoords = history.map((val, idx) => ({ x: scaleX(idx), y: scaleY(val) }));
        const linePathStr = pointsCoords.map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(" ");
        const areaPathStr = `${linePathStr} L ${(viewWidth - padding.right).toFixed(1)} ${(viewHeight - padding.bottom).toFixed(1)} L ${padding.left} ${(viewHeight - padding.bottom).toFixed(1)} Z`;

        // Draw area path
        const areaPath = createSVGElement("path", {
            class: `chart-area chart-area-${item.trend}`,
            d: areaPathStr,
            fill: "url(#chartAreaGrad)"
        });
        svg.appendChild(areaPath);

        // Draw line path
        const mainLine = createSVGElement("path", {
            class: `chart-line chart-line-${item.trend}`,
            d: linePathStr
        });
        svg.appendChild(mainLine);

        // Hover trackers
        const trackerLine = createSVGElement("line", {
            class: "chart-hover-line",
            x1: "0", y1: padding.top, x2: "0", y2: viewHeight - padding.bottom
        });
        svg.appendChild(trackerLine);

        const trackerCircle = createSVGElement("circle", {
            class: `chart-hover-circle chart-hover-circle-${item.trend}`,
            cx: "0", cy: "0"
        });
        svg.appendChild(trackerCircle);

        chartWrapper.appendChild(svg);

        // Tooltip
        const tooltip = document.createElement("div");
        tooltip.className = "chart-tooltip";
        tooltip.innerHTML = `
            <span class="tooltip-date"></span>
            <span class="tooltip-price"></span>
        `;
        chartWrapper.appendChild(tooltip);

        const handleMouseMove = (e) => {
            const rect = svg.getBoundingClientRect();
            const scaleXFactor = viewWidth / rect.width;
            const mouseX = (e.clientX - rect.left) * scaleXFactor;
            
            if (mouseX < padding.left || mouseX > viewWidth - padding.right) {
                hideTooltip();
                return;
            }

            const relativeX = mouseX - padding.left;
            const stepWidth = chartWidth / (totalPoints - 1);
            const index = Math.round(relativeX / stepWidth);
            
            if (index >= 0 && index < totalPoints) {
                const targetPt = pointsCoords[index];
                const value = history[index];
                
                trackerLine.setAttribute("x1", targetPt.x);
                trackerLine.setAttribute("x2", targetPt.x);
                trackerLine.style.opacity = "1";

                trackerCircle.setAttribute("cx", targetPt.x);
                trackerCircle.setAttribute("cy", targetPt.y);
                trackerCircle.style.opacity = "1";

                const daysAgo = (totalPoints - 1) - index;
                const tooltipDateLabel = daysAgo === 0 ? "Today" : `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
                
                tooltip.querySelector(".tooltip-date").textContent = tooltipDateLabel;
                tooltip.querySelector(".tooltip-price").textContent = `$${value.toFixed(2)}`;

                const clientX = targetPt.x / scaleXFactor;
                const clientY = targetPt.y / scaleXFactor;

                tooltip.style.left = `${clientX + 10}px`;
                tooltip.style.top = `${clientY - 45}px`;
                tooltip.style.display = "flex";
            }
        };

        const hideTooltip = () => {
            trackerLine.style.opacity = "0";
            trackerCircle.style.opacity = "0";
            tooltip.style.display = "none";
        };

        svg.addEventListener("mousemove", handleMouseMove);
        svg.addEventListener("mouseleave", hideTooltip);
        svg.addEventListener("touchstart", (e) => {
            if (e.touches && e.touches[0]) handleMouseMove(e.touches[0]);
        }, { passive: true });
        svg.addEventListener("touchmove", (e) => {
            if (e.touches && e.touches[0]) handleMouseMove(e.touches[0]);
        }, { passive: true });
        svg.addEventListener("touchend", hideTooltip);
    }

    // 9. Full News Feed Renderer (Hydrates page views & generates affected component badges)
    function hydrateNewsFeed() {
        if (!newsFeedContainer || !marketData) return;
        newsFeedContainer.innerHTML = "";

        const globalNews = marketData.globalNews;
        
        globalNews.forEach(news => {
            const isBullish = news.impact === "bullish";
            const isBearish = news.impact === "bearish";
            const impactClass = isBullish ? "bullish" : isBearish ? "bearish" : "neutral";
            const impactEmoji = isBullish ? "🟢" : isBearish ? "🔴" : "⚪";
            
            const newsRow = document.createElement("div");
            newsRow.className = `news-row ${impactClass}`;

            // Create badges representing affected items (New Requirement)
            let affectedBadgesHtml = "";
            if (news.affectedItems && news.affectedItems.length > 0) {
                affectedBadgesHtml = `<div class="affected-items-container">`;
                news.affectedItems.forEach(itemId => {
                    // Try to find readable name from our dictionary
                    const name = getItemReadableName(itemId);
                    affectedBadgesHtml += `<span class="affected-item-badge" data-item="${itemId}">${name}</span>`;
                });
                affectedBadgesHtml += `</div>`;
            }
            
            newsRow.innerHTML = `
                <div class="news-content-wrap">
                    <div class="news-meta">
                        <span class="news-source">${news.source}</span>
                        <span>&bull;</span>
                        <span class="news-date">${formatDate(news.date)}</span>
                    </div>
                    <a href="${news.url}" target="_blank" rel="noopener noreferrer" class="news-headline">${news.headline}</a>
                    ${affectedBadgesHtml}
                </div>
                <div class="impact-badge ${impactClass}">
                    <span class="badge-dot"></span>
                    <span>${news.impact} ${impactEmoji}</span>
                </div>
            `;

            // Click listener for hardware badge tags to jump straight into active component analytics
            newsRow.querySelectorAll(".affected-item-badge").forEach(badge => {
                badge.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const targetId = e.currentTarget.dataset.item;
                    
                    // Match target category
                    let category = "gpu";
                    if (targetId.includes("ddr")) category = "ram";
                    else if (targetId.includes("7800x3d") || targetId.includes("14700k")) category = "cpu";
                    else if (targetId.includes("zephyrus") || targetId.includes("macbook") || targetId.includes("legion")) category = "laptop";

                    currentCategory = category;
                    document.querySelectorAll(".tab-btn").forEach(btn => {
                        btn.classList.toggle("active", btn.dataset.category === category);
                    });
                    
                    // Switch hash page
                    window.location.hash = "#/analytics";
                    setTimeout(() => {
                        updateSelectors(targetId);
                    }, 50);
                });
            });

            newsFeedContainer.appendChild(newsRow);
        });
    }

    // Match item raw keys to readable names
    function getItemReadableName(itemId) {
        if (!marketData) return itemId;
        const allItems = [...marketData.ram.items, ...marketData.gpu.items, ...marketData.cpu.items, ...marketData.laptop.items];
        const match = allItems.find(i => i.id === itemId);
        return match ? match.name.split(" (")[0] : itemId;
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric"
        });
    }

    loadData();
    initInteractiveParticles();

    // 10. Interactive Particle Widget (Futuristic Morphing Diagram with Candlestick Matrix)
    function initInteractiveParticles() {
        const canvas = document.getElementById("particle-canvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const activeLabel = document.getElementById("widget-active-label");
        
        const shapeTypes = ["cpu", "gpu", "ram", "storage", "laptop"];
        const shapeLabels = {
            "cpu": "CPU ACTIVE FORECAST",
            "gpu": "GPU ACTIVE FORECAST",
            "ram": "RAM ACTIVE FORECAST",
            "storage": "STORAGE ACTIVE FORECAST",
            "laptop": "LAPTOP ACTIVE FORECAST"
        };
        
        let activeShapeIndex = 0;
        const shapeCoordinates = {};
        let maxPoints = 0;

        // Draw shape offscreen and harvest white pixel coordinates
        function getShapeCoordinates(type) {
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = 120;
            tempCanvas.height = 120;
            const tempCtx = tempCanvas.getContext("2d");
            tempCtx.fillStyle = "#ffffff";
            tempCtx.strokeStyle = "#ffffff";
            tempCtx.lineWidth = 3.5;
            tempCtx.lineCap = "round";
            tempCtx.lineJoin = "round";

            if (type === "cpu") {
                tempCtx.strokeRect(38, 38, 44, 44);
                tempCtx.fillRect(50, 50, 20, 20);
                for (let i = 0; i < 4; i++) {
                    let offset = 44 + i * 10;
                    tempCtx.fillRect(offset, 28, 2, 7);
                    tempCtx.fillRect(offset, 85, 2, 7);
                    tempCtx.fillRect(28, offset, 7, 2);
                    tempCtx.fillRect(85, offset, 7, 2);
                }
            } else if (type === "gpu") {
                tempCtx.strokeRect(26, 44, 68, 32);
                tempCtx.beginPath();
                tempCtx.arc(46, 60, 10, 0, Math.PI * 2);
                tempCtx.arc(74, 60, 10, 0, Math.PI * 2);
                tempCtx.stroke();
                tempCtx.fillRect(20, 38, 3, 44);
                tempCtx.fillRect(34, 78, 52, 2);
            } else if (type === "ram") {
                tempCtx.strokeRect(18, 48, 84, 24);
                for (let i = 0; i < 4; i++) {
                    tempCtx.fillRect(28 + i * 16, 53, 11, 14);
                }
                tempCtx.fillRect(22, 74, 76, 2);
                tempCtx.fillRect(16, 58, 2, 4);
                tempCtx.fillRect(102, 58, 2, 4);
            } else if (type === "storage") {
                tempCtx.strokeRect(28, 40, 64, 40);
                tempCtx.beginPath();
                tempCtx.arc(60, 60, 15, 0, Math.PI * 2);
                tempCtx.stroke();
                tempCtx.beginPath();
                tempCtx.arc(60, 60, 3, 0, Math.PI * 2);
                tempCtx.fill();
                tempCtx.beginPath();
                tempCtx.moveTo(36, 46);
                tempCtx.lineTo(53, 56);
                tempCtx.stroke();
            } else if (type === "laptop") {
                tempCtx.strokeRect(34, 38, 52, 34);
                tempCtx.beginPath();
                tempCtx.moveTo(22, 74);
                tempCtx.lineTo(98, 74);
                tempCtx.lineTo(92, 82);
                tempCtx.lineTo(28, 82);
                tempCtx.closePath();
                tempCtx.stroke();
                tempCtx.fill();
            }

            const imgData = tempCtx.getImageData(0, 0, 120, 120).data;
            const points = [];
            for (let y = 0; y < 120; y += 2) {
                for (let x = 0; x < 120; x += 2) {
                    const idx = (y * 120 + x) * 4;
                    if (imgData[idx + 3] > 80) {
                        points.push({
                            x: x * 3.4 + 21,
                            y: y * 3.4 + 21
                        });
                    }
                }
            }
            return points;
        }

        // Cache coordinate maps
        shapeTypes.forEach(type => {
            const points = getShapeCoordinates(type);
            shapeCoordinates[type] = points;
            if (points.length > maxPoints) maxPoints = points.length;
        });

        // Background Candlestick/Percentage Float Element
        class MarketBackgroundElement {
            constructor(canvasWidth, canvasHeight) {
                this.canvasWidth = canvasWidth;
                this.canvasHeight = canvasHeight;
                this.reset(true);
            }
            reset(randomY = false) {
                const onLeft = Math.random() < 0.5;
                this.x = onLeft ? Math.random() * 95 + 15 : Math.random() * 95 + 325;
                this.y = randomY ? Math.random() * this.canvasHeight : this.canvasHeight + 20;
                this.vy = -(Math.random() * 0.35 + 0.15); // float upwards
                this.type = Math.random() < 0.4 ? "candle" : Math.random() < 0.75 ? "percent" : "currency";
                this.isGreen = Math.random() < 0.5;
                this.opacity = 0;
                this.maxOpacity = Math.random() * 0.22 + 0.12;
                this.fadeSpeed = 0.008 + Math.random() * 0.008;
                
                this.percentText = (this.isGreen ? "+" : "-") + (Math.random() * 4.5 + 0.5).toFixed(1) + "%";
                this.currencyText = Math.random() < 0.5 ? "$" : "%";
                
                this.candleWidth = Math.random() * 8 + 8;
                this.candleHeight = Math.random() * 25 + 15;
                this.wickHeight = this.candleHeight + Math.random() * 20 + 10;
                
                this.vx = 0;
            }
            update() {
                this.y += this.vy;
                this.x += this.vx;
                this.vx *= 0.9; // dampen click impulses
                
                if (this.y < 40) {
                    this.opacity -= this.fadeSpeed * 1.8;
                } else if (this.opacity < this.maxOpacity) {
                    this.opacity += this.fadeSpeed;
                }
                
                if (this.y < -30 || (this.opacity <= 0 && this.y < this.canvasHeight / 2)) {
                    this.reset();
                }
            }
            draw(ctx) {
                ctx.save();
                ctx.globalAlpha = Math.max(0, this.opacity);
                
                const isLightMode = document.documentElement.getAttribute("data-theme") === "light";
                const themeColor = this.isGreen 
                    ? (isLightMode ? "rgba(0, 168, 84, 0.75)" : "rgba(0, 255, 136, 0.75)") 
                    : (isLightMode ? "rgba(234, 32, 39, 0.75)" : "rgba(255, 71, 87, 0.75)");

                ctx.fillStyle = themeColor;
                ctx.strokeStyle = themeColor;
                
                if (this.type === "candle") {
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y - this.wickHeight / 2);
                    ctx.lineTo(this.x, this.y + this.wickHeight / 2);
                    ctx.stroke();
                    
                    ctx.fillRect(this.x - this.candleWidth / 2, this.y - this.candleHeight / 2, this.candleWidth, this.candleHeight);
                    
                    if (!this.isGreen && Math.random() < 0.5) {
                        ctx.fillStyle = isLightMode ? "#ffffff" : "#0a0a0f";
                        ctx.fillRect(this.x - this.candleWidth / 2 + 2, this.y - this.candleHeight / 2 + 2, this.candleWidth - 4, this.candleHeight - 4);
                    }
                } else if (this.type === "percent") {
                    ctx.font = "bold 13px monospace";
                    ctx.textAlign = "center";
                    ctx.fillText(this.percentText, this.x, this.y);
                } else {
                    ctx.font = "bold 16px monospace";
                    ctx.textAlign = "center";
                    ctx.fillText(this.currencyText, this.x, this.y);
                }
                ctx.restore();
            }
        }

        // Particle Class
        class Particle {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 4;
                this.vy = (Math.random() - 0.5) * 4;
                this.tx = x;
                this.ty = y;
                this.size = Math.random() * 1.5 + 1.2;
                
                // Color interpolation channels (starts at CPU Cyan: 0, 210, 255)
                this.r = 0;
                this.g = 210;
                this.b = 255;
                this.tr = 0;
                this.tg = 210;
                this.tb = 255;
                
                this.color = "rgba(0, 210, 255, 0.82)";
                this.friction = 0.85;
                this.ease = 0.08;
            }
            update(floatX, floatY, mouse) {
                let tx = this.tx + floatX;
                let ty = this.ty + floatY;
                
                let dx = tx - this.x;
                let dy = ty - this.y;
                
                this.vx += dx * this.ease;
                this.vy += dy * this.ease;
                
                if (mouse.x !== null && mouse.y !== null) {
                    let dxMouse = this.x - mouse.x;
                    let dyMouse = this.y - mouse.y;
                    let distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse) || 1;
                    if (distMouse < mouse.radius) {
                        let forceMouse = (mouse.radius - distMouse) / mouse.radius;
                        let angleMouse = Math.atan2(dyMouse, dxMouse);
                        this.vx += Math.cos(angleMouse) * forceMouse * 4.5;
                        this.vy += Math.sin(angleMouse) * forceMouse * 4.5;
                    }
                }
                
                this.vx *= this.friction;
                this.vy *= this.friction;
                
                this.x += this.vx;
                this.y += this.vy;
                
                // Smoothly blend color channels
                this.r += (this.tr - this.r) * 0.06;
                this.g += (this.tg - this.g) * 0.06;
                this.b += (this.tb - this.b) * 0.06;
                this.color = `rgba(${Math.round(this.r)}, ${Math.round(this.g)}, ${Math.round(this.b)}, 0.82)`;
            }
            draw(ctx) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
        }

        // Initialize particles & background elements
        const particles = [];
        const initialCoords = shapeCoordinates["cpu"];
        for (let i = 0; i < maxPoints; i++) {
            const pt = initialCoords[i % initialCoords.length];
            particles.push(new Particle(
                pt.x + (Math.random() - 0.5) * 40,
                pt.y + (Math.random() - 0.5) * 40
            ));
        }

        const backgroundElements = Array.from({ length: 20 }, () => new MarketBackgroundElement(450, 450));

        // Set targets with active color palette definitions
        const shapeColors = {
            "cpu": { r: 0, g: 210, b: 255 },     // Cyan
            "gpu": { r: 0, g: 255, b: 136 },     // Neon Green
            "ram": { r: 255, g: 0, b: 128 },     // Hot Pink
            "storage": { r: 255, g: 140, b: 0 }, // Orange
            "laptop": { r: 120, g: 80, b: 255 }  // Indigo
        };

        function setTargets(type) {
            const coords = shapeCoordinates[type];
            const color = shapeColors[type];
            particles.forEach((p, idx) => {
                const pt = coords[idx % coords.length];
                p.tx = pt.x;
                p.ty = pt.y;
                p.tr = color.r;
                p.tg = color.g;
                p.tb = color.b;
            });
            if (activeLabel) {
                activeLabel.textContent = shapeLabels[type];
                // Smoothly map label text colors and glow styles to current category
                activeLabel.style.color = `rgb(${color.r}, ${color.g}, ${color.b})`;
                activeLabel.style.borderColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.25)`;
                activeLabel.style.background = `rgba(${color.r}, ${color.g}, ${color.b}, 0.08)`;
                activeLabel.style.textShadow = `0 0 8px rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`;
                activeLabel.style.boxShadow = `0 0 10px rgba(${color.r}, ${color.g}, ${color.b}, 0.05)`;
            }
        }
        
        setTargets("cpu");

        const mouse = { x: null, y: null, radius: 65 };
        canvas.addEventListener("mousemove", (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        });
        canvas.addEventListener("mouseleave", () => {
            mouse.x = null;
            mouse.y = null;
        });

        // Clicking morphs + shockwave background
        canvas.addEventListener("click", (e) => {
            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            
            activeShapeIndex = (activeShapeIndex + 1) % shapeTypes.length;
            const nextShape = shapeTypes[activeShapeIndex];
            
            // Scatter particles
            particles.forEach(p => {
                const angle = Math.atan2(p.y - clickY, p.x - clickX);
                const dist = Math.sqrt((p.y - clickY) ** 2 + (p.x - clickX) ** 2) || 1;
                const force = (100 / dist) + Math.random() * 15 + 8;
                p.vx = Math.cos(angle) * force;
                p.vy = Math.sin(angle) * force;
            });

            // Shockwave background items
            backgroundElements.forEach(el => {
                const angle = Math.atan2(el.y - clickY, el.x - clickX);
                const dist = Math.sqrt((el.y - clickY) ** 2 + (el.x - clickX) ** 2) || 1;
                const force = (120 / dist) + Math.random() * 5 + 3;
                el.vx = Math.cos(angle) * force;
                el.vy += Math.sin(angle) * force - 1;
            });

            setTimeout(() => {
                setTargets(nextShape);
            }, 80);
        });

        let time = 0;
        function animate() {
            if (canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
                ctx.clearRect(0, 0, 450, 450);
                
                // 1. Draw and update background market indicators first
                backgroundElements.forEach(el => {
                    el.update();
                    el.draw(ctx);
                });
                
                // 2. Draw foreground morphing particles
                time += 0.035;
                const floatX = Math.sin(time * 0.8) * 5;
                const floatY = Math.cos(time * 1.2) * 6;
                
                particles.forEach(p => {
                    p.update(floatX, floatY, mouse);
                    p.draw(ctx);
                });
            }
            
            requestAnimationFrame(animate);
        }
        
        animate();
    }

    // Fallback Data Loader if Fetch fails (direct client viewing support)
    function loadFallbackData() {
        marketData = {
            "lastUpdated": "2026-07-20T12:00:00",
            "ram": {
                "displayName": "Memory (RAM)",
                "items": [
                    {
                        "id": "ddr4-16gb",
                        "name": "DDR4 16GB (2x8GB) 3200MHz",
                        "price": 45.99,
                        "change": 2.3,
                        "confidence": 65,
                        "trend": "up",
                        "history": [48.50, 48.00, 47.90, 47.50, 47.00, 47.20, 46.80, 46.50, 46.20, 46.00, 45.80, 45.50, 45.20, 45.00, 45.30, 45.10, 44.90, 44.80, 44.50, 44.20, 44.00, 44.30, 44.60, 44.80, 45.00, 45.20, 45.50, 45.70, 45.85, 45.99]
                    },
                    {
                        "id": "ddr5-32gb",
                        "name": "DDR5 32GB (2x16GB) 6000MHz",
                        "price": 98.50,
                        "change": -1.5,
                        "confidence": 72,
                        "trend": "down",
                        "history": [105.00, 104.50, 104.00, 103.80, 103.20, 102.90, 102.50, 102.00, 101.80, 101.50, 101.20, 101.00, 100.80, 100.50, 100.20, 99.90, 99.80, 99.50, 99.20, 99.00, 99.20, 99.00, 98.80, 98.70, 98.60, 98.80, 98.90, 98.70, 98.60, 98.50]
                    }
                ],
                "outlook": "Slight upward pressure on older DDR4 modules.",
                "news": []
            },
            "gpu": {
                "displayName": "Graphics Cards (GPU)",
                "items": [
                    {
                        "id": "rtx-4070",
                        "name": "NVIDIA GeForce RTX 4070 12GB",
                        "price": 549.99,
                        "change": 4.2,
                        "confidence": 85,
                        "trend": "up",
                        "history": [520.00, 521.50, 520.00, 522.00, 525.00, 524.50, 527.00, 528.00, 526.50, 530.00, 532.00, 531.00, 535.00, 536.50, 535.00, 538.00, 540.00, 539.00, 542.00, 544.50, 543.00, 545.00, 546.00, 545.50, 547.00, 548.50, 547.90, 549.00, 549.50, 549.99]
                    }
                ],
                "outlook": "Mid-range GPU prices remain sticky.",
                "news": []
            },
            "cpu": {
                "displayName": "Processors (CPU)",
                "items": [
                    {
                        "id": "ryzen-7800x3d",
                        "name": "AMD Ryzen 7 7800X3D 8-Core",
                        "price": 369.00,
                        "change": 6.5,
                        "confidence": 90,
                        "trend": "up",
                        "history": [345.00, 346.00, 345.50, 347.00, 348.00, 349.50, 350.00, 352.00, 351.50, 353.00, 355.00, 354.50, 356.00, 357.00, 356.50, 358.00, 360.00, 359.50, 361.00, 362.50, 362.00, 364.00, 365.00, 364.50, 366.00, 367.00, 366.50, 368.00, 368.50, 369.00]
                    }
                ],
                "outlook": "AMD's Ryzen 7 7800X3D remains top-selling.",
                "news": []
            },
            "laptop": {
                "displayName": "Laptops",
                "items": [
                    {
                        "id": "zephyrus-g14",
                        "name": "ASUS ROG Zephyrus G14 (2026)",
                        "price": 1499.00,
                        "change": 1.8,
                        "confidence": 70,
                        "trend": "up",
                        "history": [1460.00, 1455.00, 1465.00, 1470.00, 1468.00, 1472.00, 1475.00, 1470.00, 1474.00, 1478.00, 1480.00, 1476.00, 1482.00, 1485.00, 1483.00, 1488.00, 1490.00, 1489.00, 1492.00, 1495.00, 1493.00, 1495.00, 1496.00, 1495.50, 1497.00, 1498.50, 1497.90, 1499.00, 1499.50, 1499.00]
                    }
                ],
                "outlook": "Laptop prices face mixed movements.",
                "news": []
            },
            "globalNews": []
        };
        hydrateDashboard();
        hydrateDetailedAnalysis();
        hydrateNewsFeed();
        handleRouting();
    }
});
