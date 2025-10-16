// === VERSION & CACHE CONTROL ===
const APP_VERSION = '1.4.2';

// Force clear old Service Worker and caches on version change
(function() {
    const lastVersion = localStorage.getItem('app_version');
    if (lastVersion !== APP_VERSION) {
        console.log(`🔄 Version changed: ${lastVersion} → ${APP_VERSION}`);
        
        // Clear Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => {
                regs.forEach(reg => {
                    reg.unregister();
                    console.log('🗑️ Service Worker removed');
                });
            });
        }
        
        // Clear all caches
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    caches.delete(name);
                    console.log(`🗑️ Cache deleted: ${name}`);
                });
            });
        }
        
        localStorage.setItem('app_version', APP_VERSION);
        console.log(`✅ Updated to version ${APP_VERSION}`);
    }
})();

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
const REFRESH_INTERVAL = 60000; // 60 seconds (reduced load on DB)
const API_TIMEOUT = 15000; // 15 seconds (more time for slow responses)

// Global variables
let currentTab = 'about';
let refreshTimer = null;
let isLoading = false;
let subscriptionStatus = null;
let availableTiers = [];
let currentUserId = null;
let loadedTabs = new Set(); // Для отслеживания загруженных вкладок (Lazy Loading)

// Tab to API endpoint mapping
const TAB_API_MAP = {
    'about': null, // Special tab without API
    'dashboard': null, // Dashboard tab without API
    'analytics': null, // Analytics tab without API
    'portfolio': 'traders/list', // Portfolio tab API endpoint  
    'liveSignals': null, // Live Signals - merged tab (special handling)
    'clusterBuy': 'clusterbuy',
    'whaleMoves': 'whalemoves', 
    'volumeSurge': 'volumesurge',
    'coBuy': 'cobuy',
    'smartMoney': 'smartmoney',
    'freshTokens': 'freshtokens',
    'topGainers': 'topgainers',
    'coins': 'coins/market', // Coins tab API endpoint
    'recentActivity': 'recentactivity', // Recent Activity tab API endpoint
    'trendingMeta': 'pump/trending-meta', // Trending Meta Words tab API endpoint
    'walletStats': null // Special tab without direct API
};

// Rendering functions mapping
const TAB_RENDER_MAP = {
    'about': null, // Special tab without rendering
    'dashboard': null, // Dashboard tab without rendering
    'analytics': null, // Analytics tab without rendering
    'portfolio': renderPortfolio, // Portfolio tab rendering function
    'liveSignals': renderLiveSignals, // NEW: Live Signals merged tab
    'clusterBuy': renderClusterBuy,
    'whaleMoves': renderWhaleMoves,
    'volumeSurge': renderVolumeSurge,
    'coBuy': renderCoBuy,
    'smartMoney': renderSmartMoney,
    'freshTokens': renderFreshTokens,
    'topGainers': renderTopGainers,
    'coins': renderCoins, // Coins tab rendering function
    'recentActivity': renderRecentActivity, // Recent Activity tab rendering function
    'trendingMeta': renderTrendingMeta, // Trending Meta Words tab rendering function
    'walletStats': null // Special tab with custom handling
};

// Инициализация Telegram Web App
function initTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        
        console.log('📱 Telegram Web App detected');
        console.log('Platform:', tg.platform);
        console.log('User:', tg.initDataUnsafe?.user);
        
        // Theme setup
        if (tg.themeParams) {
            document.body.classList.add('telegram-theme');
        }
        
        // Ready and expand to full screen
        tg.ready();
        tg.expand();
        console.log('📱 Full-screen mode enabled');
        
        // Enable closing confirmation
        tg.enableClosingConfirmation();
        console.log('⚠️ Closing confirmation enabled');
        
        // Request fullscreen (Telegram 8.0+)
        if (tg.requestFullscreen) {
            tg.requestFullscreen();
            console.log('📱 Fullscreen requested');
        }
        
        // Set theme colors for better integration
        tg.setHeaderColor('#1a1a1a');
        tg.setBackgroundColor('#0a0a0a');
        console.log('🎨 Theme colors set');
        
        // NO FULLSCREEN TOGGLE BUTTON - stays fullscreen always
        
        // Main button setup (optional)
        tg.MainButton.hide();
        
        // Back button setup (optional)
        tg.BackButton.hide();
        
        // Handle back button
        tg.onEvent('backButtonClicked', () => {
            console.log('⬅️ Back button clicked');
            // Close modals or navigate back
            const modals = document.querySelectorAll('.modal.show');
            if (modals.length > 0) {
                const lastModal = modals[modals.length - 1];
                lastModal.classList.remove('show');
            }
        });
        
        // Handle main button click
        tg.onEvent('mainButtonClicked', () => {
            console.log('🔘 Main button clicked');
            // Handle main button action
        });
        
        console.log('✅ Telegram Web App features initialized');
        
        // Initialize PWA features
        initializePWA();
        
        // Set current user ID for subscription system
        const user = tg.initDataUnsafe?.user;
        if (user) {
            currentUserId = user.id;
            console.log('Current user ID set:', currentUserId);
            
            // Update user data in database
            updateUserData(user);
        }
        
        return tg;
    }
    console.log('Telegram Web App not available (development outside Telegram)');
    return null;
}

// Initialize PWA features
function initializePWA() {
    // FORCE UNREGISTER Service Worker (makes app offline)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            if (registrations.length > 0) {
                console.log(`🗑️ Removing ${registrations.length} Service Worker(s)...`);
                for (let registration of registrations) {
                    registration.unregister().then(success => {
                        if (success) {
                            console.log('✅ Service Worker unregistered successfully');
                        }
                    });
                }
                
                // Clear all caches
                if ('caches' in window) {
                    caches.keys().then(names => {
                        for (let name of names) {
                            caches.delete(name);
                            console.log(`🗑️ Cache deleted: ${name}`);
                        }
                    });
                }
            } else {
                console.log('✅ No Service Workers found');
            }
        });
    }
    
    console.log('✅ PWA disabled - using real-time API only');
    
    // Handle PWA install prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('📱 PWA install prompt available');
        e.preventDefault();
        deferredPrompt = e;
        showInstallPrompt();
    });
    
    // Handle PWA installed
    window.addEventListener('appinstalled', () => {
        console.log('✅ PWA installed successfully');
        hideInstallPrompt();
    });
    
    // Check if app is running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
        console.log('🏠 Running as PWA');
        document.body.classList.add('pwa-mode');
    }
}

// Show PWA install prompt
function showInstallPrompt() {
    // Create install button
    const installButton = document.createElement('button');
    installButton.id = 'pwa-install-btn';
    installButton.innerHTML = `
        <i class="fas fa-download"></i>
        <span>Install App</span>
    `;
    installButton.className = 'pwa-install-button';
    
    // Add to header
    const header = document.querySelector('.app-header');
    if (header) {
        header.appendChild(installButton);
        
        // Handle click
        installButton.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log('📱 Install prompt outcome:', outcome);
                deferredPrompt = null;
                hideInstallPrompt();
            }
        });
    }
}

// Hide PWA install prompt
function hideInstallPrompt() {
    const installButton = document.getElementById('pwa-install-btn');
    if (installButton) {
        installButton.remove();
    }
}

// Show update notification
function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
        <div class="update-content">
            <i class="fas fa-sync-alt"></i>
            <span>New version available!</span>
            <button onclick="window.location.reload()">Update</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        notification.remove();
    }, 10000);
}

