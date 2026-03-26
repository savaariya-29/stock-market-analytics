const API_URL = 'http://localhost:5000/api/stock';

// Chart instances
let priceChart = null;
let volumeChart = null;
let rsiChart = null;

// Global data store
let currentData = null;

// DOM Elements
const symbolInput = document.getElementById('symbol-input');
const periodInput = document.getElementById('period-input');
const searchBtn = document.getElementById('search-btn');

// Toggles
const toggleMa50 = document.getElementById('toggle-ma50');
const toggleMa200 = document.getElementById('toggle-ma200');
const toggleEma20 = document.getElementById('toggle-ema20');

// Overview Elements
const currentPriceEl = document.getElementById('current-price');
const dailyChangeEl = document.getElementById('daily-change');
const currentRsiEl = document.getElementById('current-rsi');
const signalEl = document.getElementById('signal');
const stockNameEl = document.getElementById('stock-name');

const loader = document.getElementById('loader');
const content = document.getElementById('content');
const errorBanner = document.getElementById('error-banner');
const errorMessage = document.getElementById('error-message');

// Chart.js Default configuration
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = 'Outfit';

// Formatters
// Formatters
function formatCurrency(value, currencyCode = 'USD') {
    try {
        let code = currencyCode.toUpperCase();
        // yfinance sometimes returns GBp for pence sterling
        if (code === 'GBP' && currencyCode === 'GBp') {
            value = value / 100;
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: code
        }).format(value);
    } catch (e) {
        // Fallback for non-standard currency codes
        return currencyCode + ' ' + Number(value).toFixed(2);
    }
}

async function fetchStockData(symbol, period) {
    try {
        // UI Loading State
        errorBanner.classList.add('hidden');
        searchBtn.textContent = 'Analyzing...';
        searchBtn.disabled = true;
        loader.classList.remove('hidden');
        content.style.opacity = '0.5';
        content.style.pointerEvents = 'none';

        const response = await fetch(`${API_URL}?symbol=${encodeURIComponent(symbol)}&period=${period}`);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to fetch data');
        }

        currentData = await response.json();

        // Update Title dynamically
        const shortName = currentData.info.shortName || symbol;
        stockNameEl.textContent = `${shortName} (${symbol})`;

        updateUI();
    } catch (error) {
        errorMessage.textContent = error.message;
        errorBanner.classList.remove('hidden');
    } finally {
        // Reset UI State
        searchBtn.textContent = 'Analyze';
        searchBtn.disabled = false;
        loader.classList.add('hidden');
        content.style.opacity = '1';
        content.style.pointerEvents = 'auto';
    }
}

function updateUI() {
    if (!currentData || currentData.prices.length === 0) return;

    const prices = currentData.prices;
    const rsiArr = currentData.rsi;
    const ma50Arr = currentData.ma50;

    // Overview metrics
    const currPrice = currentData.info.currentPrice || prices[prices.length - 1];
    const prevClose = currentData.info.previousClose || prices[prices.length - 2];
    const currency = currentData.info.currency || 'USD';

    const change = currPrice - prevClose;
    const changePercent = (change / prevClose) * 100;

    currentPriceEl.textContent = formatCurrency(currPrice, currency);

    dailyChangeEl.textContent = `${change > 0 ? '+' : ''}${formatCurrency(change, currency)} (${changePercent.toFixed(2)}%)`;
    dailyChangeEl.className = `value ${change >= 0 ? 'positive' : 'negative'}`;

    const lastRsi = rsiArr[rsiArr.length - 1];
    if (lastRsi) {
        currentRsiEl.textContent = lastRsi.toFixed(2);
        if (lastRsi > 70) currentRsiEl.className = 'value negative';
        else if (lastRsi < 30) currentRsiEl.className = 'value positive';
        else currentRsiEl.className = 'value';
    } else {
        currentRsiEl.textContent = '--';
    }

    // Determine Trading Signal
    let signal = 'NEUTRAL';
    let signalClass = 'value neutral';

    const lastMa50 = ma50Arr[ma50Arr.length - 1];

    if (lastRsi && lastMa50) {
        if (lastRsi < 30 && currPrice > lastMa50) {
            signal = 'STRONG BUY';
            signalClass = 'value positive';
        } else if (lastRsi > 70 && currPrice < lastMa50) {
            signal = 'STRONG SELL';
            signalClass = 'value negative';
        } else if (lastRsi < 30) {
            signal = 'BUY (Oversold)';
            signalClass = 'value positive';
        } else if (lastRsi > 70) {
            signal = 'SELL (Overbought)';
            signalClass = 'value negative';
        } else if (currPrice > lastMa50) {
            signal = 'BULLISH';
            signalClass = 'value positive';
        } else {
            signal = 'BEARISH';
            signalClass = 'value negative';
        }
    }

    signalEl.textContent = signal;
    signalEl.className = signalClass;

    updateCharts();
}

function updateCharts() {
    const dates = currentData.dates;

    renderPriceChart(dates);
    renderVolumeChart(dates);
    renderRsiChart(dates);
}

