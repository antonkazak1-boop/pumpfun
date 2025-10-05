// === THEME MANAGEMENT ===
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.querySelector('.theme-toggle i');
    
    if (!themeIcon) {
        console.error('Theme toggle icon not found');
        return;
    }
    
    if (body.classList.contains('theme-light')) {
        // Switch to dark theme
        body.classList.remove('theme-light');
        themeIcon.className = 'fas fa-moon';
        localStorage.setItem('theme', 'dark');
        console.log('Switched to dark theme');
    } else {
        // Switch to light theme
        body.classList.add('theme-light');
        themeIcon.className = 'fas fa-sun';
        localStorage.setItem('theme', 'light');
        console.log('Switched to light theme');
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    
    if (savedTheme === 'light' || (!savedTheme && prefersLight)) {
        document.body.classList.add('theme-light');
        const themeToggleIcon = document.querySelector('.theme-toggle i');
        if (themeToggleIcon) {
            themeToggleIcon.className = 'fas fa-sun';
        }
    } else {
        document.body.classList.remove('theme-light');
        const themeToggleIcon = document.querySelector('.theme-toggle i');
        if (themeToggleIcon) {
            themeToggleIcon.className = 'fas fa-moon';
        }
    }
}

// Configuration
const BACKEND_URL = window.location.origin; // Use the same domain as Mini App
const REFRESH_INTERVAL = 30000; // 30 seconds
const API_TIMEOUT = 10000; // 10 seconds

// Global variables
let currentTab = 'about';
let refreshTimer = null;
let isLoading = false;

// Tab to API endpoint mapping
const TAB_API_MAP = {
    'about': null, // Special tab without API
    'analytics': null, // Analytics tab without API
    'portfolio': 'traders/list', // Portfolio tab API endpoint  
    'clusterBuy': 'clusterbuy',
    'whaleMoves': 'whalemoves', 
    'volumeSurge': 'volumesurge',
    'coBuy': 'cobuy',
    'smartMoney': 'smartmoney',
    'freshTokens': 'freshtokens',
    'topGainers': 'topgainers',
    'coins': 'coins/market', // Coins tab API endpoint
    'recentActivity': 'recentactivity', // Recent Activity tab API endpoint
    'trendingMeta': 'pump/trending-meta' // Trending Meta Words tab API endpoint
};

// Rendering functions mapping
const TAB_RENDER_MAP = {
    'about': null, // Special tab without rendering
    'analytics': null, // Analytics tab without rendering
    'portfolio': renderPortfolio, // Portfolio tab rendering function
    'clusterBuy': renderClusterBuy,
    'whaleMoves': renderWhaleMoves,
    'volumeSurge': renderVolumeSurge,
    'coBuy': renderCoBuy,
    'smartMoney': renderSmartMoney,
    'freshTokens': renderFreshTokens,
    'topGainers': renderTopGainers,
    'coins': renderCoins, // Coins tab rendering function
    'recentActivity': renderRecentActivity, // Recent Activity tab rendering function
    'trendingMeta': renderTrendingMeta // Trending Meta Words tab rendering function
};

// Инициализация Telegram Web App
function initTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        
        // Theme setup
        if (tg.themeParams) {
            document.body.classList.add('telegram-theme');
        }
        
        // Ready and expand to full screen
        tg.ready();
        tg.expand();
        
        // Main button setup (optional)
        tg.MainButton.hide();
        
        // Back button setup (optional)
        tg.BackButton.hide();
        
        console.log('Telegram Web App initialized');
        console.log('User ID:', tg.initDataUnsafe?.user?.id);
        console.log('Theme params:', tg.themeParams);
        
        return tg;
    }
    console.log('Telegram Web App not available (development outside Telegram)');
    return null;
}