// REMOVED: addFullscreenToggle function
// Fullscreen is automatic, no toggle needed

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
                        <div class="icon token-icon">
                            <img src="${item.image || '/img/token-placeholder.png'}" alt="${item.symbol || 'UNKNOWN'}" class="token-avatar" onerror="this.src='/img/token-placeholder.png'">
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
                    <button class="action-button secondary" onclick="showTokenDetails('${item.token_mint}', '${item.symbol || 'UNKNOWN'}', '${(item.name || 'Unknown Token').replace(/'/g, "\\'")}')">
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
                    <img src="${item.image || '/img/token-placeholder.png'}" alt="${tokenSymbol}" class="token-avatar" onerror="this.src='/img/token-placeholder.png'">
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
                    <button class="action-button secondary" onclick="showTokenDetails('${item.token_mint}', '${tokenSymbol}', '${tokenName.replace(/'/g, "\\'")}')">
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
                    <img src="${item.image || '/img/token-placeholder.png'}" alt="${item.symbol || 'UNKNOWN'}" class="token-avatar" onerror="this.src='/img/token-placeholder.png'">
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
                    <a href="${pumpUrl}" target="_blank" class="action-button">
                        <i class="fas fa-external-link-alt"></i> Pump.fun
                    </a>
                    <a href="${dexUrl}" target="_blank" class="action-button secondary">
                        <i class="fas fa-chart-line"></i> DexScreener
                    </a>
                </div>
            </div>
        `;
    }).join('');
}

// Рендеринг Smart Money данных
function renderSmartMoney(data) {
    const container = document.getElementById('smartMoneyData');
    const counter = document.getElementById('smartMoneyCounter');
    
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-brain"></i>
                <h3>No Smart Money Activity</h3>
                <p>No trader activity detected in the last 30 days</p>
            </div>`;
        if (counter) counter.textContent = 'Showing 0 traders';
        return;
    }
    
    // Update counter
    if (counter) {
        counter.textContent = `Showing ${data.length} trader${data.length !== 1 ? 's' : ''}`;
    }
    
    container.innerHTML = data.map((trader, index) => {
        const walletShort = trader.wallet.substring(0, 4) + '...' + trader.wallet.substring(trader.wallet.length - 4);
        const traderName = trader.name || trader.wallet_name || `Trader ${walletShort}`;
        
        // Calculate metrics
        const roi = trader.roi_percentage || 0;
        const winRate = trader.win_rate || 0;
        const pnl = trader.realized_pnl || 0;
        const sellCount = trader.sell_count || 0;
        const hasRealizedPnL = sellCount > 0;
        
        // Determine category badge
        let categoryBadge = '';
        let categoryClass = '';
        
        if (hasRealizedPnL && roi > 100 && winRate > 70) {
            categoryBadge = '🧠 Smart';
            categoryClass = 'badge-smart';
        } else if (trader.total_volume > 100) {
            categoryBadge = '👑 Whale';
            categoryClass = 'badge-whale';
        } else if (hasRealizedPnL && winRate > 60) {
            categoryBadge = '🎯 Sniper';
            categoryClass = 'badge-sniper';
        } else if (!hasRealizedPnL) {
            categoryBadge = '💎 Holder';
            categoryClass = 'badge-holder';
        } else {
            categoryBadge = '📊 Active';
            categoryClass = 'badge-active';
        }
        
        // Determine if trader is profitable
        const isProfitable = pnl > 0;
        const pnlClass = isProfitable ? 'positive' : (pnl < 0 ? 'negative' : 'neutral');
        const roiClass = roi > 0 ? 'positive' : (roi < 0 ? 'negative' : 'neutral');
        
        return `
            <div class="data-item">
                <div class="data-header">
                    <div class="data-title">
                        <span class="rank-badge">#${index + 1}</span>
                        <span class="trader-name">${traderName}</span>
                    </div>
                    <div class="token-badges">
                        <span class="token-badge ${categoryClass}">${categoryBadge}</span>
                        ${isProfitable ? '<span class="token-badge badge-hot">🔥 Profit</span>' : ''}
                    </div>
                </div>
                
                <div class="token-info-compact">
                    <div class="info-row">
                        <span class="info-label">Wallet</span>
                        <span class="contract-address" onclick="copyToClipboard('${trader.wallet}', this)">${walletShort}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Buys</span>
                        <span class="info-value positive">${trader.buy_count || trader.total_trades || 0}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Sells</span>
                        <span class="info-value ${sellCount > 0 ? 'neutral' : 'muted'}">${sellCount}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Avg Buy</span>
                        <span class="info-value">${formatSOL(trader.avg_buy_size || 0)}</span>
                    </div>
                </div>
                
                <div class="token-info-compact">
                    <div class="info-row">
                        <span class="info-label">Volume</span>
                        <span class="info-value">${formatSOL(trader.total_volume || 0)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Trades</span>
                        <span class="info-value">${trader.total_trades || 0}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Tokens</span>
                        <span class="info-value">${trader.unique_tokens || 0}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Last Active</span>
                        <span class="info-value">${formatTimeAgo(new Date(trader.last_activity))}</span>
                    </div>
                </div>
                
                <div class="item-actions">
                    <a href="https://solscan.io/account/${trader.wallet}" target="_blank" class="action-button">
                        <i class="fas fa-external-link-alt"></i> Solscan
                    </a>
                    ${trader.telegram || trader.wallet_telegram ? `
                    <a href="${trader.telegram || trader.wallet_telegram}" target="_blank" class="action-button">
                        <i class="fab fa-telegram"></i> Telegram
                    </a>
                    ` : ''}
                    ${trader.twitter || trader.wallet_twitter ? `
                    <a href="${trader.twitter || trader.wallet_twitter}" target="_blank" class="action-button">
                        <i class="fab fa-twitter"></i> Twitter
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
    const counter = document.getElementById('freshTokenCounter');
    
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-seedling"></i>
                <h3>No New Tokens</h3>
                <p>No new tokens with activity appeared in the selected period</p>
            </div>`;
        if (counter) counter.querySelector('span').textContent = 'Showing 0 tokens';
        return;
    }
    
    // Update counter
    if (counter) {
        counter.querySelector('span').textContent = `Showing ${data.length} token${data.length === 1 ? '' : 's'}`;
    }
    
    // Apply sorting with direction
    const sortedData = [...data];
    const direction = freshFilters.sortDirection === 'desc' ? -1 : 1;
    
    if (freshFilters.sort === 'mcap') {
        sortedData.sort((a, b) => direction * (parseFloat(b.market_cap || 0) - parseFloat(a.market_cap || 0)));
    } else if (freshFilters.sort === 'volume') {
        sortedData.sort((a, b) => direction * (parseFloat(b.total_volume || 0) - parseFloat(a.total_volume || 0)));
    } else if (freshFilters.sort === 'age') {
        sortedData.sort((a, b) => {
            const timeA = new Date(a.first_seen).getTime();
            const timeB = new Date(b.first_seen).getTime();
            return direction * (timeB - timeA);
        });
    }
    
    container.innerHTML = sortedData.map((item, index) => {
        const pumpUrl = `https://pump.fun/coin/${item.token_mint}`;
        const timeSinceCreation = new Date() - new Date(item.first_seen);
        const minutesAgo = Math.floor(timeSinceCreation / (1000 * 60));
        const hoursAgo = Math.floor(minutesAgo / 60);
        
        const tokenSymbol = item.symbol || item.token_mint.substring(0, 8);
        const tokenName = item.name || 'Unknown Token';
        const marketCap = item.market_cap ? `$${formatNumber(item.market_cap)}` : 'N/A';
        const txCount = item.tx_count || 0;
        
        // Badges logic
        let badges = '';
        if (minutesAgo < 10) badges += '<span class="token-badge badge-new">🆕 New</span>';
        if (parseFloat(item.total_volume || 0) > 50) badges += '<span class="token-badge badge-hot">🔥 Hot</span>';
        if (item.early_buyers > 20) badges += '<span class="token-badge badge-trending">📈 Trending</span>';
        
        // Age display
        const ageText = hoursAgo > 0 ? `${hoursAgo}h ${minutesAgo % 60}m ago` : `${minutesAgo}m ago`;
        
        return `
            <div class="data-item fresh-item">
                <div class="data-header">
                    <h3>
                        <img src="${item.image || '/img/token-placeholder.png'}" alt="${tokenSymbol}" class="token-avatar" onerror="this.src='/img/token-placeholder.png'">
                        ${index + 1}. ${tokenSymbol} - ${tokenName}
                    </h3>
                    <div class="token-badges">${badges}</div>
                </div>
                <div class="item-stats">
                    <div class="stat-item">
                        <div class="stat-label">Market Cap</div>
                        <div class="stat-value positive">${marketCap}</div>
                    </div>
                    <div class="stat-item stat-clickable" onclick="showEarlyBuyers('${item.token_mint}', '${tokenSymbol}', '${tokenName.replace(/'/g, "\\'")}')" title="Click to see buyers list">
                        <div class="stat-label">Early Buyers</div>
                        <div class="stat-value positive">${item.early_buyers || 0} <i class="fas fa-users" style="font-size: 10px; opacity: 0.7;"></i></div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Volume</div>
                        <div class="stat-value neutral">${formatSOL(item.total_volume)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">TX Count</div>
                        <div class="stat-value">${txCount}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Age</div>
                        <div class="stat-value">${ageText}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Contract</div>
                        <div class="stat-value contract-address" onclick="copyToClipboard('${item.token_mint}', this)" title="Tap to copy">
                            ${item.token_mint.substring(0, 6)}...${item.token_mint.substring(item.token_mint.length - 4)}
                            <i class="fas fa-copy" style="margin-left: 4px; opacity: 0.5;"></i>
                        </div>
                    </div>
                </div>
                <div class="item-actions">
                    <a href="${pumpUrl}" target="_blank" class="action-button pump-button">
                        <i class="fas fa-external-link-alt"></i> Pump.fun
                    </a>
                    <button class="action-button secondary" onclick="showTokenDetails('${item.token_mint}', '${tokenSymbol}', '${tokenName.replace(/'/g, "\\'")}')">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Рендеринг Top Gainers данных
function renderTopGainers(data) {
    const container = document.getElementById('topGainersData');
    const counter = document.getElementById('topGainersCounter');
    
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-trophy"></i>
                <h3>No Top Gainers</h3>
                <p>No tokens with volume over 100 SOL detected in the last hour</p>
            </div>`;
        if (counter) counter.querySelector('span').textContent = 'Showing 0 tokens';
        return;
    }
    
    // Update counter
    if (counter) {
        counter.querySelector('span').textContent = `Showing ${data.length} token${data.length === 1 ? '' : 's'}`;
    }
    
    container.innerHTML = data.map((item, index) => {
        const pumpUrl = `https://pump.fun/coin/${item.token_mint}`;
        const dexUrl = `https://dexscreener.com/solana/${item.token_mint}`;
        const tokenSymbol = item.symbol || item.token_mint.substring(0, 8);
        const tokenName = item.name || 'Unknown Token';
        const marketCap = item.market_cap ? `$${formatNumber(item.market_cap)}` : 'N/A';
        
        // Badges logic
        let badges = '';
        if (parseFloat(item.total_volume || 0) > 100) badges += '<span class="token-badge badge-hot">🔥 High Volume</span>';
        if (item.total_buyers > 50) badges += '<span class="token-badge badge-trending">📈 Popular</span>';
        if (parseFloat(item.largest_buy || 0) > 50) badges += '<span class="token-badge badge-new">🐋 Whale Buy</span>';
        
        return `
            <div class="data-item">
                <div class="data-header">
                    <h3>
                        <img src="${item.image || '/img/token-placeholder.png'}" alt="${tokenSymbol}" class="token-avatar" onerror="this.src='/img/token-placeholder.png'">
                        ${index + 1}. ${tokenSymbol} - ${tokenName}
                    </h3>
                    <div class="token-badges">${badges}</div>
                </div>
                <div class="item-stats">
                    <div class="stat-item">
                        <div class="stat-label">Market Cap</div>
                        <div class="stat-value positive">${marketCap}</div>
                    </div>
                    <div class="stat-item stat-clickable" onclick="showEarlyBuyers('${item.token_mint}', '${tokenSymbol}', '${tokenName.replace(/'/g, "\\'")}')" title="Click to see buyers list">
                        <div class="stat-label">Buyers</div>
                        <div class="stat-value positive">${item.total_buyers || 0} <i class="fas fa-users" style="font-size: 10px; opacity: 0.7;"></i></div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Total Volume</div>
                        <div class="stat-value neutral">${formatNumber(item.total_volume)} SOL</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Avg Buy</div>
                        <div class="stat-value">${formatNumber(item.avg_buy_size)} SOL</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Largest Buy</div>
                        <div class="stat-value positive">${formatNumber(item.largest_buy)} SOL</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Contract</div>
                        <div class="stat-value contract-address" onclick="copyToClipboard('${item.token_mint}', this)" title="Tap to copy">
                            ${item.token_mint.substring(0, 6)}...${item.token_mint.substring(item.token_mint.length - 4)}
                            <i class="fas fa-copy" style="margin-left: 4px; opacity: 0.5;"></i>
                        </div>
                    </div>
                </div>
                <div class="item-actions">
                    <a href="${pumpUrl}" target="_blank" class="action-button pump-button">
                        <i class="fas fa-external-link-alt"></i> Pump.fun
                    </a>
                    <a href="${dexUrl}" target="_blank" class="action-button secondary">
                        <i class="fas fa-chart-line"></i> DexScreener
                    </a>
                    <button class="action-button secondary" onclick="showTokenDetails('${item.token_mint}', '${tokenSymbol}', '${tokenName.replace(/'/g, "\\'")}')">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Показ деталей токена в модальном окне
async function showTokenDetails(tokenMint, tokenSymbol, tokenName) {
    const modal = document.getElementById('tokenModal');
    const title = document.getElementById('modalTokenTitle');
    const content = document.getElementById('modalTokenContent');
    
    if (!modal || !title || !content) return;
    
    // Show token name if provided
    const displayName = tokenSymbol && tokenName 
        ? `${tokenSymbol} - ${tokenName}` 
        : shortenAddress(tokenMint);
    title.textContent = `Token Details: ${displayName}`;
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
        const totalSellVolume = sellTrades.reduce((sum, trade) => sum + parseFloat(trade.sol_received || 0), 0); // FIXED: use sol_received for SELL
        const uniqueBuyers = new Set(buyTrades.map(trade => trade.wallet)).size;
        const uniqueSellers = new Set(sellTrades.map(trade => trade.wallet)).size;
        
        content.innerHTML = `
            <div class="token-stats">
                <div class="stat-item">
                    <div class="stat-label">Contract Address</div>
                    <div class="stat-value contract-address" onclick="copyToClipboard('${tokenMint}', this)" title="Tap to copy" style="font-size: 0.9rem; word-break: break-all; cursor: pointer;">
                        ${tokenMint} <i class="fas fa-copy" style="margin-left: 4px; opacity: 0.5;"></i>
                    </div>
                </div>
                <div class="item-stats" style="margin: 1rem 0;">
                    <div class="stat-item">
                        <div class="stat-label">Buys (2h)</div>
                        <div class="stat-value positive">${buyTrades.length}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Sells (2h)</div>
                        <div class="stat-value negative">${sellTrades.length}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Buy Volume</div>
                        <div class="stat-value positive">${formatNumber(totalBuyVolume)} SOL</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Sell Volume</div>
                        <div class="stat-value negative">${formatNumber(totalSellVolume)} SOL</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Buyers</div>
                        <div class="stat-value">${uniqueBuyers}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Sellers</div>
                        <div class="stat-value">${uniqueSellers}</div>
                    </div>
                </div>
            </div>
            
            <h4 style="margin-top: 2rem; margin-bottom: 1rem;">Recent Transactions:</h4>
            <div style="max-height: 300px; overflow-y: auto;">
                ${tokenData.slice(0, 10).map(trade => `
                    <div class="data-item" style="margin-bottom: 0.5rem; padding: 0.75rem;">
                        <div class="item-stats">
                            <div class="stat-item">
                                <div class="stat-label">Type</div>
                                <div class="stat-value ${trade.side === 'BUY' ? 'positive' : 'negative'}">${trade.side}</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">Trader</div>
                                <div class="stat-value">${trade.wallet_name || shortenAddress(trade.wallet)}</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">SOL</div>
                                <div class="stat-value">${formatNumber(trade.side === 'BUY' ? trade.sol_spent : trade.sol_received)}</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">Time</div>
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

// Закрытие модального окна с анимацией
function closeTokenModal() {
    const modal = document.getElementById('tokenModal');
    if (modal) {
        // Добавляем класс closing для анимации
        modal.classList.add('closing');
        
        // Удаляем modal после анимации
        setTimeout(() => {
            modal.classList.remove('active');
            modal.classList.remove('closing');
        }, 300);
    }
}

// Show Early Buyers modal
async function showEarlyBuyers(tokenMint, tokenSymbol, tokenName) {
    const modal = document.getElementById('earlyBuyersModal');
    const title = document.getElementById('earlyBuyersTitle');
    const content = document.getElementById('earlyBuyersContent');
    
    if (!modal || !title || !content) return;
    
    // Show token name if provided
    const displayName = tokenSymbol && tokenName 
        ? `${tokenSymbol} - ${tokenName}` 
        : shortenAddress(tokenMint);
    title.textContent = `Early Buyers: ${displayName}`;
    content.innerHTML = '<div class="loading-placeholder">Loading buyers...</div>';
    
    modal.classList.add('active');
    
    // Initialize swipe for this modal
    initEarlyBuyersSwipe();
    
    try {
        const tokenData = await fetchData(`token/details/${tokenMint}`);
        
        if (!tokenData || tokenData.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No Buyers Data</h3>
                    <p>No buyer activity found for this token in the last 2 hours</p>
                </div>`;
            return;
        }
        
        // Get unique buyers with their purchase info
        const buyers = tokenData.filter(trade => trade.side === 'BUY');
        const buyerMap = {};
        
        buyers.forEach(trade => {
            const wallet = trade.wallet;
            if (!buyerMap[wallet]) {
                buyerMap[wallet] = {
                    wallet: wallet,
                    name: trade.wallet_name,
                    totalSpent: 0,
                    txCount: 0,
                    firstBuy: trade.ts
                };
            }
            buyerMap[wallet].totalSpent += parseFloat(trade.sol_spent || 0);
            buyerMap[wallet].txCount++;
            if (new Date(trade.ts) < new Date(buyerMap[wallet].firstBuy)) {
                buyerMap[wallet].firstBuy = trade.ts;
            }
        });
        
        // Convert to array and sort by total spent
        const buyersList = Object.values(buyerMap).sort((a, b) => b.totalSpent - a.totalSpent);
        
        content.innerHTML = `
            <div class="buyers-list">
                ${buyersList.map((buyer, index) => `
                    <div class="buyer-item">
                        <div class="buyer-rank">#${index + 1}</div>
                        <div class="buyer-info">
                            <div class="buyer-wallet contract-address" onclick="copyToClipboard('${buyer.wallet}', this)" title="Tap to copy">
                                ${buyer.name || shortenAddress(buyer.wallet)}
                                <i class="fas fa-copy" style="margin-left: 4px; opacity: 0.5; font-size: 10px;"></i>
                            </div>
                            <div class="buyer-stats">
                                <span class="buyer-spent">${formatSOL(buyer.totalSpent)}</span>
                                <span class="buyer-txs">${buyer.txCount} TX</span>
                                <span class="buyer-time">${formatTimeAgo(new Date(buyer.firstBuy))}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading early buyers:', error);
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>Failed to load buyers data</p>
            </div>`;
    }
}

// Close Early Buyers modal
function closeEarlyBuyersModal() {
    const modal = document.getElementById('earlyBuyersModal');
    if (modal) {
        modal.classList.add('closing');
        setTimeout(() => {
            modal.classList.remove('active');
            modal.classList.remove('closing');
        }, 300);
    }
}

// Click outside to close Early Buyers modal
function initEarlyBuyersSwipe() {
    const modal = document.getElementById('earlyBuyersModal');
    if (!modal) return;
    
    // Close on background click (removed swipe gestures for better scroll)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeEarlyBuyersModal();
        }
    });
}

// Swipe жесты для модальных окон (универсальная функция)
function initModalSwipe() {
    const modals = ['tokenModal', 'subscriptionModal', 'solanaPaymentModal'];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        const modalContent = modal.querySelector('.modal-content') || modal.querySelector('.subscription-modal-content');
        if (!modalContent) return;
        
        let startY = 0;
        let currentY = 0;
        let isDragging = false;
        
        // Проверяем, если это мобильное устройство
        const isMobile = window.innerWidth < 768;
        
        if (!isMobile) return; // Swipe только на мобильных
        
        modalContent.addEventListener('touchstart', (e) => {
            // Только если касание началось в верхней части модального окна
            const rect = modalContent.getBoundingClientRect();
            if (e.touches[0].clientY - rect.top < 50) {
                startY = e.touches[0].clientY;
                isDragging = true;
            }
        }, { passive: true });
        
        modalContent.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            
            // Только свайп вниз
            if (diff > 0) {
                modalContent.style.transform = `translateY(${diff}px)`;
                modalContent.style.transition = 'none';
                
                // Уменьшаем прозрачность фона
                const opacity = Math.max(0.3, 1 - (diff / 300));
                modal.style.backgroundColor = `rgba(0, 0, 0, ${opacity * 0.85})`;
            }
        }, { passive: true });
        
        modalContent.addEventListener('touchend', () => {
            if (!isDragging) return;
            
            const diff = currentY - startY;
            
            // Если свайп больше 100px, закрываем модальное окно
            if (diff > 100) {
                // Закрываем соответствующее модальное окно
                if (modalId === 'tokenModal') {
                    closeTokenModal();
                } else if (modalId === 'subscriptionModal') {
                    closeSubscriptionModal();
                } else if (modal.style) {
                    modal.style.display = 'none';
                }
            } else {
                // Возвращаем на место
                modalContent.style.transform = '';
                modalContent.style.transition = '';
                modal.style.backgroundColor = '';
            }
            
            isDragging = false;
            startY = 0;
            currentY = 0;
        });
    });
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

// Показать skeleton loader для контейнера
function showSkeletonLoader(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const skeletonHTML = `
        <div class="skeleton-container">
            ${Array(5).fill(0).map(() => `
                <div class="skeleton-card">
                    <div class="skeleton-row">
                        <div class="skeleton-avatar"></div>
                        <div class="skeleton-info">
                            <div class="skeleton-title"></div>
                            <div class="skeleton-subtitle"></div>
                        </div>
                    </div>
                    <div class="skeleton-stats">
                        <div class="skeleton-stat"></div>
                        <div class="skeleton-stat"></div>
                        <div class="skeleton-stat"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    container.innerHTML = skeletonHTML;
}

// Загрузка данных для текущей вкладки с Skeleton Loader
async function loadTabData(tabName) {
    if (isLoading) return;
    
    const endpoint = TAB_API_MAP[tabName];
    const renderFunction = TAB_RENDER_MAP[tabName];
    const dataContainerId = `${tabName}Data`;
    
    // Special handling for non-API tabs
    if (tabName === 'about' || tabName === 'dashboard' || tabName === 'analytics') {
        hideLoading();
        return;
    }
    
    // Special handling for Live Signals (merged tab)
    if (tabName === 'liveSignals') {
        await loadLiveSignalsData();
        return;
    }
    
    // Special handling for Coins tab with filters
    if (tabName === 'coins') {
        try {
            showLoading();
            showSkeletonLoader(dataContainerId); // Показываем skeleton
            await loadCoinsData(); // Load with current filters
            updateLastUpdateTime();
        } catch (error) {
            console.error(`Ошибка загрузки данных для ${tabName}:`, error);
            renderError(dataContainerId, error);
        } finally {
            hideLoading();
        }
        return;
    }
    
    // Special handling for Top Gainers with period filter
    if (tabName === 'topGainers') {
        try {
            showLoading();
            showSkeletonLoader(dataContainerId);
            await loadTopGainersData();
            updateLastUpdateTime();
        } catch (error) {
            console.error(`Ошибка загрузки данных для ${tabName}:`, error);
            renderError(dataContainerId, error);
        } finally {
            hideLoading();
        }
        return;
    }
    
    // Special handling for Smart Money with filters
    if (tabName === 'smartMoney') {
        try {
            showLoading();
            showSkeletonLoader(dataContainerId);
            await loadSmartMoneyData();
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
        showSkeletonLoader(dataContainerId); // Показываем skeleton перед загрузкой
        
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

// Переключение вкладки с Lazy Loading
function switchTab(tabName) {
    if (currentTab === tabName || isLoading) return;
    
    // Check access before switching
    if (!hasAccessToTab(tabName)) {
        const userTier = getUserTier();
        const tabLabel = document.querySelector(`[data-tab="${tabName}"] span`)?.textContent || tabName;
        
        if (userTier === 'free') {
            showUpgradePrompt(`"${tabLabel}" tab`);
        } else if (userTier === 'trial') {
            const daysLeft = subscriptionStatus?.trialDaysRemaining || 0;
            alert(`⏰ Your trial period has ended. Please subscribe to continue using premium features.`);
            showSubscriptionMenu();
        }
        return;
    }
    
    // Обновление активной вкладки в навигации с плавным переходом
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    const activeTabButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTabButton) {
        activeTabButton.classList.add('active');
    }
    
    // Обновление содержимого вкладок с плавной анимацией
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const activeTabContent = document.getElementById(tabName);
    if (activeTabContent) {
        // Добавляем небольшую задержку для плавного перехода
        setTimeout(() => {
            activeTabContent.classList.add('active');
        }, 50);
    }
    
    currentTab = tabName;
    
    // Запуск анимации цифр для About страницы
    if (tabName === 'about') {
        setTimeout(animateAboutNumbers, 300);
    }
    
    // Lazy Loading: загружаем данные только если вкладка еще не была загружена
    const shouldLoadData = !loadedTabs.has(tabName);
    
    if (shouldLoadData) {
        loadTabData(tabName).then(() => {
            loadedTabs.add(tabName); // Отмечаем вкладку как загруженную
            // Анимация карточек после загрузки данных
            setTimeout(animateCards, 100);
        });
    } else {
        // Если данные уже загружены, просто анимируем
        setTimeout(animateCards, 100);
    }
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
    // Calculate real performance based on PnL data
    const realizedPnl = trader.realized_pnl || 0;
    const totalVolumeSOL = trader.total_volume || 1; // Avoid division by zero
    const performancePct = (realizedPnl / totalVolumeSOL) * 100;
    
    const isActive = totalTrades > 0 && uniqueTokens > 0;
    const isProfitable = realizedPnl > 0;
    
    if (isActive && isProfitable) {
        card.classList.add('profitable');
    } else if (isActive && !isProfitable) {
        card.classList.add('lossy');
    } else {
        card.classList.add('neutral');
    }

    const symbol = trader.symbol || trader.name.charAt(0).toUpperCase();
    const shortAddress = trader.wallet.slice(0, 8) + '...' + trader.wallet.slice(-8);
    const lastActivity = trader.last_activity ? formatTimeAgo(new Date(trader.last_activity)) : 'Unknown';
    
    // Display real performance percentage
    const performanceValue = isProfitable ? `+${performancePct.toFixed(1)}%` : `${performancePct.toFixed(1)}%`;
    
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
    
    // Smart refresh: Update data without resetting scroll
    refreshTimer = setInterval(async () => {
        // Only refresh if:
        // 1. Not currently loading
        // 2. Page is visible
        // 3. Not in a modal or typing
        if (!isLoading && document.visibilityState === 'visible' && !document.activeElement.matches('input, textarea')) {
            console.log('🔄 Smart refresh: updating data in background...');
            
            // Save current scroll position
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            
            // Silent refresh - no skeleton loader, no loading indicator
            const endpoint = TAB_API_MAP[currentTab];
            const renderFunction = TAB_RENDER_MAP[currentTab];
            
            if (endpoint && renderFunction) {
                try {
                    const data = await fetchData(endpoint);
                    renderFunction(data);
                } catch (error) {
                    console.error('Silent refresh error:', error);
                }
            } else if (currentTab === 'coins') {
                await loadCoinsData();
            } else if (currentTab === 'topGainers') {
                await loadTopGainersData();
            } else if (currentTab === 'freshTokens') {
                await applyFreshFilters();
            }
            
            // Restore scroll position after data loads
            requestAnimationFrame(() => {
                window.scrollTo(0, scrollTop);
            });
        }
    }, REFRESH_INTERVAL);
    
    console.log('✅ Smart auto-refresh enabled (silent, preserves scroll position)');
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

// REMOVED: Duplicate initApp function

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
        // Сбрасываем статус загрузки для текущей вкладки, чтобы принудительно обновить
        loadedTabs.delete(currentTab);
        loadTabData(currentTab).then(() => {
            loadedTabs.add(currentTab);
        });
    }
}

// Обновление функции переключения вкладок

// Обработчик для refresh кнопки
function setupRefreshButtonHandler() {
    const refreshButton = document.querySelector('.refresh-button');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            refreshCurrentTab();
        });
    }
}

// REMOVED: Duplicate initApp function

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
                        <span class="detail-value">
                            <img src="${item.token_image || '/img/token-placeholder.png'}" alt="${tokenSymbol}" class="token-avatar-small" onerror="this.src='/img/token-placeholder.png'">
                            ${tokenSymbol} - ${tokenName}
                        </span>
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
                        <span class="detail-value">
                            <img src="${item.token_image || '/img/token-placeholder.png'}" alt="${tokenSymbol}" class="token-avatar-small" onerror="this.src='/img/token-placeholder.png'">
                            ${tokenSymbol} - ${tokenName}
                        </span>
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
                <div class="coin-avatar">
                    <img src="${coin.image || '/img/token-placeholder.png'}" alt="${coin.symbol || 'UNKNOWN'}" class="token-avatar" onerror="this.src='/img/token-placeholder.png'">
                </div>
                <div class="coin-info">
                    <div class="coin-ticker">$${coin.symbol || 'UNKNOWN'}</div>
                    <div class="coin-name">${coin.name || 'Unknown Token'}</div>
                    <div class="coin-cap">${formatMarketCap(coin.market_cap)}</div>
                </div>
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
                    <span class="metric-label">Buy Volume</span>
                    <span class="metric-value positive">${formatSOL(coin.buy_volume || 0)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Sell Volume</span>
                    <span class="metric-value negative">${formatSOL(coin.sell_volume || 0)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Net Volume</span>
                    <span class="metric-value">${formatSOL(coin.volume_sol)}</span>
                </div>
            </div>
            <div class="coin-actions">
                <button class="view-traders-btn" onclick="showCoinTraders('${coin.token_mint}')">
                    <i class="fas fa-users"></i>
                    View Traders (${coin.trader_count})
                </button>
                <a href="https://pump.fun/coin/${coin.token_mint}" target="_blank" class="action-button">
                    <i class="fas fa-external-link-alt"></i>
                    Pump.fun
                </a>
            </div>
            
            ${coin.top_traders && coin.top_traders.length > 0 ? `
            <div class="coin-traders-preview">
                <h4><i class="fas fa-users"></i> Top Traders</h4>
                <div class="traders-list">
                    ${coin.top_traders.slice(0, 3).map(trader => `
                        <div class="trader-item">
                            <div class="trader-wallet">${shortenAddress(trader.wallet)}</div>
                            <div class="trader-stats">
                                <span class="buy-volume">+${formatSOL(trader.buy_volume)}</span>
                                <span class="sell-volume">-${formatSOL(trader.sell_volume)}</span>
                                <span class="net-volume ${trader.net_volume >= 0 ? 'positive' : 'negative'}">
                                    ${trader.net_volume >= 0 ? '+' : ''}${formatSOL(trader.net_volume)}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
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

// Функция для расчета продолжительности между двумя датами
function calculateDuration(firstDate, lastDate) {
    const first = new Date(firstDate);
    const last = new Date(lastDate);
    const diffMs = last - first;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
    if (diffHours > 0) return `${diffHours}h ${diffMinutes % 60}m`;
    if (diffMinutes > 0) return `${diffMinutes}m`;
    return '< 1m';
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
// Coin Market Filters State
let marketFilters = {
    cap: 'low',
    volume: 'all',
    change: 'all',
    period: '24h'
};

function initCoinsFilters() {
    // Load saved filters
    const saved = localStorage.getItem('marketFilters');
    if (saved) {
        marketFilters = JSON.parse(saved);
    }
    
    const filterButtons = document.querySelectorAll('.market-filters .filter-btn');
    const timeButtons = document.querySelectorAll('.market-filters .time-btn');
    
    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filterType = btn.dataset.filter;
            const filterValue = btn.dataset.value;
            
            // Update active
            document.querySelectorAll(`[data-filter="${filterType}"]`).forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update state
            marketFilters[filterType] = filterValue;
            localStorage.setItem('marketFilters', JSON.stringify(marketFilters));
            
            // Apply
            applyMarketFilters();
        });
    });
    
    // Time buttons
    timeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const period = btn.dataset.period;
            
            // Update active
            timeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update state
            marketFilters.period = period;
            localStorage.setItem('marketFilters', JSON.stringify(marketFilters));
            
            // Apply
            applyMarketFilters();
        });
    });
    
    // Restore states
    restoreMarketFilterStates();
}

function restoreMarketFilterStates() {
    document.querySelectorAll('[data-filter="cap"]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === marketFilters.cap);
    });
    document.querySelectorAll('[data-filter="volume"]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === marketFilters.volume);
    });
    document.querySelectorAll('[data-filter="change"]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === marketFilters.change);
    });
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.period === marketFilters.period);
    });
}

async function applyMarketFilters() {
    showSkeletonLoader('coinsData');
    await loadCoinsData();
}

function resetMarketFilters() {
    marketFilters = { cap: 'low', volume: 'all', change: 'all', period: '24h' };
    localStorage.setItem('marketFilters', JSON.stringify(marketFilters));
    restoreMarketFilterStates();
    applyMarketFilters();
}

// === FRESH TOKENS FILTERS ===

let freshFilters = {
    age: '24h',  // Default to 24h instead of 1h
    freshCap: 'all',
    sort: 'age',  // age, mcap, volume
    sortDirection: 'desc'  // desc or asc
};

function initFreshTokensFilters() {
    // Load saved
    const saved = localStorage.getItem('freshFilters');
    if (saved) {
        freshFilters = JSON.parse(saved);
    }
    
    const filterButtons = document.querySelectorAll('.fresh-filters .filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filterType = btn.dataset.filter;
            const filterValue = btn.dataset.value;
            
            // For sort buttons, toggle direction if clicking the same button
            if (filterType === 'sort') {
                if (freshFilters.sort === filterValue) {
                    // Toggle direction
                    freshFilters.sortDirection = freshFilters.sortDirection === 'desc' ? 'asc' : 'desc';
                } else {
                    // New sort field, default to desc
                    freshFilters.sort = filterValue;
                    freshFilters.sortDirection = 'desc';
                }
                
                // Update button text with arrow
                updateSortButtonArrows();
            } else {
                // Regular filter
                freshFilters[filterType] = filterValue;
            }
            
            // Update active
            document.querySelectorAll(`[data-filter="${filterType}"]`).forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            localStorage.setItem('freshFilters', JSON.stringify(freshFilters));
            
            // Apply
            applyFreshFilters();
        });
    });
    
    // Restore states
    restoreFreshFilterStates();
    updateSortButtonArrows();
}

function updateSortButtonArrows() {
    document.querySelectorAll('[data-filter="sort"]').forEach(btn => {
        const value = btn.dataset.value;
        const isActive = freshFilters.sort === value;
        const arrow = freshFilters.sortDirection === 'desc' ? ' ↓' : ' ↑';
        
        // Update button text
        const baseText = {
            'age': 'Age',
            'mcap': 'Market Cap',
            'volume': 'Volume'
        }[value] || value;
        
        btn.innerHTML = baseText + (isActive ? arrow : '');
    });
}

function restoreFreshFilterStates() {
    document.querySelectorAll('[data-filter="age"]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === freshFilters.age);
    });
    document.querySelectorAll('[data-filter="freshCap"]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === freshFilters.freshCap);
    });
    document.querySelectorAll('[data-filter="sort"]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === freshFilters.sort);
    });
}

async function applyFreshFilters() {
    try {
        showSkeletonLoader('freshTokensData');
        
        // Fetch data
        const endpoint = 'freshtokens';
        const data = await fetchData(endpoint);
        
        if (!data || data.length === 0) {
            renderFreshTokens([]);
            return;
        }
        
        // Apply filters (optimized)
        let filteredData = data;
        
        // Age filter (always apply)
        const now = Date.now();
        const hoursMs = {
            '1h': 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000
        };
        const cutoff = now - (hoursMs[freshFilters.age] || hoursMs['24h']);
        
        filteredData = filteredData.filter(token => {
            const created = new Date(token.first_seen || token.created_at || token.timestamp).getTime();
            return created >= cutoff;
        });
        
        // Market cap filter
        if (freshFilters.freshCap !== 'all') {
            const capRanges = {
                'micro': [0, 10000],
                'small': [10000, 50000],
                'medium': [50000, Infinity]
            };
            const [min, max] = capRanges[freshFilters.freshCap] || [0, Infinity];
            
            filteredData = filteredData.filter(token => {
                const cap = parseFloat(token.market_cap || 0);
                return cap >= min && cap < max;
            });
        }
        
        renderFreshTokens(filteredData);
    } catch (error) {
        console.error('Error applying fresh filters:', error);
        renderFreshTokens([]);
    }
}

function resetFreshFilters() {
    freshFilters = { age: '24h', freshCap: 'all', sort: 'age', sortDirection: 'desc' };
    localStorage.setItem('freshFilters', JSON.stringify(freshFilters));
    restoreFreshFilterStates();
    updateSortButtonArrows();
    applyFreshFilters();
}

// === TOP GAINERS (MOST BOUGHT) FILTERS ===
let topGainersPeriod = '1h';

function initTopGainersFilters() {
    const saved = localStorage.getItem('topGainersPeriod');
    if (saved) topGainersPeriod = saved;
    
    const periodButtons = document.querySelectorAll('#topGainers [data-filter="period"]');
    periodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            topGainersPeriod = btn.dataset.value;
            localStorage.setItem('topGainersPeriod', topGainersPeriod);
            
            periodButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            loadTopGainersData();
        });
        
        // Restore active state
        btn.classList.toggle('active', btn.dataset.value === topGainersPeriod);
    });
}

async function loadTopGainersData() {
    try {
        showSkeletonLoader('topGainersData');
        const data = await fetchData(`topgainers?period=${topGainersPeriod}`);
        renderTopGainers(data);
    } catch (error) {
        console.error('Error loading top gainers:', error);
        renderTopGainers([]);
    }
}

// Smart Money Filters
let smartMoneyFilters = {
    period: '7d',
    sort: 'volume',
    sortDirection: 'desc'
};

function initSmartMoneyFilters() {
    const saved = localStorage.getItem('smartMoneyFilters');
    if (saved) {
        smartMoneyFilters = JSON.parse(saved);
    }
    
    const filterButtons = document.querySelectorAll('.smart-filters .filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const period = btn.dataset.period;
            const sort = btn.dataset.sort;
            
            if (period) {
                // Period filter
                smartMoneyFilters.period = period;
                
                // Update UI
                document.querySelectorAll('.smart-filters [data-period]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            } else if (sort) {
                // Sort filter - toggle direction
                if (smartMoneyFilters.sort === sort) {
                    smartMoneyFilters.sortDirection = smartMoneyFilters.sortDirection === 'desc' ? 'asc' : 'desc';
                } else {
                    smartMoneyFilters.sort = sort;
                    smartMoneyFilters.sortDirection = 'desc';
                }
                
                // Update UI
                document.querySelectorAll('.smart-filters [data-sort]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update arrow
                const arrow = smartMoneyFilters.sortDirection === 'desc' ? ' ↓' : ' ↑';
                btn.textContent = btn.textContent.split(' ')[0] + arrow;
            }
            
            // Save preferences
            localStorage.setItem('smartMoneyFilters', JSON.stringify(smartMoneyFilters));
            
            // Reload data with filters
            loadSmartMoneyData();
        });
        
        // Restore active state
        if (btn.dataset.period === smartMoneyFilters.period) {
            btn.classList.add('active');
        }
        if (btn.dataset.sort === smartMoneyFilters.sort) {
            btn.classList.add('active');
        }
    });
}

async function loadSmartMoneyData() {
    try {
        showSkeletonLoader('smartMoneyData');
        
        // Fetch data
        let data = await fetchData('traders/list');
        
        // Apply client-side sorting
        if (smartMoneyFilters.sort) {
            data = data.sort((a, b) => {
                let aVal, bVal;
                
                switch(smartMoneyFilters.sort) {
                    case 'roi':
                        aVal = a.roi_percentage || 0;
                        bVal = b.roi_percentage || 0;
                        break;
                    case 'winrate':
                        aVal = a.win_rate || 0;
                        bVal = b.win_rate || 0;
                        break;
                    case 'pnl':
                        aVal = a.realized_pnl || 0;
                        bVal = b.realized_pnl || 0;
                        break;
                    case 'volume':
                    default:
                        aVal = a.total_volume || 0;
                        bVal = b.total_volume || 0;
                }
                
                return smartMoneyFilters.sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
            });
        }
        
        renderSmartMoney(data);
    } catch (error) {
        console.error('Error loading smart money:', error);
        renderSmartMoney([]);
    }
}

// Загрузка данных Coins с фильтрами
async function loadCoinsData() {
    try {
        const params = new URLSearchParams();
        params.append('cap', marketFilters.cap);
        params.append('period', marketFilters.period);
        
        const response = await fetch(`/api/coins/market?${params}`);
        const data = await response.json();
        
        if (data.success) {
            // Apply client-side filters (volume, change)
            let filteredData = data.data || [];
            
            // Volume filter
            if (marketFilters.volume !== 'all') {
                filteredData = filteredData.filter(coin => {
                    const volume = parseFloat(coin.volume_24h || 0);
                    if (marketFilters.volume === 'low') return volume < 10;
                    if (marketFilters.volume === 'medium') return volume >= 10 && volume <= 100;
                    if (marketFilters.volume === 'high') return volume > 100;
                    return true;
                });
            }
            
            // Price change filter
            if (marketFilters.change !== 'all') {
                filteredData = filteredData.filter(coin => {
                    const change = parseFloat(coin.price_change_24h || 0);
                    if (marketFilters.change === 'gainers') return change > 5;
                    if (marketFilters.change === 'losers') return change < -5;
                    if (marketFilters.change === 'stable') return change >= -5 && change <= 5;
                    return true;
                });
            }
            
            renderCoins(filteredData);
        } else {
            console.error('Coins API error:', data.error);
            renderCoins([]);
        }
    } catch (error) {
        console.error('Error loading coins data:', error);
        renderCoins([]);
    }
}

// Old function - removed, using restoreMarketFilterStates() instead

// Функция рендеринга Wallet Stats (как на Kolscan)
function renderWalletStats(data) {
    const container = document.getElementById('walletStatsData');
    if (!container) return;
    
    if (!data || !data.wallet) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-wallet"></i>
                <h3>Enter Wallet Address</h3>
                <p>Enter a Solana wallet address to view detailed analytics and performance metrics</p>
            </div>`;
        return;
    }
    
    const { wallet, wallet_name, wallet_telegram, wallet_twitter, stats, token_pnl, metrics } = data;
    
    container.innerHTML = `
        <div class="wallet-profile">
            <div class="wallet-header">
                <div class="wallet-info">
                    <h3>
                        <i class="fas fa-wallet"></i>
                        ${wallet_name}
                        ${wallet_telegram ? `<a href="${wallet_telegram}" target="_blank" class="social-link telegram"><i class="fab fa-telegram"></i></a>` : ''}
                        ${wallet_twitter ? `<a href="${wallet_twitter}" target="_blank" class="social-link twitter"><i class="fab fa-twitter"></i></a>` : ''}
                    </h3>
                    <div class="wallet-address">${shortenAddress(wallet)}</div>
                </div>
                <div class="wallet-actions">
                    <a href="https://solscan.io/account/${wallet}" target="_blank" class="action-button">
                        <i class="fas fa-external-link-alt"></i> Solscan
                    </a>
                </div>
            </div>
            
            <div class="wallet-metrics">
                <div class="metric-card">
                    <div class="metric-label">Win Rate</div>
                    <div class="metric-value">${metrics.win_rate}%</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Avg Duration</div>
                    <div class="metric-value" title="Average time from buy to first sell">${metrics.avg_duration}m</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Top Win</div>
                    <div class="metric-value positive">+${formatSOL(metrics.top_win)}</div>
                </div>
                       <div class="metric-card">
                           <div class="metric-label">Volume</div>
                           <div class="metric-value">$${formatNumber(metrics.total_volume_usd)}</div>
                       </div>
                <div class="metric-card">
                    <div class="metric-label">Realized Profits</div>
                    <div class="metric-value ${metrics.realized_profits >= 0 ? 'positive' : 'negative'}">
                        ${metrics.realized_profits >= 0 ? '+' : ''}${formatSOL(metrics.realized_profits)}
                    </div>
                </div>
            </div>
            
            <div class="token-pnl-section">
                <h4><i class="fas fa-coins"></i> Token PnL</h4>
                <div class="token-pnl-list">
                    ${token_pnl.map(token => `
                        <div class="token-pnl-item">
                            <div class="token-info">
                                <div class="token-symbol">${token.symbol}</div>
                                <div class="token-name">${token.name}</div>
                            </div>
                                   <div class="token-stats">
                                       <div class="stat-row">
                                           <span class="stat-label">Bought:</span>
                                           <span class="stat-value">${formatSOL(token.total_bought_sol)}</span>
                                       </div>
                                       <div class="stat-row">
                                           <span class="stat-label">Sold:</span>
                                           <span class="stat-value">${formatSOL(token.total_sold_sol)}</span>
                                       </div>
                                       <div class="stat-row">
                                           <span class="stat-label">PnL:</span>
                                           <span class="stat-value ${token.pnl_sol >= 0 ? 'positive' : 'negative'}">
                                               ${token.pnl_sol >= 0 ? '+' : ''}${formatSOL(token.pnl_sol)}
                                           </span>
                                       </div>
                                       <div class="stat-row">
                                           <span class="stat-label">First Trade:</span>
                                           <span class="stat-value">${formatTimeAgo(new Date(token.first_trade))}</span>
                                       </div>
                                       <div class="stat-row">
                                           <span class="stat-label">Last Trade:</span>
                                           <span class="stat-value">${formatTimeAgo(new Date(token.last_trade))}</span>
                                       </div>
                                       <div class="stat-row">
                                           <span class="stat-label">Duration:</span>
                                           <span class="stat-value">${calculateDuration(token.first_trade, token.last_trade)}</span>
                                       </div>
                                   </div>
                            <div class="token-actions">
                                <a href="https://pump.fun/coin/${token.token_mint}" target="_blank" class="action-button small">
                                    <i class="fas fa-external-link-alt"></i>
                                </a>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
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

// Инициализация Wallet Stats
function initWalletStats() {
    const searchBtn = document.getElementById('searchWalletBtn');
    const walletInput = document.getElementById('walletAddressInput');
    const timeFilters = document.querySelectorAll('.time-btn');
    const traderTypeFilters = document.querySelectorAll('.trader-type-btn');
    
    let currentPeriod = '1d';
    let currentTraderType = 'all';
    
    // Загружаем всех трейдеров при открытии страницы
    loadTradersStats(currentPeriod, currentTraderType);
    
    // Обработчик поиска кошелька
    if (searchBtn && walletInput) {
        searchBtn.addEventListener('click', async () => {
            const address = walletInput.value.trim();
            if (!address) {
                alert('Please enter a wallet address');
                return;
            }
            
            try {
                showLoading();
                const response = await fetch(`/api/wallet/stats/${address}?period=${currentPeriod}`);
                const data = await response.json();
                
                if (data.success) {
                    renderWalletStats(data.data);
                } else {
                    document.getElementById('walletStatsData').innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-exclamation-triangle"></i>
                            <h3>Error</h3>
                            <p>${data.error || 'Failed to load wallet data'}</p>
                        </div>`;
                }
            } catch (error) {
                console.error('Wallet stats error:', error);
                document.getElementById('walletStatsData').innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Error</h3>
                        <p>Failed to load wallet data</p>
                    </div>`;
            } finally {
                hideLoading();
            }
        });
        
        walletInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchBtn.click();
            }
        });
    }
    
    // Обработчики фильтров по времени
    timeFilters.forEach(btn => {
        btn.addEventListener('click', () => {
            // Обновляем активную кнопку
            timeFilters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentPeriod = btn.dataset.period;
            
            // Если есть поисковый запрос, обновляем его
            if (walletInput.value.trim()) {
                searchBtn.click();
            } else {
                // Иначе загружаем всех трейдеров
                loadTradersStats(currentPeriod, currentTraderType);
            }
        });
    });
    
    // Обработчики фильтров по типу трейдеров
    traderTypeFilters.forEach(btn => {
        btn.addEventListener('click', () => {
            // Обновляем активную кнопку
            traderTypeFilters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentTraderType = btn.dataset.type;
            
            // Если есть поисковый запрос, обновляем его
            if (walletInput.value.trim()) {
                searchBtn.click();
            } else {
                // Иначе загружаем всех трейдеров
                loadTradersStats(currentPeriod, currentTraderType);
            }
        });
    });
}

// Функция для загрузки статистики всех трейдеров
async function loadTradersStats(period, traderType = 'all') {
    try {
        showLoading();
        const response = await fetch(`/api/traders/stats?period=${period}&type=${traderType}`);
        const data = await response.json();
        
        if (data.success) {
            const filteredData = filterTradersByType(data.data, traderType);
            renderTradersStats(filteredData, period, traderType);
        } else {
            document.getElementById('walletStatsData').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error</h3>
                    <p>${data.error || 'Failed to load traders data'}</p>
                </div>`;
        }
    } catch (error) {
        console.error('Traders stats error:', error);
        document.getElementById('walletStatsData').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>Failed to load traders data</p>
            </div>`;
    } finally {
        hideLoading();
    }
}

// Функция для фильтрации трейдеров по типу
function filterTradersByType(traders, traderType) {
    if (traderType === 'all') return traders;
    
    return traders.filter(trader => {
        const duration = trader.avg_duration;
        
        switch (traderType) {
            case 'sonic':
                return duration < 5; // < 5 минут
            case 'scalper':
                return duration >= 5 && duration <= 30; // 5-30 минут
            case 'day':
                return duration > 30 && duration <= 1440; // 1-24 часа (1440 минут)
            case 'swing':
                return duration > 1440 && duration <= 10080; // 1-7 дней (10080 минут)
            default:
                return true;
        }
    });
}

// Функция для отображения статистики всех трейдеров
function renderTradersStats(traders, period, traderType = 'all') {
    const container = document.getElementById('walletStatsData');
    if (!container) return;
    
    if (!traders || traders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No Active Traders</h3>
                <p>No trader activity found for the selected period and type</p>
            </div>`;
        return;
    }
    
    const periodText = {
        '1d': '1 Day',
        '3d': '3 Days',
        '7d': '7 Days',
        '14d': '14 Days',
        '30d': '30 Days'
    };
    
    const traderTypeText = {
        'all': 'All Traders',
        'sonic': 'SonicFast Traders (< 5m)',
        'scalper': 'Scalpers (5-30m)',
        'day': 'Day Traders (1-24h)',
        'swing': 'Swing Traders (1-7d)'
    };
    
    container.innerHTML = `
        <div class="traders-overview">
            <h3><i class="fas fa-chart-line"></i> ${traderTypeText[traderType]} - ${periodText[period]}</h3>
            <div class="traders-grid">
                ${traders.map((trader, index) => `
                    <div class="trader-card" onclick="analyzeTrader('${trader.wallet}')">
                        <div class="trader-header">
                            <div class="trader-rank">#${index + 1}</div>
                            <div class="trader-info">
                                <h4>${trader.wallet_name}</h4>
                                <div class="trader-address">${shortenAddress(trader.wallet)}</div>
                                ${trader.wallet_telegram || trader.wallet_twitter ? `
                                <div class="trader-socials">
                                    ${trader.wallet_telegram ? `<a href="${trader.wallet_telegram}" target="_blank" class="social-link telegram"><i class="fab fa-telegram"></i></a>` : ''}
                                    ${trader.wallet_twitter ? `<a href="${trader.wallet_twitter}" target="_blank" class="social-link twitter"><i class="fab fa-twitter"></i></a>` : ''}
                                </div>` : ''}
                            </div>
                        </div>
                        
                        <div class="trader-metrics">
                            <div class="metric-item">
                                <div class="metric-label">Win Rate</div>
                                <div class="metric-value">${trader.win_rate}%</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-label">Avg Duration</div>
                                <div class="metric-value" title="Average time from buy to first sell">${trader.avg_duration}m</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-label">Top Win</div>
                                <div class="metric-value positive">+${formatSOL(trader.realized_pnl)}</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-label">Volume</div>
                                <div class="metric-value">$${formatNumber(trader.total_volume_usd)}</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-label">Realized Profits</div>
                                <div class="metric-value ${trader.realized_pnl >= 0 ? 'positive' : 'negative'}">
                                    ${trader.realized_pnl >= 0 ? '+' : ''}${formatSOL(trader.realized_pnl)}
                                </div>
                            </div>
                        </div>
                        
                        <div class="trader-stats">
                            <div class="stat-item">
                                <span class="stat-label">Trades:</span>
                                <span class="stat-value">${trader.total_trades}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Tokens:</span>
                                <span class="stat-value">${trader.unique_tokens}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Last Active:</span>
                                <span class="stat-value">${formatTimeAgo(new Date(trader.last_trade))}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Функция для анализа конкретного трейдера
async function analyzeTrader(walletAddress) {
    const walletInput = document.getElementById('walletAddressInput');
    if (walletInput) {
        walletInput.value = walletAddress;
        document.getElementById('searchWalletBtn').click();
    }
}

// Запуск приложения после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// === ADMIN PANEL FUNCTIONS ===
const ADMIN_PASSWORD = '2110';

function initAdminPanel() {
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', handleAdminLogin);
    }
    
    // Add triple tap on header to show admin tab
    let tapCount = 0;
    let tapTimer = null;
    
    const header = document.querySelector('.app-header');
    if (header) {
        header.addEventListener('click', (e) => {
            if (e.target.closest('.header-controls')) return;
            
            tapCount++;
            if (tapCount === 3) {
                showAdminTab();
                tapCount = 0;
            } else {
                clearTimeout(tapTimer);
                tapTimer = setTimeout(() => {
                    tapCount = 0;
                }, 1000);
            }
        });
    }
}

function showAdminTab() {
    const adminTab = document.querySelector('.admin-tab');
    if (adminTab) {
        adminTab.style.display = 'flex';
        adminTab.scrollIntoView({ behavior: 'smooth' });
        console.log('Admin tab revealed');
    }
}

function handleAdminLogin(e) {
    e.preventDefault();
    
    const password = document.getElementById('adminPassword').value;
    
    if (password === ADMIN_PASSWORD) {
        document.getElementById('adminLogin').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
        loadAdminStats();
        console.log('Admin login successful');
    } else {
        alert('Invalid password!');
        document.getElementById('adminPassword').value = '';
    }
}

function loadAdminStats() {
    // Load subscription statistics
    fetch('/api/admin/stats')
        .then(response => response.json())
        .then(data => {
            document.getElementById('totalUsers').textContent = data.totalUsers || '0';
            document.getElementById('activeSubscriptions').textContent = data.activeSubscriptions || '0';
            document.getElementById('trialUsers').textContent = data.trialUsers || '0';
            document.getElementById('totalRevenue').textContent = data.totalRevenue || '0 SOL';
        })
        .catch(error => {
            console.error('Error loading admin stats:', error);
            // Set default values if API fails
            document.getElementById('totalUsers').textContent = '0';
            document.getElementById('activeSubscriptions').textContent = '0';
            document.getElementById('trialUsers').textContent = '0';
            document.getElementById('totalRevenue').textContent = '0 SOL';
        });
}

function updateKolscanSettings() {
    const discount = document.getElementById('kolscanDiscount').value;
    const minHold = document.getElementById('kolscanMinHold').value;
    
    const settings = {
        discount: parseInt(discount),
        minHold: parseInt(minHold)
    };
    
    fetch('/api/admin/kolscan-settings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('$KOLScan settings updated successfully!');
        } else {
            alert('Failed to update settings');
        }
    })
    .catch(error => {
        console.error('Error updating KOLScan settings:', error);
        alert('Error updating settings');
    });
}

function updateTierSettings() {
    const tiers = {
        basic: {
            price: parseFloat(document.getElementById('basicPrice').value),
            access: document.getElementById('basicAccess').value
        },
        pro: {
            price: parseFloat(document.getElementById('proPrice').value),
            access: document.getElementById('proAccess').value
        },
        premium: {
            price: parseFloat(document.getElementById('premiumPrice').value),
            access: document.getElementById('premiumAccess').value
        }
    };
    
    fetch('/api/admin/tier-settings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(tiers)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Subscription tiers updated successfully!');
        } else {
            alert('Failed to update tiers');
        }
    })
    .catch(error => {
        console.error('Error updating tier settings:', error);
        alert('Error updating tiers');
    });
}

function clearAllCache() {
    if (confirm('Are you sure you want to clear all cache? This will affect performance temporarily.')) {
        fetch('/api/admin/clear-cache', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Cache cleared successfully!');
            } else {
                alert('Failed to clear cache');
            }
        })
        .catch(error => {
            console.error('Error clearing cache:', error);
            alert('Error clearing cache');
        });
    }
}

function exportUserData() {
    fetch('/api/admin/export-data')
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pumpdex-users-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        })
        .catch(error => {
            console.error('Error exporting data:', error);
            alert('Error exporting data');
        });
}

function adminLogout() {
    document.getElementById('adminLogin').style.display = 'block';
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('adminPassword').value = '';
    console.log('Admin logged out');
}

// === SUBSCRIPTION SYSTEM FUNCTIONS ===

// Update user data in database
async function updateUserData(user) {
    try {
        if (!user || !user.id) return;
        
        const response = await fetch(`${BACKEND_URL}/api/user/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: user.id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name
            })
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('✅ User data updated:', data.user);
        } else {
            console.log('⚠️ Failed to update user data:', data.error);
        }
    } catch (error) {
        console.error('Error updating user data:', error);
    }
}

// Initialize subscription system
async function initSubscriptionSystem() {
    try {
        console.log('🔧 Initializing subscription system...');
        
        // Load subscription tiers
        await loadSubscriptionTiers();
        
        // Check user subscription status
        if (currentUserId) {
            await checkSubscriptionStatus();
        }
        
        console.log('✅ Subscription system initialized');
    } catch (error) {
        console.error('❌ Failed to initialize subscription system:', error);
    }
}

// Load available subscription tiers
async function loadSubscriptionTiers() {
    try {
        const response = await fetchWithTimeout(`${BACKEND_URL}/api/subscription/tiers`);
        const data = await response.json();
        
        if (data.success && data.tiers) {
            availableTiers = data.tiers;
            console.log('📋 Subscription tiers loaded:', availableTiers);
        } else {
            // Fallback to default tiers (same as backend)
            availableTiers = [
                {
                    tier_name: 'free',
                    price_sol: 0,
                    price_stars: 0,
                    duration_days: 5,
                    max_tabs: 2,
                    features: ['About', 'Analytics', '5-day trial']
                },
                {
                    tier_name: 'basic',
                    price_sol: 0.1,
                    price_stars: 100,
                    duration_days: 30,
                    max_tabs: null,
                    features: ['All tabs', '50 notifications/day', 'Priority support']
                },
                {
                    tier_name: 'pro',
                    price_sol: 0.25,
                    price_stars: 250,
                    duration_days: 30,
                    max_tabs: null,
                    features: ['All tabs', 'Unlimited notifications', 'Early access', 'Advanced analytics', 'Priority support']
                }
            ];
            console.log('📋 Using fallback subscription tiers');
        }
    } catch (error) {
        console.error('Error loading subscription tiers:', error);
        // Fallback to default tiers (same as backend)
        availableTiers = [
            {
                tier_name: 'free',
                price_sol: 0,
                price_stars: 0,
                duration_days: 5,
                max_tabs: 2,
                features: ['About', 'Analytics', '5-day trial']
            },
            {
                tier_name: 'basic',
                price_sol: 0.1,
                price_stars: 100,
                duration_days: 30,
                max_tabs: null,
                features: ['All tabs', '50 notifications/day', 'Priority support']
            },
            {
                tier_name: 'pro',
                price_sol: 0.25,
                price_stars: 250,
                duration_days: 30,
                max_tabs: null,
                features: ['All tabs', 'Unlimited notifications', 'Early access', 'Advanced analytics', 'Priority support']
            }
        ];
        console.log('📋 Using fallback subscription tiers due to error');
    }
}

// Check user subscription status
async function checkSubscriptionStatus() {
    try {
        if (!currentUserId) {
            console.log('No user ID available for subscription check');
            return;
        }
        
        const response = await fetchWithTimeout(`${BACKEND_URL}/api/subscription/status/${currentUserId}`);
        const data = await response.json();
        
        if (data.success) {
            subscriptionStatus = data;
            console.log('📊 Subscription status:', subscriptionStatus);
            
            // Check trial expiration
            if (subscriptionStatus.isTrial && subscriptionStatus.trialDaysRemaining !== undefined) {
                console.log(`⏰ Trial days remaining: ${subscriptionStatus.trialDaysRemaining}`);
            }
            
            // Show subscription UI if needed
            updateSubscriptionUI();
            
            // Apply access restrictions
            applyAccessRestrictions();
        } else {
            // Fallback: assume trial user
            subscriptionStatus = {
                user: { id: currentUserId },
                hasActiveSubscription: false,
                activeSubscription: null,
                isTrial: true,
                trialDaysRemaining: 5
            };
            console.log('📊 Using fallback subscription status (trial)');
        }
    } catch (error) {
        console.error('Error checking subscription status:', error);
        // Fallback: assume trial user
        subscriptionStatus = {
            user: { id: currentUserId },
            hasActiveSubscription: false,
            activeSubscription: null,
            isTrial: true,
            trialDaysRemaining: 5
        };
        console.log('📊 Using fallback subscription status due to error');
    }
}

// Access control configuration
const ACCESS_RULES = {
    free: {
        allowedTabs: ['about', 'dashboard', 'analytics', 'freshTokens', 'coins', 'admin'],
        maxTokensPerTab: 10,
        refreshInterval: 60000 // 1 minute
    },
    trial: {
        allowedTabs: ['about', 'dashboard', 'analytics', 'freshTokens', 'coins', 'smartMoney', 'clusterBuy', 'volumeSurge', 'coBuy', 'whaleMoves', 'topGainers', 'recentActivity', 'trendingMeta', 'portfolio', 'walletStats', 'admin'],
        maxTokensPerTab: 50,
        refreshInterval: 30000, // 30 seconds
        daysAllowed: 5
    },
    basic: {
        allowedTabs: ['about', 'dashboard', 'analytics', 'freshTokens', 'coins', 'smartMoney', 'clusterBuy', 'volumeSurge', 'coBuy', 'whaleMoves', 'topGainers', 'recentActivity', 'admin'],
        maxTokensPerTab: 100,
        refreshInterval: 30000
    },
    pro: {
        allowedTabs: 'all',
        maxTokensPerTab: 'unlimited',
        refreshInterval: 15000 // 15 seconds
    }
};

// Apply access restrictions based on subscription
function applyAccessRestrictions() {
    if (!subscriptionStatus) return;
    
    const userTier = getUserTier();
    const rules = ACCESS_RULES[userTier] || ACCESS_RULES.free;
    
    console.log(`🔐 Applying access restrictions for tier: ${userTier}`);
    
    // Lock/unlock tabs based on subscription
    document.querySelectorAll('.tab-button').forEach(button => {
        const tabName = button.dataset.tab;
        
        if (rules.allowedTabs === 'all' || rules.allowedTabs.includes(tabName)) {
            // Tab is allowed
            button.classList.remove('locked-tab');
            button.removeAttribute('disabled');
            button.style.pointerEvents = 'auto';
            
            // Remove lock icon if exists
            const existingLockIcon = button.querySelector('.lock-icon');
            if (existingLockIcon) {
                existingLockIcon.remove();
            }
        } else {
            // Tab is locked
            button.classList.add('locked-tab');
            button.setAttribute('disabled', 'true');
            button.style.pointerEvents = 'auto'; // Allow clicks for upgrade prompt
            
            // Add RED lock icon
            if (!button.querySelector('.lock-icon')) {
                const spanElement = button.querySelector('span');
                if (spanElement) {
                    const lockIcon = document.createElement('i');
                    lockIcon.className = 'fas fa-lock lock-icon';
                    spanElement.appendChild(lockIcon);
                }
            }
            
            // Add click handler for upgrade prompt
            button.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const tabLabel = button.querySelector('span').textContent.replace('🔒', '').trim();
                showUpgradePrompt(`"${tabLabel}" tab`);
            };
        }
    });
}

// Get user tier
function getUserTier() {
    if (!subscriptionStatus) return 'free';
    
    // Check if trial is expired
    if (subscriptionStatus.isTrial) {
        if (subscriptionStatus.trialDaysRemaining !== undefined && subscriptionStatus.trialDaysRemaining <= 0) {
            return 'free'; // Trial expired
        }
        return 'trial';
    }
    
    if (subscriptionStatus.hasActiveSubscription && subscriptionStatus.activeSubscription) {
        return subscriptionStatus.activeSubscription.tier_name || 'free';
    }
    
    return 'free';
}

// Check if user has access to a specific tab
function hasAccessToTab(tabName) {
    const userTier = getUserTier();
    const rules = ACCESS_RULES[userTier] || ACCESS_RULES.free;
    
    if (rules.allowedTabs === 'all') return true;
    return rules.allowedTabs.includes(tabName);
}

// Show upgrade prompt when user tries to access locked content
function showUpgradePrompt(feature = 'this feature') {
    // Check if running in Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
        // Running in Telegram - show subscription menu
        const message = `🔒 ${feature} is available for Premium subscribers.\n\nUpgrade now to unlock all features!`;
        
        if (confirm(message)) {
            showSubscriptionMenu();
        }
    } else {
        // Running in web browser - redirect to Telegram bot
        const message = `🔒 ${feature} is available for Premium subscribers.\n\nPlease open this app in Telegram to subscribe.\n\nClick OK to open Telegram bot.`;
        
        if (confirm(message)) {
            // Redirect to Telegram bot with subscribe command
            const botUsername = 'pumpfun_insights_bot'; // Replace with your bot username
            window.open(`https://t.me/${botUsername}?start=subscribe`, '_blank');
        }
    }
}

// Update subscription UI
function updateSubscriptionUI() {
    try {
        if (!subscriptionStatus) {
            console.log('No subscription status available for UI update');
            return;
        }
        
        const { user, hasActiveSubscription, activeSubscription } = subscriptionStatus;
        
        // Add subscription indicator to header
        const header = document.querySelector('.app-header');
        if (header && !header.querySelector('.subscription-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'subscription-indicator';
            indicator.style.cursor = 'pointer';
            indicator.title = hasActiveSubscription ? 'Manage subscription' : 'Upgrade subscription';
            
            if (hasActiveSubscription) {
                indicator.innerHTML = `
                    <i class="fas fa-crown"></i>
                    <span>${activeSubscription?.subscription_type?.toUpperCase() || 'PREMIUM'}</span>
                `;
                indicator.classList.add('premium');
            } else {
                const trialDays = subscriptionStatus.trialDaysRemaining || 0;
                if (subscriptionStatus.isTrial && trialDays > 0) {
                    indicator.innerHTML = `
                        <i class="fas fa-clock"></i>
                        <span>TRIAL (${trialDays}d)</span>
                        <i class="fas fa-arrow-up" style="margin-left: 0.25rem; font-size: 0.8rem;"></i>
                    `;
                    indicator.classList.add('trial');
                } else {
                    indicator.innerHTML = `
                        <i class="fas fa-lock"></i>
                        <span>FREE</span>
                        <i class="fas fa-arrow-up" style="margin-left: 0.25rem; font-size: 0.8rem;"></i>
                    `;
                    indicator.classList.add('free');
                }
            }
            
            // Add click handler
            indicator.addEventListener('click', () => {
                showSubscriptionMenu();
            });
            
            header.appendChild(indicator);
        }
    } catch (error) {
        console.error('Error updating subscription UI:', error);
    }
}

// Show subscription menu
function showSubscriptionMenu() {
    // Remove existing menu if any
    const existingMenu = document.querySelector('.subscription-menu');
    if (existingMenu) {
        existingMenu.remove();
        document.body.classList.remove('menu-open');
        return;
    }
    
    // Prevent body scroll
    document.body.classList.add('menu-open');
    
    // Create menu
    const menu = document.createElement('div');
    menu.className = 'subscription-menu';
    menu.innerHTML = `
        <div class="subscription-menu-header">
            <h3>💎 Choose Your Plan</h3>
            <button class="close-menu" onclick="closeSubscriptionMenu()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="subscription-info">
            <p class="security-info"><i class="fas fa-shield-alt"></i> Secure payment • 30-day money back guarantee</p>
            <p class="discount-info"><i class="fas fa-gift"></i> Hold $KOLScan token for 25% discount!</p>
        </div>
        <div class="subscription-plans-container">
            <div class="subscription-plans" id="subscriptionPlans">
                <div class="plan-card basic">
                    <div class="plan-header">
                        <h4>💎 Basic</h4>
                        <div class="plan-price">
                            <span class="price">0.01 SOL</span>
                            <span class="stars">~1 ⭐</span>
                        </div>
                    </div>
                    <ul class="plan-features">
                        <li><i class="fas fa-check"></i> All tabs access</li>
                        <li><i class="fas fa-check"></i> 50 notifications/day</li>
                        <li><i class="fas fa-check"></i> Priority support</li>
                        <li><i class="fas fa-check"></i> 30 days access</li>
                    </ul>
                    <div class="plan-buttons">
                        <button class="pay-btn stars-btn" onclick="payWithStars('basic')">
                            <i class="fas fa-star"></i> Pay with Stars
                        </button>
                        <button class="pay-btn sol-btn" onclick="payWithSol('basic')">
                            <i class="fab fa-bitcoin"></i> Pay with SOL
                        </button>
                    </div>
                </div>
                
                <div class="plan-card pro">
                    <div class="plan-badge">POPULAR</div>
                    <div class="plan-header">
                        <h4>🚀 Pro</h4>
                        <div class="plan-price">
                            <span class="price">0.02 SOL</span>
                            <span class="stars">~2 ⭐</span>
                        </div>
                    </div>
                    <ul class="plan-features">
                        <li><i class="fas fa-check"></i> All tabs access</li>
                        <li><i class="fas fa-check"></i> Unlimited notifications</li>
                        <li><i class="fas fa-check"></i> Early access features</li>
                        <li><i class="fas fa-check"></i> Advanced analytics</li>
                        <li><i class="fas fa-check"></i> Priority support</li>
                        <li><i class="fas fa-check"></i> 30 days access</li>
                    </ul>
                    <div class="plan-buttons">
                        <button class="pay-btn stars-btn" onclick="payWithStars('pro')">
                            <i class="fas fa-star"></i> Pay with Stars
                        </button>
                        <button class="pay-btn sol-btn" onclick="payWithSol('pro')">
                            <i class="fab fa-bitcoin"></i> Pay with SOL
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(menu);
    
    // Add click outside to close
    setTimeout(() => {
        document.addEventListener('click', closeSubscriptionMenuOnOutsideClick);
    }, 100);
}

// Initialize swipe functionality for subscription plans
function initSubscriptionSwipe() {
    const plansContainer = document.getElementById('subscriptionPlans');
    const indicators = document.querySelectorAll('.plan-indicators .indicator');
    
    if (!plansContainer) return;
    
    let currentSlide = 0;
    const totalSlides = 2;
    
    // Touch events
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    
    plansContainer.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        plansContainer.style.transition = 'none';
    });
    
    plansContainer.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentX = e.touches[0].clientX;
        const diffX = currentX - startX;
        plansContainer.style.transform = `translateX(${diffX}px)`;
    });
    
    plansContainer.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        plansContainer.style.transition = 'transform 0.3s ease';
        
        const diffX = currentX - startX;
        const threshold = 50;
        
        if (Math.abs(diffX) > threshold) {
            if (diffX > 0 && currentSlide > 0) {
                // Swipe right - previous slide
                currentSlide--;
            } else if (diffX < 0 && currentSlide < totalSlides - 1) {
                // Swipe left - next slide
                currentSlide++;
            }
        }
        
        updateSlidePosition();
    });
    
    // Mouse events for desktop
    let mouseStartX = 0;
    let mouseCurrentX = 0;
    let isMouseDragging = false;
    
    plansContainer.addEventListener('mousedown', (e) => {
        mouseStartX = e.clientX;
        isMouseDragging = true;
        plansContainer.style.transition = 'none';
        e.preventDefault();
    });
    
    plansContainer.addEventListener('mousemove', (e) => {
        if (!isMouseDragging) return;
        mouseCurrentX = e.clientX;
        const diffX = mouseCurrentX - mouseStartX;
        plansContainer.style.transform = `translateX(${diffX}px)`;
    });
    
    plansContainer.addEventListener('mouseup', () => {
        if (!isMouseDragging) return;
        isMouseDragging = false;
        plansContainer.style.transition = 'transform 0.3s ease';
        
        const diffX = mouseCurrentX - mouseStartX;
        const threshold = 50;
        
        if (Math.abs(diffX) > threshold) {
            if (diffX > 0 && currentSlide > 0) {
                currentSlide--;
            } else if (diffX < 0 && currentSlide < totalSlides - 1) {
                currentSlide++;
            }
        }
        
        updateSlidePosition();
    });
    
    // Indicator clicks
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            currentSlide = index;
            updateSlidePosition();
        });
    });
    
    function updateSlidePosition() {
        const translateX = -currentSlide * 100;
        plansContainer.style.transform = `translateX(${translateX}%)`;
        
        // Update indicators
        indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === currentSlide);
        });
    }
}

// Close subscription menu
function closeSubscriptionMenu() {
    const menu = document.querySelector('.subscription-menu');
    if (menu) {
        menu.remove();
        document.body.classList.remove('menu-open');
        document.removeEventListener('click', closeSubscriptionMenuOnOutsideClick);
    }
}

// Close menu when clicking outside
function closeSubscriptionMenuOnOutsideClick(event) {
    const menu = document.querySelector('.subscription-menu');
    if (menu && !menu.contains(event.target) && !event.target.closest('.subscription-indicator')) {
        closeSubscriptionMenu();
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Pay with Telegram Stars
async function payWithStars(tierName) {
    try {
        console.log(`💳 Initiating Stars payment for ${tierName} tier`);
        
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            
            // Get tier info
            const tier = availableTiers.find(t => t.tier_name === tierName);
            if (!tier) {
                alert('Tier not found. Please try again.');
                return;
            }
            
            // Create Stars invoice via backend
            const response = await fetch(`${BACKEND_URL}/api/payment/telegram-stars`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: currentUserId,
                    subscriptionType: tierName,
                    amount: tier.price_stars
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.invoiceLink) {
                // Open payment link directly in bot chat (better UX)
                tg.openLink(data.invoiceLink);
                console.log(`✅ Stars payment initiated for ${tierName}`);
                
                // Show notification
                showNotification(`Opening payment for ${tierName} tier...`, 'success');
            } else {
                // Fallback: direct bot message (better for mobile)
                const botMessageLink = `https://t.me/BetAIAGENT_BOT?start=pay_stars_${tierName}`;
                tg.openLink(botMessageLink);
                console.log(`✅ Stars payment initiated via direct bot message for ${tierName}`);
                
                // Show notification
                showNotification(`Opening bot chat for ${tierName} payment...`, 'success');
            }
        } else {
            // Fallback for non-Telegram environment
            const invoiceLink = `https://t.me/BetAIAGENT_BOT?start=pay_stars_${tierName}`;
            window.open(invoiceLink, '_blank');
            console.log(`✅ Stars payment initiated via web fallback for ${tierName}`);
        }
    } catch (error) {
        console.error('Error initiating Stars payment:', error);
        // Final fallback
        const invoiceLink = `https://t.me/pumpdexbot?startapp=pay_stars_${tierName}`;
        window.open(invoiceLink, '_blank');
        console.log(`✅ Stars payment initiated via error fallback for ${tierName}`);
    }
}

// Pay with Solana
async function payWithSol(tierName) {
    try {
        console.log(`💳 Initiating SOL payment for ${tierName} tier`);
        
        // Check if running in Telegram WebApp
        if (!window.Telegram || !window.Telegram.WebApp) {
            // Running in web browser - redirect to Telegram bot
            const message = '🔒 Solana payments are only available in Telegram.\n\nClick OK to open Telegram bot.';
            
            if (confirm(message)) {
                const botUsername = 'pumpfun_insights_bot';
                window.open(`https://t.me/${botUsername}?start=subscribe`, '_blank');
            }
            return;
        }
        
        // Get tier info
        const tier = availableTiers.find(t => t.tier_name === tierName);
        if (!tier) {
            showNotification('❌ Tier not found. Please try again.', 'error');
            return;
        }
        
        // Ask user for wallet address (optional - for KOLScan discount)
        const walletAddress = prompt('Enter your Solana wallet address (optional, for $KOLScan discount):');
        
        // Show loading
        showNotification('⏳ Setting up Solana payment...', 'info');
        
        // Create Solana Pay URL
        const response = await fetch(`${BACKEND_URL}/api/payment/solana`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: currentUserId,
                subscriptionType: tierName,
                walletAddress: walletAddress || ''
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.payment_url) {
            // Show Solana Pay modal with QR code
            showSolanaPaymentModal({
                paymentUrl: data.payment_url,
                amount: data.amount,
                discount: data.discount,
                hasKolscanDiscount: data.hasKolscanDiscount,
                tierName: tierName,
                walletAddress: walletAddress || null
            });
            
            console.log(`✅ SOL payment initiated for ${tierName}`);
        } else {
            showNotification('❌ Payment setup failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error initiating SOL payment:', error);
        showNotification('❌ Payment failed. Please try again.', 'error');
    }
}

// Show Solana Payment Modal with QR Code
function showSolanaPaymentModal(paymentData) {
    const { paymentUrl, amount, discount, hasKolscanDiscount, tierName } = paymentData;
    
    // Remove existing modal
    const existingModal = document.querySelector('.solana-payment-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'solana-payment-modal';
    modal.innerHTML = `
        <div class="solana-payment-content glass-card">
            <div class="payment-header">
                <h3>💎 Pay with Solana</h3>
                <button class="close-payment-modal" onclick="closeSolanaPaymentModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="payment-info">
                <div class="payment-tier">
                    <span class="tier-name">${tierName.toUpperCase()} Plan</span>
                    <span class="tier-duration">30 days</span>
                </div>
                
                <div class="payment-amount">
                    <div class="amount-display">
                        <span class="amount-value">${amount}</span>
                        <span class="amount-currency">SOL</span>
                    </div>
                    ${hasKolscanDiscount ? `
                        <div class="discount-badge">
                            <i class="fas fa-gift"></i> ${discount}% KOLScan Discount Applied!
                        </div>
                    ` : ''}
                </div>
                
                <div class="qr-code-container">
                    <div id="solana-qr-code"></div>
                    <p class="qr-instruction">Scan with Phantom, Solflare, or any Solana wallet</p>
                </div>
                
                <div class="payment-details">
                    <div class="detail-row">
                        <label>Merchant Wallet:</label>
                        <div class="wallet-display">
                            <input type="text" value="${paymentUrl.split('solana:')[1]?.split('?')[0] || ''}" readonly id="solana-merchant-wallet" class="wallet-input">
                            <button onclick="copyMerchantWallet()" class="copy-btn-visible">
                                <i class="fas fa-copy"></i> Copy Address
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="payment-actions">
                    <button onclick="openInWallet('${paymentUrl}')" class="btn-primary">
                        <i class="fas fa-wallet"></i> Open in Wallet
                    </button>
                    <button onclick="checkSolanaTransaction('${tierName}')" class="btn-secondary">
                        <i class="fas fa-check-circle"></i> I've Paid - Verify
                    </button>
                </div>
                
                <div class="payment-status" id="payment-status"></div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Generate QR Code using a simple library (we'll add this script tag)
    generateSolanaQR(paymentUrl);
    
    // Add swipe gesture for this modal
    initSolanaModalSwipe(modal);
    
    // Add animation
    setTimeout(() => modal.classList.add('active'), 10);
}

// Initialize swipe for Solana Payment Modal
function initSolanaModalSwipe(modal) {
    if (!modal) return;
    
    const modalContent = modal.querySelector('.solana-payment-content');
    if (!modalContent) return;
    
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    
    // Only on mobile
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;
    
    modalContent.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isDragging = true;
    }, { passive: true });
    
    modalContent.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        
        // Only swipe down
        if (diff > 0) {
            modalContent.style.transform = `translateY(${diff}px)`;
            modalContent.style.transition = 'none';
            
            // Reduce background opacity
            const opacity = Math.max(0.3, 1 - (diff / 300));
            modal.style.backgroundColor = `rgba(0, 0, 0, ${opacity * 0.85})`;
        }
    }, { passive: true });
    
    modalContent.addEventListener('touchend', () => {
        if (!isDragging) return;
        
        const diff = currentY - startY;
        
        // If swipe > 100px, close modal
        if (diff > 100) {
            closeSolanaPaymentModal();
        } else {
            // Return to position
            modalContent.style.transform = '';
            modalContent.style.transition = 'transform 0.3s ease';
            modal.style.backgroundColor = '';
        }
        
        isDragging = false;
        startY = 0;
        currentY = 0;
    });
}

// Generate QR Code for Solana Pay
function generateSolanaQR(url) {
    const qrContainer = document.getElementById('solana-qr-code');
    if (!qrContainer) return;
    
    // Using a simple canvas-based QR generation
    // For production, consider using qrcode.js or similar library
    qrContainer.innerHTML = `
        <div class="qr-placeholder">
            <i class="fab fa-bitcoin fa-3x"></i>
            <p>Scan QR in mobile wallet</p>
            <small>Or copy payment URL below</small>
        </div>
    `;
    
    // TODO: Implement actual QR code generation with library
    // For now, we show a placeholder and rely on URL copying
}

// Copy Merchant Wallet Address
function copyMerchantWallet() {
    const input = document.getElementById('solana-merchant-wallet');
    if (input) {
        input.select();
        document.execCommand('copy');
        
        // Also use modern clipboard API as fallback
        if (navigator.clipboard) {
            navigator.clipboard.writeText(input.value);
        }
        
        showNotification('✅ Wallet address copied! Paste in your wallet app.', 'success');
        
        // Visual feedback
        const btn = event.target.closest('.copy-btn-visible');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            btn.style.background = '#10b981';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
            }, 2000);
        }
    }
}

// Open payment URL in wallet
function openInWallet(url) {
    window.location.href = url;
    showNotification('⏳ Waiting for payment confirmation...', 'info');
}

// Check Solana transaction
async function checkSolanaTransaction(tierName) {
    try {
        const signature = prompt('Enter your transaction signature:');
        if (!signature) return;
        
        showNotification('⏳ Verifying transaction...', 'info');
        
        const tier = availableTiers.find(t => t.tier_name === tierName);
        if (!tier) {
            showNotification('❌ Tier not found.', 'error');
            return;
        }
        
        // Verify transaction
        const response = await fetch(`${BACKEND_URL}/api/payment/verify-solana`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                signature: signature,
                expectedAmount: tier.price_sol || 0.1,
                userId: currentUserId,
                subscriptionType: tierName
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('✅ Payment verified! Subscription activated!', 'success');
            closeSolanaPaymentModal();
            
            // Reload subscription status
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            showNotification(`❌ Verification failed: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error checking transaction:', error);
        showNotification('❌ Verification failed. Please try again.', 'error');
    }
}

// Close Solana Payment Modal
function closeSolanaPaymentModal() {
    const modal = document.querySelector('.solana-payment-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

// Show subscription modal
function showSubscriptionModal() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('subscriptionModal');
    if (!modal) {
        modal = createSubscriptionModal();
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'flex';
}

// Create subscription modal
function createSubscriptionModal() {
    const modal = document.createElement('div');
    modal.id = 'subscriptionModal';
    modal.className = 'subscription-modal';
    
    modal.innerHTML = `
        <div class="subscription-modal-content">
            <div class="subscription-header">
                <h2><i class="fas fa-crown"></i> Upgrade to Premium</h2>
                <button class="close-modal" onclick="closeSubscriptionModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="subscription-body">
                <p class="upgrade-message">
                    🚀 Unlock all premium features and get advanced analytics!
                </p>
                
                <div class="subscription-tiers" id="subscriptionTiers">
                    <!-- Tiers will be loaded here -->
                </div>
            </div>
            
            <div class="subscription-footer">
                <button class="btn-secondary" onclick="closeSubscriptionModal()">
                    Maybe Later
                </button>
            </div>
        </div>
    `;
    
    return modal;
}

// Subscribe with Telegram Stars
async function subscribeWithStars(tierName) {
    try {
        if (!currentUserId) {
            alert('User ID not available');
            return;
        }
        
        const response = await fetchWithTimeout(`${BACKEND_URL}/api/payment/telegram-stars`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUserId,
                subscriptionType: tierName
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.invoice_url) {
            // Open payment URL
            window.open(data.invoice_url, '_blank');
        } else {
            alert('Failed to create payment: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error creating Stars payment:', error);
        alert('Payment system temporarily unavailable. Please try again later.');
    }
}

// Close subscription modal
function closeSubscriptionModal() {
    const modal = document.getElementById('subscriptionModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Initialize app
async function initApp() {
    console.log('🚀 Initializing Pump Dex Mini App...');
    
    // Initialize Telegram Web App
    initTelegramWebApp();
    
    // Initialize theme
    initTheme();
    
    // Initialize admin panel
    initAdminPanel();
    
    // Check API health
    try {
    await checkApiHealth();
    } catch (error) {
        console.error('❌ API health check failed:', error);
        console.log('⚠️ App will continue in fallback mode');
    }
    
    // Setup event handlers
    setupEventHandlers();
    
    // Initialize components
    initializeComponents();
    
    // Initialize subscription system
    try {
        await initSubscriptionSystem();
    } catch (error) {
        console.error('❌ Subscription system initialization failed:', error);
        console.log('⚠️ Subscription system running in fallback mode');
    }
    
    // Load initial tab data
    try {
        await loadTabData(currentTab);
    } catch (error) {
        console.error('❌ Failed to load initial tab data:', error);
        console.log('⚠️ App will continue without initial data');
    }
    
    // Start auto-refresh
    startAutoRefresh();
    
    // Hide loading screen
    setTimeout(() => {
        hideLoading();
        console.log('✅ App initialized successfully');
    }, 500);
}

// Setup event handlers
function setupEventHandlers() {
    // Tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            if (tabName) {
                switchTab(tabName);
            }
        });
    });
    
    // Refresh button
    setupRefreshButtonHandler();
    
    // Token modal
    const modal = document.getElementById('tokenModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'tokenModal') {
                closeTokenModal();
            }
        });
    }
    
    // Page visibility
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            startAutoRefresh();
            loadTabData(currentTab);
        } else {
            stopAutoRefresh();
        }
    });
}