function renderPriceChart(dates) {
    const ctx = document.getElementById('priceChart').getContext('2d');

    if (priceChart) priceChart.destroy();

    // Create gradient for price line
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    const datasets = [
        {
            label: 'Price',
            data: currentData.prices,
            borderColor: '#60a5fa',
            backgroundColor: gradient,
            borderWidth: 2,
            pointRadius: 0,
            pointHitRadius: 10,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#60a5fa',
            pointHoverBorderWidth: 2,
            fill: true,
            tension: 0.1
        }
    ];

    if (toggleMa50.checked) {
        datasets.push({
            label: 'MA (50)',
            data: currentData.ma50,
            borderColor: '#fbbf24',
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.1,
            borderDash: [5, 5]
        });
    }

    if (toggleMa200.checked) {
        datasets.push({
            label: 'MA (200)',
            data: currentData.ma200,
            borderColor: '#f43f5e',
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.1,
            borderDash: [5, 5]
        });
    }

    if (toggleEma20.checked) {
        datasets.push({
            label: 'EMA (20)',
            data: currentData.ema20,
            borderColor: '#34d399',
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.1
        });
    }

    priceChart = new Chart(ctx, {
        type: 'line',
        data: { labels: dates, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 6,
                    usePointStyle: true
                },
                legend: {
                    labels: { color: '#e2e8f0', usePointStyle: true, boxWidth: 8 }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                    ticks: { maxTicksLimit: 8, color: '#94a3b8' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                    position: 'right',
                    ticks: {
                        color: '#94a3b8',
                        callback: function (value) {
                            const cur = currentData.info.currency || 'USD';
                            try {
                                return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur.toUpperCase(), maximumFractionDigits: 0 }).format(value);
                            } catch (e) {
                                return value;
                            }
                        }
                    }
                }
            }
        }
    });
}

function renderVolumeChart(dates) {
    const ctx = document.getElementById('volumeChart').getContext('2d');

    if (volumeChart) volumeChart.destroy();

    const backgroundColors = currentData.volumes.map((_, i) => {
        if (i === 0) return 'rgba(59, 130, 246, 0.7)';
        return currentData.prices[i] >= currentData.prices[i - 1] ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)';
    });

    volumeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [{
                label: 'Volume',
                data: currentData.volumes,
                backgroundColor: backgroundColors,
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { maxTicksLimit: 6, color: '#94a3b8' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                    position: 'right',
                    ticks: { notation: 'compact', color: '#94a3b8' }
                }
            }
        }
    });
}

function renderRsiChart(dates) {
    const ctx = document.getElementById('rsiChart').getContext('2d');

    if (rsiChart) rsiChart.destroy();

    rsiChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'RSI (14)',
                data: currentData.rsi,
                borderColor: '#c084fc',
                backgroundColor: 'rgba(192, 132, 252, 0.1)',
                borderWidth: 1.5,
                pointRadius: 0,
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                },
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { maxTicksLimit: 6, color: '#94a3b8' }
                },
                y: {
                    min: 0, max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                    position: 'right',
                    ticks: { stepSize: 30, color: '#94a3b8' }
                }
            }
        },
        plugins: [{
            id: 'rsiLines',
            beforeDraw: (chart) => {
                const { ctx, chartArea: { top, bottom, left, right }, scales: { y } } = chart;
                ctx.save();

                // Draw 70 line (Overbought)
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.moveTo(left, y.getPixelForValue(70));
                ctx.lineTo(right, y.getPixelForValue(70));
                ctx.stroke();

                // Draw 30 line (Oversold)
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
                ctx.moveTo(left, y.getPixelForValue(30));
                ctx.lineTo(right, y.getPixelForValue(30));
                ctx.stroke();

                ctx.restore();
            }
        }]
    });
}

const autocompleteResults = document.getElementById('autocomplete-results');
let debounceTimer;

symbolInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();

    if (query.length < 1) {
        autocompleteResults.classList.add('hidden');
        return;
    }

    debounceTimer = setTimeout(async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/search?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                renderAutocomplete(data);
            }
        } catch (err) {
            console.error('Search autocomplete failed', err);
        }
    }, 300); // 300ms debounce
});

function renderAutocomplete(results) {
    autocompleteResults.innerHTML = '';

    if (results.length === 0) {
        autocompleteResults.classList.add('hidden');
        return;
    }

    results.forEach(item => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.innerHTML = `
            <span class="ac-symbol">${item.symbol}</span>
            <span class="ac-name">${item.name} &bull; ${item.exchange}</span>
        `;
        div.addEventListener('click', () => {
            symbolInput.value = item.symbol;
            autocompleteResults.classList.add('hidden');
            // Auto click analyze
            fetchStockData(item.symbol, periodInput.value);
        });
        autocompleteResults.appendChild(div);
    });

    autocompleteResults.classList.remove('hidden');
}

// Hide dropdown if clicked outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar')) {
        autocompleteResults.classList.add('hidden');
    }
});

// Event Listeners
searchBtn.addEventListener('click', () => {
    const symbol = symbolInput.value.trim().toUpperCase();
    if (symbol) {
        fetchStockData(symbol, periodInput.value);
    }
});

symbolInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const symbol = symbolInput.value.trim().toUpperCase();
        if (symbol) {
            fetchStockData(symbol, periodInput.value);
        }
    }
});

periodInput.addEventListener('change', () => {
    const symbol = symbolInput.value.trim().toUpperCase();
    if (symbol) {
        fetchStockData(symbol, periodInput.value);
    }
});

[toggleMa50, toggleMa200, toggleEma20].forEach(toggle => {
    toggle.addEventListener('change', () => {
        if (currentData) updateCharts();
    });
});

// Initial load
fetchStockData('AAPL', '1y');