// HTTP requests with timeout
async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// Fetch data from API
async function fetchData(endpoint) {
    try {
        const response = await fetchWithTimeout(`${BACKEND_URL}/api/${endpoint}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            updateApiStatus(true);
            return data.data || [];
        } else {
            throw new Error(data.message || 'API error');
        }
    } catch (error) {
        console.error(`Error fetching data from ${endpoint}:`, error);
        updateApiStatus(false);
        
        if (error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        
        throw error;
    }
}

// Update API status
function updateApiStatus(isOnline) {
    const statusElement = document.getElementById('apiStatus');
    if (statusElement) {
        statusElement.textContent = isOnline ? 'online' : 'offline';
        statusElement.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
    }
}

// Update last update time
function updateLastUpdateTime() {
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement) {
        const now = new Date();
        lastUpdateElement.textContent = now.toLocaleTimeString('ru-RU');
    }
}

// Show loading screen
function showLoading() {
    isLoading = true;
    const refreshIcon = document.getElementById('refresh-icon');
    if (refreshIcon) {
        refreshIcon.parentElement.classList.add('spinning');
    }
}

// Скрытие экрана загрузки
function hideLoading() {
    isLoading = false;
    const loadingOverlay = document.getElementById('loading');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
    
    const refreshIcon = document.getElementById('refresh-icon');
    if (refreshIcon) {
        refreshIcon.parentElement.classList.remove('spinning');
    }
}

// Утилита для форматирования чисел
function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined) return '0';
    const number = parseFloat(num);
    if (isNaN(number)) return '0';
    
    if (number >= 1000000) {
        return (number / 1000000).toFixed(1) + 'M';
    } else if (number >= 1000) {
        return (number / 1000).toFixed(1) + 'K';
    } else {
        return number.toFixed(decimals);
    }
}

// Утилита для форматирования времени
function formatTime(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Утилита для сокращения адресов кошельков и токенов
function shortenAddress(address, startChars = 6, endChars = 4) {
    if (!address) return '';
    if (address.length <= startChars + endChars) return address;
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

// Рендеринг Cluster Buy данных
function renderClusterBuy(data) {
    const container = document.getElementById('clusterBuyData');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-fire"></i>
                <h3>No Cluster Buy Activity</h3>
                <p>No tokens with 3+ unique buyers detected in the last 10 minutes</p>
            </div>`;
        return;
    }
    
    container.innerHTML = data.map((item, index) => {
        const pumpUrl = `https://pump.fun/coin/${item.token_mint}`;
        const dexUrl = `https://dexscreener.com/solana/${item.token_mint}`;
        const avgBuy = item.total_sol && item.buyers ? (parseFloat(item.total_sol) / parseFloat(item.buyers)).toFixed(2) : '0';
        
        return `
            <div class="data-item">
                <div class="data-header">
                    <div class="data-title">
                        <div class="icon fire-icon">
                            <i class="fas fa-fire"></i>
                        </div>
                        <div>
                            <h3>${item.symbol || 'UNKNOWN'} - ${item.name || 'Unknown Token'}</h3>
                            <div class="token-address">${shortenAddress(item.token_mint)}</div>
                        </div>
                    </div>
                    <div class="rank-badge">#${index + 1}</div>
                </div>
                <div class="item-stats">
                    <div class="stat-item">
                        <div class="stat-label">Unique Buyers</div>
                        <div class="stat-value positive">${item.buyers || 0}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Total Volume</div>
                        <div class="stat-value neutral">${formatNumber(item.total_sol)} SOL</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Average Buy</div>
                        <div class="stat-value">${avgBuy} SOL</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Activity</div>
                        <div class="stat-value positive">🔥 ${item.buyers >= 5 ? 'High' : 'Growing'}</div>
                    </div>
                </div>
                <div class="item-actions">
                    <a href="${pumpUrl}" target="_blank" class="action-button primary">
                        <i class="fas fa-external-link-alt"></i>
                        Pump.fun
                    </a>
                    <a href="${dexUrl}" target="_blank" class="action-button secondary">
                        <i class="fas fa-chart-line"></i>
                        DexScreener
                    </a>
                    <button class="action-button secondary" onclick="showTokenDetails('${item.token_mint}')">
                        <i class="fas fa-info-circle"></i>
                        Details
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Рендеринг Whale Moves данных
function renderWhaleMoves(data) {
    const container = document.getElementById('whaleMovesData');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-whale"></i>
                <h3>No Whale Activity</h3>
                <p>No purchases over 100 SOL detected in the last 30 minutes</p>
            </div>`;
        return;
    }
    
    container.innerHTML = data.map((item, index) => {
        const pumpUrl = `https://pump.fun/coin/${item.token_mint}`;
        const txUrl = `https://solscan.io/tx/${item.tx_signature}`;
        const walletUrl = `https://solscan.io/account/${item.wallet}`;
        
        // Получаем данные о трейдере
        const traderName = item.wallet_name || undefined;
        const telegramLink = item.wallet_telegram;
        const twitterLink = item.wallet_twitter;
        
        return `
            <div class="data-item whale-item">
                <h3>
                    <i class="fas fa-whale"></i>
                    ${index + 1}. ${traderName ? traderName : 'Whale Purchase'}
                    ${telegramLink ? `<a href="${telegramLink}" target="_blank" class="social-link telegram"><i class="fab fa-telegram"></i></a>` : ''}
                    ${twitterLink ? `<a href="${twitterLink}" target="_blank" class="social-link twitter"><i class="fab fa-twitter"></i></a>` : ''}
                </h3>
                <div class="item-stats">
                    <div class="stat-item">
                        <div class="stat-label">Wallet</div>
                        <div class="stat-value">${shortenAddress(item.wallet)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Token</div>
                        <div class="stat-value">${shortenAddress(item.token_mint)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">SOL Spent</div>
                        <div class="stat-value positive">${formatNumber(item.sol_spent)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Time</div>
                        <div class="stat-value">${formatTime(item.ts)}</div>
                    </div>
                </div>
                <div class="item-actions">
                    <a href="${pumpUrl}" target="_blank" class="action-button">
                        <i class="fas fa-external-link-alt"></i> Pump.fun
                    </a>
                    <a href="${txUrl}" target="_blank" class="action-button secondary">
                        <i class="fas fa-receipt"></i> Transaction
                    </a>
                    <a href="${walletUrl}" target="_blank" class="action-button secondary">
                        <i class="fas fa-wallet"></i> Wallet
                    </a>
                </div>
            </div>
        `;
    }).join('');
}

// Рендеринг Volume Surge данных
function renderVolumeSurge(data) {
    const container = document.getElementById('volumeSurgeData');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-line"></i>
                <h3>No Volume Surge</h3>
                <p>No significant trading volume spikes detected in the last 15 minutes</p>
            </div>`;
        return;
    }
    
    container.innerHTML = data.map((item, index) => {
        const pumpUrl = `https://pump.fun/coin/${item.token_mint}`;
        const dexUrl = `https://dexscreener.com/solana/${item.token_mint}`;
        const tokenSymbol = item.symbol || item.token_mint.substring(0, 8);
        const tokenName = item.name || 'Unknown Token';
        
        return `
            <div class="data-item surge-item">
                <h3>
                    <i class="fas fa-chart-line"></i>
                    ${index + 1}. ${tokenSymbol} - ${tokenName}
                </h3>
                <div class="item-stats">
                    <div class="stat-item">
                        <div class="stat-label">Total Volume (2h)</div>
                        <div class="stat-value positive">${formatSOL(item.total_volume)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Transactions</div>
                        <div class="stat-value">${item.tx_count || 0}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Token</div>
                        <div class="stat-value">${shortenAddress(item.token_mint)}</div>
                    </div>
                </div>
                <div class="item-actions">
                    <a href="${pumpUrl}" target="_blank" class="action-button">
                        <i class="fas fa-external-link-alt"></i> Pump.fun
                    </a>
                    <a href="${dexUrl}" target="_blank" class="action-button">
                        <i class="fas fa-chart-bar"></i> DexScreener
                    </a>
                    <button class="action-button secondary" onclick="showTokenDetails('${item.token_mint}')">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Рендеринг Co-buy данных
function renderCoBuy(data) {
    const container = document.getElementById('coBuyData');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No Co-buy Activity</h3>
                <p>No tokens purchased simultaneously detected in the last 20 minutes</p>
            </div>`;
        return;
    }
    
    container.innerHTML = data.map((item, index) => {
        const pumpUrl = `https://pump.fun/coin/${item.token_mint}`;
        const dexUrl = `https://dexscreener.com/solana/${item.token_mint}`;
        
        return `
            <div class="data-item">
                <h3>
                    <i class="fas fa-users"></i>
                    ${index + 1}. ${item.symbol || 'UNKNOWN'} - ${item.name || 'Unknown Token'}
                </h3>
                <div class="item-stats">
                    <div class="stat-item">
                        <div class="stat-label">Simultaneous Buyers</div>
                        <div class="stat-value positive">${item.simultaneous_buyers || 0}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Total Volume</div>
                        <div class="stat-value">${formatSOL(item.total_volume || 0)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Average Buy</div>
                        <div class="stat-value">${formatSOL(item.avg_buy_size || 0)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Common Buyers</div>
                        <div class="stat-value positive">${item.common_buyers || 0}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Combined Volume</div>
                        <div class="stat-value neutral">${formatNumber(item.combined_volume)} SOL</div>
                    </div>
                </div>
                <div class="item-actions">
                    <a href="${pumpUrlA}" target="_blank" class="action-button">
                        <i class="fas fa-external-link-alt"></i> Token A
                    </a>
                    <a href="${pumpUrlB}" target="_blank" class="action-button secondary">
                        <i class="fas fa-external-link-alt"></i> Token B
                    </a>
                </div>
            </div>
        `;
    }).join('');
}

// Рендеринг Smart Money данных
function renderSmartMoney(data) {
    const container = document.getElementById('smartMoneyData');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-brain"></i>
                <h3>No Smart Money Activity</h3>
                <p>No experienced trader activity detected in the last 24 hours</p>
            </div>`;
        return;
    }
    
    container.innerHTML = data.map((item, index) => {
        const walletUrl = `https://solscan.io/account/${item.wallet}`;
        const timeAgo = formatTimeAgo(new Date(item.last_activity));
        
        // Получаем данные о трейдере
        const traderName = item.wallet_name || `Trader ${item.wallet.substring(0, 8)}`;
        const telegramLink = item.wallet_telegram;
        const twitterLink = item.wallet_twitter;
        
        // Информация о последней сделке
        const latestToken = item.token_name || 'Unknown Token';
        const latestSymbol = item.token_symbol || 'Unknown';
        const latestAmount = item.sol_spent ? formatSOL(item.sol_spent) : 'N/A';
        
        return `
            <div class="data-item smart-item">
                <h3>
                    <i class="fas fa-brain"></i>
                    ${index + 1}. ${traderName}
                    ${telegramLink ? `<a href="${telegramLink}" target="_blank" class="social-link telegram"><i class="fab fa-telegram"></i></a>` : ''}
                    ${twitterLink ? `<a href="${twitterLink}" target="_blank" class="social-link twitter"><i class="fab fa-twitter"></i></a>` : ''}
                </h3>
                <div class="item-stats">
                    <div class="stat-item">
                        <div class="stat-label">Wallet</div>
                        <div class="stat-value">${shortenAddress(item.wallet)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Unique Tokens</div>
                        <div class="stat-value positive">${item.unique_tokens || 0}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Total Trades</div>
                        <div class="stat-value neutral">${item.total_trades || 0}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Total Volume</div>
                        <div class="stat-value positive">${formatSOL(item.total_volume || 0)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Avg Buy Size</div>
                        <div class="stat-value neutral">${formatSOL(item.avg_buy_size || 0)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Last Activity</div>
                        <div class="stat-value">${timeAgo}</div>
                    </div>
                    ${item.token_symbol ? `
                    <div class="stat-item">
                        <div class="stat-label">Latest Token</div>
                        <div class="stat-value">${item.token_symbol} - ${latestToken}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Latest Amount</div>
                        <div class="stat-value positive">${latestAmount}</div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="item-actions">
                    <a href="${walletUrl}" target="_blank" class="action-button">
                        <i class="fas fa-wallet"></i> Wallet
                    </a>
                    ${item.tx_signature ? `
                    <a href="https://solscan.io/tx/${item.tx_signature}" target="_blank" class="action-button">
                        <i class="fas fa-external-link-alt"></i> Last Trade
                    </a>
                    ` : ''}
                    ${item.token_mint ? `
                    <a href="https://pump.fun/coin/${item.token_mint}" target="_blank" class="action-button">
                        <i class="fas fa-coins"></i> Token
                    </a>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Рендеринг Fresh Tokens данных
function renderFreshTokens(data) {
    const container = document.getElementById('freshTokensData');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-seedling"></i>
                <h3>No New Tokens</h3>
                <p>No new tokens with activity appeared in the last 5 minutes</p>
            </div>`;
        return;
    }
    
    container.innerHTML = data.map((item, index) => {
        const pumpUrl = `https://pump.fun/coin/${item.token_mint}`;
        const timeSinceCreation = new Date() - new Date(item.first_seen);
        const minutesAgo = Math.floor(timeSinceCreation / (1000 * 60));
        
        const tokenSymbol = item.symbol || item.token_mint.substring(0, 8);
        const tokenName = item.name || 'Unknown Token';
        
        return `
            <div class="data-item fresh-item">
                <h3>
                    <i class="fas fa-seedling"></i>
                    ${index + 1}. ${tokenSymbol} - ${tokenName}
                </h3>
                <div class="item-stats">
                    <div class="stat-item">
                        <div class="stat-label">Early Buyers</div>
                        <div class="stat-value positive">${item.early_buyers || 0}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Total Volume</div>
                        <div class="stat-value neutral">${formatSOL(item.total_volume)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Age</div>
                        <div class="stat-value">${minutesAgo}m ago</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Created</div>
                        <div class="stat-value">${formatTime(item.first_seen)}</div>
                    </div>
                </div>
                <div class="item-actions">
                    <a href="${pumpUrl}" target="_blank" class="action-button">
                        <i class="fas fa-external-link-alt"></i> Pump.fun
                    </a>
                    <button class="action-button secondary" onclick="showTokenDetails('${item.token_mint}')">
                        <i class="fas fa-info-circle"></i> Детали
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Рендеринг Top Gainers данных
function renderTopGainers(data) {
    const container = document.getElementById('topGainersData');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-trophy"></i>
                <h3>No Top Gainers</h3>
                <p>No tokens with volume over 100 SOL detected in the last hour</p>
            </div>`;
        return;
    }
    
    container.innerHTML = data.map((item, index) => {
        const pumpUrl = `https://pump.fun/coin/${item.token_mint}`;
        const dexUrl = `https://dexscreener.com/solana/${item.token_mint}`;
        const tokenSymbol = item.symbol || item.token_mint.substring(0, 8);
        const tokenName = item.name || 'Unknown Token';
        
        return `
            <div class="data-item">
                <h3>
                    <i class="fas fa-trophy"></i>
                    ${index + 1}. ${tokenSymbol} - ${tokenName}
                </h3>
                <div class="item-stats">
                    <div class="stat-item">
                        <div class="stat-label">Покупатели</div>
                        <div class="stat-value positive">${item.total_buyers || 0}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Общий объем</div>
                        <div class="stat-value neutral">${formatNumber(item.total_volume)} SOL</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Средняя покупка</div>
                        <div class="stat-value">${formatNumber(item.avg_buy_size)} SOL</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Крупнейшая покупка</div>
                        <div class="stat-value positive">${formatNumber(item.largest_buy)} SOL</div>
                    </div>
                </div>
                <div class="item-actions">
                    <a href="${pumpUrl}" target="_blank" class="action-button">
                        <i class="fas fa-external-link-alt"></i> Pump.fun
                    </a>
                    <a href="${dexUrl}" target="_blank" class="action-button secondary">
                        <i class="fas fa-chart-line"></i> DexScreener
                    </a>
                    <button class="action-button secondary" onclick="showTokenDetails('${item.token_mint}')">
                        <i class="fas fa-info-circle"></i> Детали
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Показ деталей токена в модальном окне
async function showTokenDetails(tokenMint) {
    const modal = document.getElementById('tokenModal');
    const title = document.getElementById('modalTokenTitle');
    const content = document.getElementById('modalTokenContent');
    
    if (!modal || !title || !content) return;
    
    title.textContent = `Детали токена: ${shortenAddress(tokenMint)}`;
    content.innerHTML = '<div class="loading-placeholder">Loading token data...</div>';
    
    modal.classList.add('active');
    
    try {
        const tokenData = await fetchData(`token/details/${tokenMint}`);
        
        if (!tokenData || tokenData.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-info-circle"></i>
                    <h3>No Token Data</h3>
                    <p>No activity data available for this token in the last 2 hours</p>
                </div>`;
            return;
        }
        
        // Группируем по типу операций
        const buyTrades = tokenData.filter(trade => trade.side === 'BUY');
        const sellTrades = tokenData.filter(trade => trade.side === 'SELL');
        
        // Статистика
        const totalBuyVolume = buyTrades.reduce((sum, trade) => sum + parseFloat(trade.sol_spent || 0), 0);
        const totalSellVolume = sellTrades.reduce((sum, trade) => sum + parseFloat(trade.sol_spent || 0), 0);
        const uniqueBuyers = new Set(buyTrades.map(trade => trade.wallet)).size;
        const uniqueSellers = new Set(sellTrades.map(trade => trade.wallet)).size;
        
        content.innerHTML = `
            <div class="token-stats">
                <div class="stat-item">
                    <div class="stat-label">Адрес токена</div>
                    <div class="stat-value" style="font-size: 0.9rem; word-break: break-all;">${tokenMint}</div>
                </div>
                <div class="item-stats" style="margin: 1rem 0;">
                    <div class="stat-item">
                        <div class="stat-label">Покупки (2ч)</div>
                        <div class="stat-value positive">${buyTrades.length}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Продажи (2ч)</div>
                        <div class="stat-value negative">${sellTrades.length}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Объем покупок</div>
                        <div class="stat-value positive">${formatNumber(totalBuyVolume)} SOL</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Объем продаж</div>
                        <div class="stat-value negative">${formatNumber(totalSellVolume)} SOL</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Покупателей</div>
                        <div class="stat-value">${uniqueBuyers}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Продавцов</div>
                        <div class="stat-value">${uniqueSellers}</div>
                    </div>
                </div>
            </div>
            
            <h4 style="margin-top: 2rem; margin-bottom: 1rem;">Последние транзакции:</h4>
            <div style="max-height: 300px; overflow-y: auto;">
                ${tokenData.slice(0, 10).map(trade => `
                    <div class="data-item" style="margin-bottom: 0.5rem; padding: 0.75rem;">
                        <div class="item-stats">
                            <div class="stat-item">
                                <div class="stat-label">Тип</div>
                                <div class="stat-value ${trade.side === 'BUY' ? 'positive' : 'negative'}">${trade.side}</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">Трейдер</div>
                                <div class="stat-value">${trade.wallet_name || shortenAddress(trade.wallet)}</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">SOL</div>
                                <div class="stat-value">${formatNumber(trade.sol_spent)}</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">Время</div>
                                <div class="stat-value">${formatTime(trade.ts)}</div>
                            </div>
                        </div>
                        <div class="item-actions" style="margin-top: 0.5rem;">
                            <a href="https://solscan.io/tx/${trade.tx_signature}" target="_blank" class="action-button">
                                <i class="fas fa-external-link-alt"></i> TX
                            </a>
                        </div>
                    </div>
                `).join('')}
            </div>`;
            
    } catch (error) {
        content.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Ошибка загрузки</h3>
                <p>${error.message}</p>
                <button onclick="showTokenDetails('${tokenMint}')">
                    <i class="fas fa-redo"></i> Повторить
                </button>
            </div>`;
    }
}

// Закрытие модального окна
function closeTokenModal() {
    const modal = document.getElementById('tokenModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Отображение ошибки в контейнере
function renderError(containerId, error) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Ошибка загрузки</h3>
            <p>${error.message || 'Произошла неизвестная ошибка'}</p>
            <button onclick="loadTabData('${currentTab}')">
                <i class="fas fa-redo"></i> Повторить
            </button>
        </div>`;
}

// Загрузка данных для текущей вкладки
async function loadTabData(tabName) {
    if (isLoading) return;
    
    const endpoint = TAB_API_MAP[tabName];
    const renderFunction = TAB_RENDER_MAP[tabName];
    const dataContainerId = `${tabName}Data`;
    
    // Special handling for non-API tabs
    if (tabName === 'about' || tabName === 'analytics') {
        hideLoading();
        return;
    }
    
    // Special handling for Coins tab with filters
    if (tabName === 'coins') {
        try {
            showLoading();
            await loadCoinsData('low', '24h'); // Load with default filters (Low Caps, 24h)
            updateLastUpdateTime();
        } catch (error) {
            console.error(`Ошибка загрузки данных для ${tabName}:`, error);
            renderError(dataContainerId, error);
        } finally {
            hideLoading();
        }
        return;
    }
    
    if (!endpoint || !renderFunction) {
        console.error(`Неизвестная вкладка: ${tabName}`);
        return;
    }
    
    try {
        showLoading();
        
        const data = await fetchData(endpoint);
        renderFunction(data);
        updateLastUpdateTime();
        
    } catch (error) {
        console.error(`Ошибка загрузки данных для ${tabName}:`, error);
        renderError(dataContainerId, error);
    } finally {
        hideLoading();
    }
}

// Переключение вкладки
function switchTab(tabName) {
    if (currentTab === tabName || isLoading) return;
    
    // Обновление активной вкладки в навигации
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    const activeTabButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTabButton) {
        activeTabButton.classList.add('active');
    }
    
    // Обновление содержимого вкладок
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const activeTabContent = document.getElementById(tabName);
    if (activeTabContent) {
        activeTabContent.classList.add('active');
    }
    
    currentTab = tabName;
    loadTabData(tabName);
}

// ===== PORTFOLIO FUNCTIONS =====

// Render portfolio traders list
async function renderPortfolio(data) {
    const container = document.getElementById('walletGrid');
    if (!container) {
        console.error('Wallet grid container not found');
        return;
    }

    if (!data || !Array.isArray(data)) {
        container.innerHTML = '<div class="loading-placeholder">No trader data available</div>';
        return;
    }

    container.innerHTML = '';

    // Use real data from API if available, otherwise show fallback
    if (data && data.length > 0) {
        data.forEach(trader => {
            const walletCard = createWalletCard(trader);
            container.appendChild(walletCard);
        });
    } else {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-wallet"></i>
                <h3>No Active Traders</h3>
                <p>No traders with activity in the last 7 days found</p>
            </div>`;
    }
}

// Create individual wallet card (Apple Stocks style)
function createWalletCard(trader) {
    const card = document.createElement('div');
    card.className = 'wallet-card';
    
    // Calculate performance based on real activity data
    const totalTrades = trader.total_trades || 0;
    const totalVolume = trader.total_volume || 0;
    const uniqueTokens = trader.unique_tokens || 0;
    
    // Performance indicator based on activity (higher activity = better performance)
    const activityScore = (totalTrades * 0.1) + (uniqueTokens * 0.5) + (totalVolume * 0.001);
    const isActive = totalTrades > 0 && uniqueTokens > 0;
    
    if (isActive && activityScore > 5) {
        card.classList.add('profitable');
    } else if (isActive && activityScore > 2) {
        card.classList.add('neutral');
    } else {
        card.classList.add('lossy');
    }

    const symbol = trader.symbol || trader.name.charAt(0).toUpperCase();
    const shortAddress = trader.wallet.slice(0, 8) + '...' + trader.wallet.slice(-8);
    const lastActivity = trader.last_activity ? formatTimeAgo(new Date(trader.last_activity)) : 'Unknown';
    
    // Calculate performance percentage based on real metrics
    const performancePct = Math.min(activityScore * 2, 25); // Cap at 25%
    const performanceValue = `+${performancePct.toFixed(1)}%`;
    
    card.innerHTML = `
        <div class="wallet-header">
            <div class="wallet-avatar">${symbol}</div>
            <div class="wallet-info">
                <h4>${trader.name || 'Anonymous Trader'}</h4>
                <div class="wallet-address">${shortAddress}</div>
                ${trader.telegram || trader.twitter ? `
                <div class="wallet-socials">
                    ${trader.telegram ? `<a href="${trader.telegram}" target="_blank" class="social-link telegram"><i class="fab fa-telegram"></i></a>` : ''}
                    ${trader.twitter ? `<a href="${trader.twitter}" target="_blank" class="social-link twitter"><i class="fab fa-twitter"></i></a>` : ''}
                </div>` : ''}
            </div>
        </div>
        
        <div class="wallet-stats">
            <div class="stat-item">
                <div class="stat-value">${uniqueTokens}</div>
                <div class="stat-label">Tokens</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${totalTrades}</div>
                <div class="stat-label">Trades</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${formatSOL(totalVolume)}</div>
                <div class="stat-label">Volume</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${lastActivity}</div>
                <div class="stat-label">Last Active</div>
            </div>
        </div>
        
        <div class="wallet-performance">
            <div class="performance-indicator ${isActive && activityScore > 5 ? 'profitable' : isActive && activityScore > 2 ? 'neutral' : 'loss'}"></div>
            <div class="performance-text">${performanceValue}</div>
        </div>
        
        <div class="wallet-actions">
            <a href="https://solscan.io/account/${trader.wallet}" target="_blank" class="action-button">
                <i class="fas fa-external-link-alt"></i> View Wallet
            </a>
        </div>
        
        <div class="wallet-dropdown">
            <div class="token-holdings">
                <h5><i class="fas fa-coins"></i> Top Holdings</h5>
                ${createMockTokenHoldings()}
            </div>
        </div>
    `;

    // Add click handler to toggle dropdown
    card.addEventListener('click', () => {
        const dropdown = card.querySelector('.wallet-dropdown');
        dropdown.classList.toggle('open');
    });

    return card;
}

// Create mock token holdings for demo (подобно TROLL, SPARK etc.)
function createMockTokenHoldings() {
    const tokens = [
        { symbol: 'TROLL', name: 'Troll Token', balance: '1.89M', price: '$0.1670', value: '$316.0K', pct: '51.5%' },
        { symbol: 'SPARK', name: 'Spark Token', balance: '11.66M', price: '$0.0127', value: '$148.1K', pct: '24.1%' },
        { symbol: 'PUMP', name: 'Pump Token', balance: '500K', price: '$0.0850', value: '$42.5K', pct: '12.3%' },
        { symbol: 'MOON', name: 'Moon Token', balance: '2.1M', price: '$0.0021', value: '$4.4K', pct: '5.1%' }
    ];

    return tokens.map(token => `
        <div class="token-row">
            <div class="token-info">
                <div class="token-avatar">${token.symbol.charAt(0)}</div>
                <div class="token-meta">
                    <div class="token-name">${token.name}</div>
                    <div class="token-symbol">${token.symbol}</div>
                </div>
            </div>
            <div class="token-balance">${token.balance}</div>
            <div class="token-value">${token.value}</div>
            <div class="token-change positive">${token.pct}</div>
        </div>
    `).join('');
}

// Обновление текущей вкладки
function refreshCurrentTab() {
    if (!isLoading) {
        loadTabData(currentTab);
    }
}

// Автоматическое обновление
function startAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    
    refreshTimer = setInterval(() => {
        if (!isLoading && document.visibilityState === 'visible') {
            loadTabData(currentTab);
        }
    }, REFRESH_INTERVAL);
}

// Остановка автоматического обновления
function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

// Проверка состояния API
async function checkApiHealth() {
    try {
        await fetchData('health');
        updateApiStatus(true);
    } catch (error) {
        updateApiStatus(false);
    }
}

// Инициализация приложения
async function initApp() {
    console.log('Инициализация Pump Dex Mini App...');
    
    // Инициализация Telegram Web App
    const tg = initTelegramWebApp();
    
    // Проверка API
    await checkApiHealth();
    
    // Настройка обработчиков событий для вкладок
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            if (tabName) {
                switchTab(tabName);
            }
        });
    });
    
    // Закрытие модального окна по клику вне его
    document.getElementById('tokenModal').addEventListener('click', (e) => {
        if (e.target.id === 'tokenModal') {
            closeTokenModal();
        }
    });
    
    // Обработка изменения видимости страницы
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            startAutoRefresh();
            loadTabData(currentTab);
        } else {
            stopAutoRefresh();
        }
    });
    
    // Загрузка данных для активной вкладки
    await loadTabData(currentTab);
    
    // Запуск автоматического обновления
    startAutoRefresh();
    
    // Скрытие экрана загрузки
    setTimeout(hideLoading, 500);
    
    console.log('Pump Dex Mini App инициализирован успешно');
}

// Современные анимации и эффекты
function animateRefreshButton() {
    const refreshButton = document.querySelector('.refresh-button');
    if (refreshButton) {
        refreshButton.style.transform = 'rotate(360deg) translateY(-2px)';
        setTimeout(() => {
            refreshButton.style.transform = 'translateY(-2px)';
        }, 600);
    }
}

function animateCards() {
    const cards = document.querySelectorAll('.data-item');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.4s ease-out';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Улучшенная функция обновления вкладки
function refreshCurrentTab() {
    if (!isLoading) {
        animateRefreshButton();
        loadTabData(currentTab);
    }
}

// Обновление функции переключения вкладок
function switchTab(tabName) {
    if (currentTab === tabName || isLoading) return;
    
    // Обновление активной вкладки в навигации
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    const activeTabButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTabButton) {
        activeTabButton.classList.add('active');
    }
    
    // Обновление содержимого вкладок с анимацией
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const activeTabContent = document.getElementById(tabName);
    if (activeTabContent) {
        activeTabContent.classList.add('active');
    }
    
    currentTab = tabName;
    loadTabData(tabName).then(() => {
        // Анимация карточек после загрузки данных
        setTimeout(animateCards, 100);
    });
}

// Обработчик для refresh кнопки
function setupRefreshButtonHandler() {
    const refreshButton = document.querySelector('.refresh-button');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            refreshCurrentTab();
        });
    }
}

// Улучшенная инициализация приложения
async function initApp() {
    console.log('🚀 Инициализация Pump Dex Mini App...');
    
    // Инициализация темы
    initTheme();
    
    // Инициализация Telegram Web App
    const tg = initTelegramWebApp();
    
    // Проверка API
    await checkApiHealth();
    
    // Настройка обработчиков событий для вкладок
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            if (tabName) {
                switchTab(tabName);
            }
        });
    });
    
    // Настройка refresh кнопки
    setupRefreshButtonHandler();
    
    // Закрытие модального окна по клику вне его
    const modal = document.getElementById('tokenModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'tokenModal') {
                closeTokenModal();
            }
        });
    }
    
    // Обработка изменения видимости страницы
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            startAutoRefresh();
            loadTabData(currentTab);
        } else {
            stopAutoRefresh();
        }
    });
    
    // Загрузка данных для активной вкладки
    // Инициализация анимации трейдеров
    initializeTradersScroll();
    
    // Инициализация фильтров для Coins tab
    initCoinsFilters();
    
    await loadTabData(currentTab);
    
    // Запуск автоматического обновления
    startAutoRefresh();
    
    // Скрытие экрана загрузки с анимацией
    setTimeout(() => {
        hideLoading();
        // Анимация карточек при первой загрузке
        setTimeout(animateCards, 200);
    }, 500);
    
    console.log('✅ Pump Dex Mini App инициализирован успешно');
    console.log('🎨 Современный дизайн загружен');
    console.log('📡 API подключение проверено');
}

// === АНИМАЦИЯ ТРЕЙДЕРОВ ===
function initializeTradersScroll() {
    const tradersContainer = document.getElementById('tradersScroll');
    if (!tradersContainer) return;
    
    // List of known traders with their symbols
    const traders = [
        { name: "Dave Portnoy", symbol: "🏛️", telegram: null, twitter: "https://x.com/stoolpresidente" },
        { name: "dingaling", symbol: "💎", telegram: null, twitter: "https://x.com/dingalingts" },
        { name: "Levis", symbol: "🚀", telegram: "https://t.me/LevisAlpha", twitter: "https://x.com/LevisNFT" },
        { name: "7xNickk", symbol: "⚡", telegram: null, twitter: "https://x.com/7xNickk" },
        { name: "Pain", symbol: "🩸", telegram: "https://t.me/PainCrypto69", twitter: "https://x.com/PainCrypt0" },
        { name: "Monarch", symbol: "👑", telegram: "https://t.me/MonarchJournal", twitter: "https://x.com/MonarchBTC" },
        { name: "ShockedJS", symbol: "⚡", telegram: "https://t.me/shockedjstrading", twitter: "https://x.com/ShockedJS" },
        { name: "JB", symbol: "💰", telegram: null, twitter: "https://x.com/Jeetburner" },
        { name: "unprofitable", symbol: "📉", telegram: null, twitter: "https://x.com/exitliquid1ty" },
        { name: "xunle", symbol: "🌙", telegram: null, twitter: "https://x.com/xunle111" },
        { name: "Oura", symbol: "🌅", telegram: "https://t.me/OuraEmergencyCalls", twitter: "https://x.com/Oura456" },
        { name: "Lynk", symbol: "🔗", telegram: "https://t.me/lynkscabal", twitter: "https://x.com/lynk0x" },
        { name: "Kadenox", symbol: "⚡", telegram: null, twitter: "https://x.com/kadenox" },
        { name: "Insyder", symbol: "🕵️", telegram: null, twitter: "https://x.com/insydercrypto" },
        { name: "LilMoonLambo", symbol: "🌙", telegram: null, twitter: "https://x.com/LilMoonLambo" },
        { name: "Phineas.SOL", symbol: "🧪", telegram: "https://t.me/PhineasCabal", twitter: "https://x.com/Phineas_Sol" },
        { name: "Solstice", symbol: "🌅", telegram: "https://t.me/solsticesmoonshots", twitter: "https://x.com/The__Solstice" },
        { name: "Hail", symbol: "⚡", telegram: null, twitter: "https://x.com/ignHail" },
        { name: "Jeets", symbol: "💰", telegram: null, twitter: "https://x.com/ieatjeets" },
        { name: "Groovy", symbol: "🎵", telegram: null, twitter: "https://x.com/0xGroovy" },
        { name: "big bags bobby", symbol: "💰", telegram: null, twitter: "https://x.com/bigbagsbobby" },
        { name: "gr3g", symbol: "💪", telegram: null, twitter: "https://x.com/gr3gor14n" },
        { name: "Sebastian", symbol: "⚡", telegram: null, twitter: "https://x.com/Saint_pablo123" },
        { name: "Enjooyer", symbol: "🍼", telegram: null, twitter: "https://x.com/0xEnjooyer" },
        { name: "Sweep", symbol: "🧹", telegram: "https://t.me/jsdao", twitter: "https://x.com/0xSweep" },
        { name: "goob", symbol: "🤡", telegram: "https://t.me/goobscall", twitter: "https://x.com/ifullclipp" },
        { name: "xander", symbol: "⚔️", telegram: "https://t.me/xanderstrenches", twitter: "https://x.com/xandereef" },
        { name: "ozark", symbol: "🏔️", telegram: null, twitter: "https://x.com/ohzarke" },
        { name: "Exy", symbol: "🎯", telegram: null, twitter: "https://x.com/eth_exy" },
        { name: "Unipcs", symbol: "🦴", telegram: null, twitter: "https://x.com/theunipcs" },
        { name: "Leens", symbol: "👨‍🍳", telegram: "https://t.me/leenscooks", twitter: "https://x.com/leensx100" },
        { name: "FINN", symbol: "🐕", telegram: null, twitter: "https://x.com/finnbags" },
        { name: "Lectron", symbol: "⚡", telegram: null, twitter: "https://x.com/LectronNFT" },
        { name: "Don", symbol: "🎭", telegram: "https://t.me/dontrenches", twitter: "https://x.com/doncaarbon" },
        { name: "Sizeab1e", symbol: "📏", telegram: "https://t.me/thetradingcorps", twitter: "https://x.com/sizeab1e" },
        { name: "Flames", symbol: "🔥", telegram: null, twitter: "https://x.com/FlamesOnSol" },
        { name: "oscar", symbol: "🏆", telegram: null, twitter: "https://x.com/oscarexitliq" },
        { name: "printer", symbol: "🖨️", telegram: null, twitter: "https://x.com/prxnterr" },
        { name: "Bronsi", symbol: "🍪", telegram: "https://t.me/Bronsisinsiderinfo", twitter: "https://x.com/Bronsicooks" },
        { name: "staticc", symbol: "⚡", telegram: null, twitter: "https://x.com/staticctrades" },
        { name: "Zil", symbol: "⚡", telegram: "https://t.me/zilcalls", twitter: "https://x.com/zilxbt" },
        { name: "Publix", symbol: "🏪", telegram: null, twitter: "https://x.com/Publixplayz" },
        { name: "Thurston", symbol: "⚡", telegram: null, twitter: "https://x.com/itsthurstxn" },
        { name: "Hash", symbol: "💩", telegram: "https://t.me/HashTrades", twitter: "https://x.com/Hashbergers" },
        { name: "guappy", symbol: "🐠", telegram: null, twitter: "https://x.com/guappy_eth" },
        { name: "bihoz", symbol: "🚀", telegram: null, twitter: "https://x.com/bihozNFTs" },
        { name: "Hesi", symbol: "🎯", telegram: null, twitter: "https://x.com/hesikillaz" },
        { name: "Giann", symbol: "⚡", telegram: null, twitter: "https://x.com/Giann2K" },
        { name: "jamessmith", symbol: "🎯", telegram: null, twitter: "https://x.com/luckedhub" },
        { name: "Ansem", symbol: "🧠", telegram: null, twitter: "https://x.com/blknoiz06" },
        { name: "Michi", symbol: "🎮", telegram: null, twitter: "https://x.com/michibets" },
        { name: "evening", symbol: "🌙", telegram: null, twitter: "https://x.com/eveningbtc" },
        { name: "shaka", symbol: "🏝️", telegram: "https://t.me/shakasisland", twitter: "https://x.com/solanashaka" },
        { name: "Damian Prosalendis", symbol: "🏦", telegram: "http://t.me/prosacalls", twitter: "https://x.com/DamianProsa" },
        { name: "Fuzz", symbol: "🎧", telegram: null, twitter: "https://x.com/slfuzz" },
        { name: "JADAWGS", symbol: "🐶", telegram: null, twitter: "https://x.com/10xJDOG" },
        { name: "nob mini", symbol: "🔰", telegram: null, twitter: "https://x.com/noobmini_" },
        { name: "aloh", symbol: "🍍", telegram: "https://t.me/alohcooks", twitter: "https://x.com/alohquant" },
        { name: "cxltures", symbol: "🎨", telegram: null, twitter: "https://x.com/cxlturesvz" },
        { name: "Orange", symbol: "🍊", telegram: null, twitter: "https://x.com/OrangeSBS" },
        { name: "Betman", symbol: "🦇", telegram: null, twitter: "https://x.com/ImTheBetman" },
        { name: "Collectible", symbol: "📦", telegram: null, twitter: "https://x.com/collectible" },
        { name: "Risk", symbol: "⚠️", telegram: null, twitter: "https://x.com/risk100x" },
        { name: "The Doc", symbol: "🩺", telegram: "https://t.me/+9OnlKXERe9hkODBh", twitter: "https://x.com/KayTheDoc" },
        { name: "Putrick", symbol: "🎯", telegram: "https://t.me/cryptoputro", twitter: "https://x.com/Putrickk" },
        { name: "Mr. Frog", symbol: "🐸", telegram: null, twitter: "https://x.com/TheMisterFrog" },
        { name: "MoneyMaykah", symbol: "💰", telegram: null, twitter: "https://x.com/moneymaykah_" },
        { name: "EvansOfWeb", symbol: "🌐", telegram: null, twitter: "https://x.com/EvansOfWeb3" },
        { name: "Owl", symbol: "🦉", telegram: null, twitter: "https://x.com/OwlFN_" },
        { name: "Sebi", symbol: "🎪", telegram: "https://t.me/launchlog", twitter: "https://x.com/limpcritisism" },
        { name: "gambles.sol", symbol: "🎲", telegram: "https://t.me/launchlog", twitter: "https://x.com/mastern0de3" },
        { name: "Inside Calls", symbol: "📞", telegram: "http://t.me/callsfromwithin", twitter: "https://x.com/insidecalls" },
        { name: "Laanie", symbol: "🐰", telegram: "https://t.me/laaniecalls", twitter: "https://x.com/cryptolaanie" },
        { name: "Casino", symbol: "🎰", telegram: "https://t.me/casino_calls", twitter: "https://x.com/casino616" },
        { name: "Trey", symbol: "🎵", telegram: "https://t.me/treystele", twitter: "https://x.com/treysocial" },
        { name: "Otta", symbol: "🦦", telegram: "https://t.me/ottabag", twitter: "https://x.com/ottabag" },
        { name: "Fabix", symbol: "⚗️", telegram: "https://t.me/FabixAlpha", twitter: "https://x.com/Fabix_Sol" }
    ];
    
    // Очистим контейнер и создадим элементы
    tradersContainer.innerHTML = '';
    
    // Create elements for truly infinite scrolling
    const tradersCopy = traders.slice(); // Copy the array
    const totalCopies = 5; // Create 5 copies for seamless infinite scroll
    
    for (let copy = 0; copy < totalCopies; copy++) {
        traders.forEach((trader, index) => {
            const globalIndex = copy * traders.length + index;
            const traderElement = createTraderElement(trader, globalIndex);
            tradersContainer.appendChild(traderElement);
        });
    }
}

function createTraderElement(trader, index) {
    const div = document.createElement('div');
    div.className = 'trader-item';
    div.style.cssText = `--delay: ${index * 0.08}s; animation-delay: ${index * 0.08}s;`;
    
    // Генерируем цветной градиент для аватара
    const colors = [
        'linear-gradient(135deg, #4a9eff, #6c5ce7)',
        'linear-gradient(135deg, #6c5ce7, #74b9ff)', 
        'linear-gradient(135deg, #74b9ff, #a29bfe)',
        'linear-gradient(135deg, #a29bfe, #fd79a8)',
        'linear-gradient(135deg, #fd79a8, #fdcb6e)',
        'linear-gradient(135deg, #fdcb6e, #00b894)',
        'linear-gradient(135deg, #00b894, #00cec9)',
        'linear-gradient(135deg, #00cec9, #4a9eff)'
    ];
    
    const colorIndex = index % colors.length;
    
    div.innerHTML = `
        <div class="trader-avatar" style="background: ${colors[colorIndex]}">
            ${trader.symbol}
        </div>
        <div class="trader-info">
            <div class="trader-name">${trader.name}</div>
            <div class="trader-socials">
                ${trader.telegram ? `<a href="${trader.telegram}" target="_blank" class="trader-social-link telegram"><i class="fab fa-telegram"></i></a>` : ''}
                ${trader.twitter ? `<a href="${trader.twitter}" target="_blank" class="trader-social-link twitter"><i class="fab fa-twitter"></i></a>` : ''}
            </div>
        </div>
    `;
    
    return div;
}

// Функция рендеринга Recent Activity вкладки
function renderRecentActivity(data) {
    const container = document.getElementById('recentActivityData');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <h3>No Recent Activity</h3>
                <p>No transactions found in database</p>
            </div>`;
        return;
    }
    
    // Разделяем на SELL и BUY
    const sellTransactions = data.filter(item => item.side === 'SELL');
    const buyTransactions = data.filter(item => item.side === 'BUY');
    
    // Создаем переключатель
    const toggleHTML = `
        <div class="activity-toggle">
            <button class="toggle-btn active" data-type="all">
                <i class="fas fa-list"></i> All Activity
            </button>
            <button class="toggle-btn" data-type="buy">
                <i class="fas fa-arrow-circle-up"></i> BUY (${buyTransactions.length})
            </button>
            <button class="toggle-btn" data-type="sell">
                <i class="fas fa-arrow-circle-down"></i> SELL (${sellTransactions.length})
            </button>
        </div>
    `;
    
    const renderTransaction = (item, index) => {
        const isBuy = item.side === 'BUY';
        const amount = isBuy ? item.sol_spent : item.sol_received;
        const traderName = item.wallet_name || `Trader ${item.wallet.substring(0, 8)}`;
        const tokenSymbol = item.token_symbol || 'UNKNOWN';
        const tokenName = item.token_name || 'Unknown Token';
        const timeAgo = formatTimeAgo(new Date(item.ts));
        
        return `
            <div class="data-item activity-item ${isBuy ? 'buy-action' : 'sell-action'}">
                <div class="activity-header">
                    <div class="activity-type">
                        <i class="fas ${isBuy ? 'fa-arrow-circle-up' : 'fa-arrow-circle-down'}"></i>
                        <span class="action-label">${isBuy ? 'BUY' : 'SELL'}</span>
                    </div>
                    <div class="activity-time">${timeAgo}</div>
                </div>
                
                <h3>
                    <i class="fas fa-user-circle"></i>
                    ${traderName}
                    ${item.wallet_telegram ? `<a href="${item.wallet_telegram}" target="_blank" class="social-link telegram"><i class="fab fa-telegram"></i></a>` : ''}
                    ${item.wallet_twitter ? `<a href="${item.wallet_twitter}" target="_blank" class="social-link twitter"><i class="fab fa-twitter"></i></a>` : ''}
                </h3>
                
                <div class="activity-details">
                    <div class="detail-row">
                        <span class="detail-label">Token:</span>
                        <span class="detail-value">${tokenSymbol} - ${tokenName}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Amount:</span>
                        <span class="detail-value ${isBuy ? 'positive' : 'negative'}">${formatSOL(amount)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">DEX:</span>
                        <span class="detail-value">${item.dex || 'Unknown'}</span>
                    </div>
                </div>
                
                <div class="item-actions">
                    <a href="https://solscan.io/tx/${item.tx_signature}" target="_blank" class="action-button">
                        <i class="fas fa-external-link-alt"></i> Transaction
                    </a>
                    <a href="https://solscan.io/account/${item.wallet}" target="_blank" class="action-button">
                        <i class="fas fa-wallet"></i> Wallet
                    </a>
                </div>
            </div>
        `;
    };
    
    // Создаем контент с переключателем
    container.innerHTML = `
        ${toggleHTML}
        <div class="activity-content" id="activityContent">
            <div class="activity-columns">
                <div class="activity-column sell-column">
                    <h3 class="column-header"><i class="fas fa-arrow-circle-down"></i> SELL Transactions</h3>
                    ${sellTransactions.length > 0 ? sellTransactions.map(renderTransaction).join('') : '<div class="empty-column">No SELL transactions</div>'}
                </div>
                <div class="activity-column buy-column">
                    <h3 class="column-header"><i class="fas fa-arrow-circle-up"></i> BUY Transactions</h3>
                    ${buyTransactions.length > 0 ? buyTransactions.map(renderTransaction).join('') : '<div class="empty-column">No BUY transactions</div>'}
                </div>
            </div>
        </div>
    `;
    
    // Добавляем обработчики для переключателя
    setupActivityToggle(data);
}

// Настройка переключателя для Recent Activity
function setupActivityToggle(data) {
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    const activityContent = document.getElementById('activityContent');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Убираем active класс со всех кнопок
            toggleButtons.forEach(btn => btn.classList.remove('active'));
            // Добавляем active класс к нажатой кнопке
            button.classList.add('active');
            
            const type = button.dataset.type;
            let filteredData = data;
            
            if (type === 'buy') {
                filteredData = data.filter(item => item.side === 'BUY');
            } else if (type === 'sell') {
                filteredData = data.filter(item => item.side === 'SELL');
            }
            
            // Обновляем контент
            updateActivityContent(filteredData, type);
        });
    });
}