// === TOKEN METADATA CACHING ===
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

function getCachedTokenMetadata(tokenMint) {
    const cacheKey = `token_meta_${tokenMint}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < CACHE_DURATION) {
            return data.metadata;
        }
        // Cache expired
        localStorage.removeItem(cacheKey);
    }
    return null;
}

function cacheTokenMetadata(tokenMint, metadata) {
    const cacheKey = `token_meta_${tokenMint}`;
    const data = {
        metadata: metadata,
        timestamp: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(data));
}

// Copy to clipboard with visual feedback
function copyToClipboard(text, element) {
    navigator.clipboard.writeText(text).then(() => {
        // Visual feedback
        const originalText = element.innerHTML;
        element.innerHTML = '<i class="fas fa-check" style="color: var(--success);"></i> Copied!';
        element.style.color = 'var(--success)';
        
        setTimeout(() => {
            element.innerHTML = originalText;
            element.style.color = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
    });
}

// Animate numbers on About page
function animateAboutNumbers() {
    const aboutTab = document.getElementById('about');
    if (!aboutTab || !aboutTab.classList.contains('active')) return;
    
    const numberElements = aboutTab.querySelectorAll('.text-3xl.font-bold span.inline-block');
    
    numberElements.forEach(el => {
        const text = el.textContent.trim();
        const isPercentage = text.includes('%');
        const targetValue = parseInt(text.replace(/[^0-9]/g, ''));
        
        if (isNaN(targetValue)) return;
        
        let currentValue = 0;
        const increment = Math.ceil(targetValue / 50); // 50 steps
        const duration = 1500; // 1.5 seconds
        const stepTime = duration / 50;
        
        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(timer);
            }
            
            el.textContent = isPercentage ? currentValue : currentValue.toLocaleString();
        }, stepTime);
    });
}

// ========== LIVE SIGNALS (MERGED TAB) ==========

let liveSignalsData = {
    cluster: [],
    volume: [],
    whale: [],
    cobuy: []
};
let currentSignalFilter = 'all';

// Initialize signal tabs
function initLiveSignalsTabs() {
    const signalTabs = document.querySelectorAll('.signal-tab');
    signalTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active state
            signalTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update filter and render
            currentSignalFilter = tab.dataset.signal;
            renderLiveSignals();
        });
    });
}

// Load all signals data
async function loadLiveSignalsData() {
    try {
        showLoading();
        
        // Fetch all signal types in parallel
        const [clusterData, volumeData, whaleData, cobuyData] = await Promise.all([
            fetch(`${API_URL}/clusterbuy`).then(r => r.json()),
            fetch(`${API_URL}/volumesurge`).then(r => r.json()),
            fetch(`${API_URL}/whalemoves`).then(r => r.json()),
            fetch(`${API_URL}/cobuy`).then(r => r.json())
        ]);
        
        liveSignalsData = {
            cluster: clusterData || [],
            volume: volumeData || [],
            whale: whaleData || [],
            cobuy: cobuyData || []
        };
        
        renderLiveSignals();
        updateLastUpdateTime();
    } catch (error) {
        console.error('Error loading live signals:', error);
        renderError('liveSignalsData', error);
    } finally {
        hideLoading();
    }
}

// Render live signals based on current filter
function renderLiveSignals() {
    const container = document.getElementById('liveSignalsData');
    if (!container) return;
    
    // Combine and filter signals
    let signals = [];
    
    if (currentSignalFilter === 'all' || currentSignalFilter === 'cluster') {
        signals = signals.concat(liveSignalsData.cluster.map(s => ({ ...s, type: 'cluster' })));
    }
    if (currentSignalFilter === 'all' || currentSignalFilter === 'volume') {
        signals = signals.concat(liveSignalsData.volume.map(s => ({ ...s, type: 'volume' })));
    }
    if (currentSignalFilter === 'all' || currentSignalFilter === 'whale') {
        signals = signals.concat(liveSignalsData.whale.map(s => ({ ...s, type: 'whale' })));
    }
    if (currentSignalFilter === 'all' || currentSignalFilter === 'cobuy') {
        signals = signals.concat(liveSignalsData.cobuy.map(s => ({ ...s, type: 'cobuy' })));
    }
    
    if (signals.length === 0) {
        container.innerHTML = '<div class="no-data"><i class="fas fa-inbox"></i><p>No signals detected</p></div>';
        return;
    }
    
    // Sort by time (most recent first)
    signals.sort((a, b) => new Date(b.latest_purchase || b.ts) - new Date(a.latest_purchase || a.ts));
    
    // Render signals
    container.innerHTML = signals.map(signal => {
        const signalStrength = getSignalStrength(signal);
        const signalIcon = getSignalIcon(signal.type);
        const signalColor = getSignalColor(signal.type);
        
        return `
            <div class="data-item" onclick="showTokenDetails('${signal.token_mint}', '${signal.symbol || 'N/A'}', '${signal.name || 'Unknown'}')">
                <div class="item-header">
                    <div class="token-info">
                        <h3>${signal.symbol || 'N/A'}</h3>
                        <p>${signal.name || 'Unknown Token'}</p>
                    </div>
                    <div class="item-badges">
                        <span class="badge ${signalColor}">
                            <i class="${signalIcon}"></i> ${signal.type.toUpperCase()}
                        </span>
                        ${signalStrength}
                    </div>
                </div>
                <div class="item-stats">
                    ${getSignalStats(signal)}
                </div>
                <div class="item-actions">
                    <a href="https://pump.fun/${signal.token_mint}" target="_blank" rel="noopener noreferrer" class="action-btn">
                        <i class="fas fa-rocket"></i> Pump.fun
                    </a>
                    <a href="https://dexscreener.com/solana/${signal.token_mint}" target="_blank" rel="noopener noreferrer" class="action-btn">
                        <i class="fas fa-chart-line"></i> Chart
                    </a>
                    <a href="https://solscan.io/token/${signal.token_mint}" target="_blank" rel="noopener noreferrer" class="action-btn">
                        <i class="fas fa-search"></i> Solscan
                    </a>
                </div>
            </div>
        `;
    }).join('');
}

// Get signal strength badge
function getSignalStrength(signal) {
    let count = 0;
    if (signal.purchase_count >= 10) count++;
    if (signal.total_volume >= 10) count++;
    if (signal.unique_buyers >= 5) count++;
    if (signal.max_buy >= 10) count++;
    
    if (count >= 3) return '<span class="signal-strength signal-hot"><i class="fas fa-fire"></i> HOT</span>';
    if (count >= 2) return '<span class="signal-strength signal-strong"><i class="fas fa-bolt"></i> STRONG</span>';
    return '<span class="signal-strength signal-medium"><i class="fas fa-circle"></i> MEDIUM</span>';
}

// Get signal icon
function getSignalIcon(type) {
    const icons = {
        cluster: 'fas fa-fire',
        volume: 'fas fa-chart-line',
        whale: 'fas fa-fish',
        cobuy: 'fas fa-users'
    };
    return icons[type] || 'fas fa-bolt';
}

// Get signal color
function getSignalColor(type) {
    const colors = {
        cluster: 'badge-hot',
        volume: 'badge-trending',
        whale: 'badge-whale',
        cobuy: 'badge-smart'
    };
    return colors[type] || 'badge';
}

// Get signal stats
function getSignalStats(signal) {
    const stats = [];
    
    if (signal.purchase_count) {
        stats.push(`<div class="stat"><span class="stat-label">Buys</span><span class="stat-value">${signal.purchase_count}</span></div>`);
    }
    if (signal.unique_buyers) {
        stats.push(`<div class="stat"><span class="stat-label">Buyers</span><span class="stat-value">${signal.unique_buyers}</span></div>`);
    }
    if (signal.total_volume) {
        stats.push(`<div class="stat"><span class="stat-label">Volume</span><span class="stat-value">${parseFloat(signal.total_volume).toFixed(2)} SOL</span></div>`);
    }
    if (signal.max_buy) {
        stats.push(`<div class="stat"><span class="stat-label">Max Buy</span><span class="stat-value">${parseFloat(signal.max_buy).toFixed(2)} SOL</span></div>`);
    }
    if (signal.latest_purchase) {
        stats.push(`<div class="stat"><span class="stat-label">Last Buy</span><span class="stat-value">${formatTimeAgo(signal.latest_purchase)}</span></div>`);
    }
    
    return stats.join('');
}

// Initialize components
function initializeComponents() {
    // Initialize traders scroll
    initializeTradersScroll();
    
    // Initialize coins filters
    initCoinsFilters();
    
    // Initialize fresh tokens filters
    initFreshTokensFilters();
    
    // Initialize top gainers filters
    initTopGainersFilters();
    
    // Initialize smart money filters
    initSmartMoneyFilters();
    
    // Initialize live signals tabs
    initLiveSignalsTabs();
    
    // Initialize wallet stats
    initWalletStats();
    
    // Initialize modal swipe gestures
    initModalSwipe();
    
    // Animate About page numbers on first load
    if (currentTab === 'about') {
        setTimeout(animateAboutNumbers, 300);
    }
}