// Обновление контента Recent Activity
function updateActivityContent(data, type) {
    const activityContent = document.getElementById('activityContent');
    if (!activityContent) return;
    
    const renderTransaction = (item, index) => {
        const isBuy = item.side === 'BUY';
        const amount = isBuy ? item.sol_spent : item.sol_received;
        const traderName = item.wallet_name || `Trader ${item.wallet.substring(0, 8)}`;
        const tokenSymbol = item.token_symbol || 'UNKNOWN';
        const tokenName = item.token_name || 'Unknown Token';
        const timeAgo = formatTimeAgo(new Date(item.ts));
        
        // Calculate gradient intensity based on transaction size (max 6 SOL = 100% brightness)
        const amountNum = parseFloat(amount) || 0;
        const intensity = Math.min(amountNum / 6, 1); // 0-1 scale
        const opacity = 0.3 + (intensity * 0.7); // 0.3-1.0 opacity
        
        // Generate gradient styles
        const gradientStyle = isBuy 
            ? `background: linear-gradient(135deg, rgba(34, 197, 94, ${opacity}) 0%, rgba(22, 163, 74, ${opacity * 0.8}) 100%)`
            : `background: linear-gradient(135deg, rgba(239, 68, 68, ${opacity}) 0%, rgba(220, 38, 38, ${opacity * 0.8}) 100%)`;
        
        return `
            <div class="data-item activity-item ${isBuy ? 'buy-action' : 'sell-action'}" style="${gradientStyle}">
                <div class="activity-header">
                    <div class="activity-type">
                        <i class="fas ${isBuy ? 'fa-arrow-circle-up' : 'fa-arrow-circle-down'}"></i>
                        <span class="action-label">${isBuy ? 'BUY' : 'SELL'}</span>
                    </div>
                    <div class="activity-time">${timeAgo}</div>
                </div>
                
                <h3>
                    <i class="fas fa-user-circle"></i>
                    ${traderName}
                    ${item.wallet_telegram ? `<a href="${item.wallet_telegram}" target="_blank" class="social-link telegram"><i class="fab fa-telegram"></i></a>` : ''}
                    ${item.wallet_twitter ? `<a href="${item.wallet_twitter}" target="_blank" class="social-link twitter"><i class="fab fa-twitter"></i></a>` : ''}
                </h3>
                
                <div class="activity-details">
                    <div class="detail-row">
                        <span class="detail-label">Token:</span>
                        <span class="detail-value">${tokenSymbol} - ${tokenName}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Amount:</span>
                        <span class="detail-value ${isBuy ? 'positive' : 'negative'}">${formatSOL(amount)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">DEX:</span>
                        <span class="detail-value">${item.dex || 'Unknown'}</span>
                    </div>
                </div>
                
                <div class="item-actions">
                    <a href="https://solscan.io/tx/${item.tx_signature}" target="_blank" class="action-button">
                        <i class="fas fa-external-link-alt"></i> Transaction
                    </a>
                    <a href="https://solscan.io/account/${item.wallet}" target="_blank" class="action-button">
                        <i class="fas fa-wallet"></i> Wallet
                    </a>
                </div>
            </div>
        `;
    };
    
    if (type === 'all') {
        // Показываем все транзакции в хронологическом порядке с градиентной окраской
        const sortedData = [...data].sort((a, b) => new Date(b.ts) - new Date(a.ts)); // Сортируем по времени (новые сверху)
        
        activityContent.innerHTML = `
            <div class="activity-single-column">
                <h3 class="column-header">
                    <i class="fas fa-list"></i> All Activity (${data.length} transactions)
                </h3>
                ${sortedData.length > 0 ? sortedData.map(renderTransaction).join('') : '<div class="empty-column">No transactions found</div>'}
            </div>
        `;
    } else {
        // Показываем одну колонку
        activityContent.innerHTML = `
            <div class="activity-single-column">
                <h3 class="column-header">
                    <i class="fas ${type === 'buy' ? 'fa-arrow-circle-up' : 'fa-arrow-circle-down'}"></i> 
                    ${type.toUpperCase()} Transactions (${data.length})
                </h3>
                ${data.length > 0 ? data.map(renderTransaction).join('') : '<div class="empty-column">No transactions found</div>'}
            </div>
        `;
    }
}

// Функция рендеринга Coins вкладки
function renderCoins(data) {
    const container = document.getElementById('coinsData');
    container.classList.add('coins-grid');
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-coins"></i>
                <h3>No coin data available</h3>
                <p>No coins found for the selected criteria</p>
            </div>
        `;
        return;
    }
    
    const coinsHTML = data.map(coin => `
        <div class="coin-card" data-contract="${coin.token_mint}">
            <div class="coin-header">
                <div class="coin-ticker">$${coin.symbol || 'UNKNOWN'}</div>
                <div class="coin-name">${coin.name || 'Unknown Token'}</div>
                <div class="coin-cap">${formatMarketCap(coin.market_cap)}</div>
            </div>
            <div class="coin-metrics">
                <div class="metric">
                    <span class="metric-label">Traders</span>
                    <span class="metric-value">${coin.trader_count}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Trades</span>
                    <span class="metric-value">${coin.total_trades}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Volume</span>
                    <span class="metric-value">${formatSOL(coin.volume_sol)}</span>
                </div>
            </div>
            <div class="coin-actions">
                <button class="view-traders-btn" onclick="showCoinTraders('${coin.token_mint}')">
                    <i class="fas fa-users"></i>
                    View Traders
                </button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = coinsHTML;
}

// Форматирование market cap
function formatMarketCap(cap) {
    if (!cap) return 'N/A';
    if (cap >= 1000000) return `$${(cap / 1000000).toFixed(1)}M`;
    if (cap >= 1000) return `$${(cap / 1000).toFixed(1)}K`;
    return `$${cap.toFixed(0)}`;
}

// Форматирование SOL значений
function formatSOL(amount) {
    if (!amount && amount !== 0) return '0 SOL';
    
    // Преобразуем в число если это строка
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    
    if (isNaN(numAmount)) return '0 SOL';
    if (numAmount >= 1000) return `${(numAmount / 1000).toFixed(1)}K SOL`;
    if (numAmount >= 1) return `${numAmount.toFixed(2)} SOL`;
    return `${numAmount.toFixed(4)} SOL`;
}

// Форматирование времени (X минут/часов назад)
function formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDay}d ago`;
}

// Показать трейдеров для конкретной монеты
function showCoinTraders(tokenMint) {
    const coinCard = document.querySelector(`[data-contract="${tokenMint}"]`);
    if (!coinCard) return;
    
    // Показываем loading в кнопке
    const button = coinCard.querySelector('.view-traders-btn');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    
    fetch(`/api/coins/traders/${tokenMint}`)
        .then(res => res.json())
        .then(data => {
            button.innerHTML = originalText; // Восстанавливаем кнопку
            
            if (data.success && data.data.length > 0) {
                // Создаем выпадающий список внутри карточки
                showTradersDropdown(coinCard, data.data);
            } else {
                showTradersDropdown(coinCard, []);
            }
        })
        .catch(err => {
            console.error('Error fetching coin traders:', err);
            button.innerHTML = originalText;
            showTradersDropdown(coinCard, []);
        });
}

// Показать выпадающий список трейдеров
function showTradersDropdown(coinCard, traders) {
    // Удаляем предыдущий dropdown если есть
    const existingDropdown = coinCard.querySelector('.traders-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
        return;
    }
    
    const dropdown = document.createElement('div');
    dropdown.className = 'traders-dropdown';
    
    if (traders.length === 0) {
        dropdown.innerHTML = `
            <div class="traders-header">
                <h4><i class="fas fa-users"></i> Traders</h4>
                <button class="close-dropdown" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="traders-content">
                <p class="no-traders">No traders found for this coin</p>
            </div>
        `;
    } else {
        const tradersHTML = traders.map(trader => `
            <div class="trader-item">
                <div class="trader-info">
                    <div class="trader-name">${trader.wallet_name || trader.wallet.substring(0, 8)}</div>
                    <div class="trader-amount">${formatSOL(trader.sol_spent)}</div>
                </div>
                <div class="trader-socials">
                    ${trader.wallet_telegram ? `<a href="${trader.wallet_telegram}" target="_blank" class="trader-social-link telegram"><i class="fab fa-telegram"></i></a>` : ''}
                    ${trader.wallet_twitter ? `<a href="${trader.wallet_twitter}" target="_blank" class="trader-social-link twitter"><i class="fab fa-twitter"></i></a>` : ''}
                </div>
            </div>
        `).join('');
        
        dropdown.innerHTML = `
            <div class="traders-header">
                <h4><i class="fas fa-users"></i> Traders (${traders.length})</h4>
                <button class="close-dropdown" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="traders-content">
                ${tradersHTML}
            </div>
        `;
    }
    
    coinCard.appendChild(dropdown);
}

// Обработчики фильтров для Coins tab
function initCoinsFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const timeButtons = document.querySelectorAll('.time-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Get current active period
            const activeTimeBtn = document.querySelector('.time-btn.active');
            const currentPeriod = activeTimeBtn ? activeTimeBtn.dataset.period : '24h';
            
            // Get new cap filter
            const capFilter = btn.dataset.cap;
            
            // Reload data with new filter and current period
            loadCoinsData(capFilter, currentPeriod);
        });
    });
    
    timeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Get current active cap filter
            const activeFilterBtn = document.querySelector('.filter-btn.active');
            const currentCapFilter = activeFilterBtn ? activeFilterBtn.dataset.cap : 'low';
            
            // Get new period
            const period = btn.dataset.period;
            
            // Reload data with current cap filter and new period
            loadCoinsData(currentCapFilter, period);
        });
    });
}

// Загрузка данных Coins с фильтрами
async function loadCoinsData(capFilter = 'low', period = '24h') {
    try {
        // Update active states for filter buttons
        updateFilterButtonStates(capFilter, period);
        
        const params = new URLSearchParams();
        if (capFilter && capFilter !== 'all') {
            params.append('cap', capFilter);
        }
        params.append('period', period);
        
        const response = await fetch(`/api/coins/market?${params}`);
        const data = await response.json();
        
        if (data.success) {
            renderCoins(data.data);
        } else {
            console.error('Coins API error:', data.error);
            renderCoins([]);
        }
    } catch (error) {
        console.error('Error loading coins data:', error);
        renderCoins([]);
    }
}

// Update filter button active states
function updateFilterButtonStates(capFilter, period) {
    // Update cap filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.cap === capFilter) {
            btn.classList.add('active');
        }
    });
    
    // Update time filter buttons
    const timeButtons = document.querySelectorAll('.time-btn');
    timeButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.period === period) {
            btn.classList.add('active');
        }
    });
}

// Функция рендеринга Trending Meta Words
function renderTrendingMeta(data) {
    const container = document.getElementById('trendingMetaData');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-fire"></i>
                <h3>No Trending Meta Words</h3>
                <p>No trending meta words found from Pump.fun</p>
            </div>`;
        return;
    }
    
    container.innerHTML = data.map((meta, index) => {
        const relatedTokens = meta.relatedTokens || [];
        const pumpFunUrl = meta.pumpFunUrl || `https://pump.fun/search?q=${encodeURIComponent(meta.word)}`;
        
        return `
            <div class="data-item trending-meta-item">
                <div class="meta-header">
                    <div class="meta-word">
                        <i class="fas fa-fire"></i>
                        <span class="word-text">${meta.word || 'Unknown'}</span>
                    </div>
                    <div class="meta-stats">
                        <span class="trending-badge">🔥 TRENDING</span>
                    </div>
                </div>
                
                <div class="meta-details">
                    <div class="detail-row">
                        <span class="detail-label">Search:</span>
                        <a href="${pumpFunUrl}" target="_blank" class="detail-value link">
                            <i class="fas fa-external-link-alt"></i> View on Pump.fun
                        </a>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Related Tokens:</span>
                        <span class="detail-value">${relatedTokens.length} found</span>
                    </div>
                </div>
                
                ${relatedTokens.length > 0 ? `
                    <div class="related-tokens">
                        <h4><i class="fas fa-coins"></i> Related Tokens:</h4>
                        <div class="tokens-grid">
                            ${relatedTokens.map(token => `
                                <div class="token-card">
                                    <div class="token-info">
                                        <div class="token-symbol">${token.symbol || token.address?.substring(0, 8) || 'Unknown'}</div>
                                        <div class="token-name">${token.name || 'Unknown Token'}</div>
                                    </div>
                                    <div class="token-actions">
                                        <a href="https://pump.fun/coin/${token.address}" target="_blank" class="action-button small">
                                            <i class="fas fa-external-link-alt"></i>
                                        </a>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="item-actions">
                    <a href="${pumpFunUrl}" target="_blank" class="action-button">
                        <i class="fas fa-fire"></i> View on Pump.fun
                    </a>
                </div>
            </div>
        `;
    }).join('');
}

// Запуск приложения после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
