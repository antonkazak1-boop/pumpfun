// Конфигурация
const BACKEND_URL = window.location.origin; // Используем тот же домен, что и Mini App
const REFRESH_INTERVAL = 30000; // 30 секунд
const API_TIMEOUT = 10000; // 10 секунд

// Глобальные переменные
let currentTab = 'about';
let refreshTimer = null;
let isLoading = false;

// Маппинг вкладок к API эндпоинтам
const TAB_API_MAP = {
    'about': null, // Special tab without API
    'analytics': null, // Analytics tab without API  
    'clusterBuy': 'clusterbuy',
    'whaleMoves': 'whalemoves', 
    'volumeSurge': 'volumesurge',
    'coBuy': 'cobuy',
    'smartMoney': 'smartmoney',
    'freshTokens': 'freshtokens',
    'topGainers': 'topgainers'
};

// Маппинг для рендеринга функций
const TAB_RENDER_MAP = {
    'about': null, // Special tab without rendering
    'analytics': null, // Analytics tab without rendering
    'clusterBuy': renderClusterBuy,
    'whaleMoves': renderWhaleMoves,
    'volumeSurge': renderVolumeSurge,
    'coBuy': renderCoBuy,
    'smartMoney': renderSmartMoney,
    'freshTokens': renderFreshTokens,
    'topGainers': renderTopGainers
};

// Инициализация Telegram Web App
function initTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        
        // Настройка темы
        if (tg.themeParams) {
            document.body.classList.add('telegram-theme');
        }
        
        // Готовность и расширение на весь экран
        tg.ready();
        tg.expand();
        
        // Настройка главной кнопки (опционально)
        tg.MainButton.hide();
        
        // Настройка кнопки "Назад" (опционально)
        tg.BackButton.hide();
        
        console.log('Telegram Web App инициализирован');
        console.log('User ID:', tg.initDataUnsafe?.user?.id);
        console.log('Theme params:', tg.themeParams);
        
        return tg;
    }
    console.log('Telegram Web App не доступен (разработка вне Telegram)');
    return null;
}

// HTTP запросы с таймаутом
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

// Получение данных с API
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
        console.error(`Ошибка при получении данных с ${endpoint}:`, error);
        updateApiStatus(false);
        
        if (error.name === 'AbortError') {
            throw new Error('Превышено время ожидания');
        }
        
        throw error;
    }
}

// Обновление статуса API
function updateApiStatus(isOnline) {
    const statusElement = document.getElementById('apiStatus');
    if (statusElement) {
        statusElement.textContent = isOnline ? 'онлайн' : 'офлайн';
        statusElement.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
    }
}

// Обновление времени последнего обновления
function updateLastUpdateTime() {
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement) {
        const now = new Date();
        lastUpdateElement.textContent = now.toLocaleTimeString('ru-RU');
    }
}

// Показ экрана загрузки
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
                <h3>Нет кластерных покупок</h3>
                <p>За последние 10 минут не обнаружено токенов с 3+ уникальными покупателями</p>
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
                            <h3>Hot Token Alert</h3>
                            <div class="token-address">${shortenAddress(item.token_mint)}</div>
                        </div>
                    </div>
                    <div class="rank-badge">#${index + 1}</div>
                </div>
                <div class="item-stats">
                    <div class="stat-item">
                        <div class="stat-label">Уникальных покупателей</div>
                        <div class="stat-value positive">${item.buyers || 0}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Общий объем</div>
                        <div class="stat-value neutral">${formatNumber(item.total_sol)} SOL</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Средняя покупка</div>
                        <div class="stat-value">${avgBuy} SOL</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Активность</div>
                        <div class="stat-value positive">🔥 ${item.buyers >= 5 ? 'Высокая' : 'Растущая'}</div>
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
                        Детали
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
                <h3>Нет движений китов</h3>
                <p>За последние 30 минут не обнаружено покупок свыше 100 SOL</p>
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
                    ${index + 1}. ${traderName ? traderName : 'Китовая покупка'}
                    ${telegramLink ? `<a href="${telegramLink}" target="_blank" class="social-link telegram"><i class="fab fa-telegram"></i></a>` : ''}
                    ${twitterLink ? `<a href="${twitterLink}" target="_blank" class="social-link twitter"><i class="fab fa-twitter"></i></a>` : ''}
                </h3>
                <div class="item-stats">
                    <div class="stat-item">
                        <div class="stat-label">Кошелек</div>
                        <div class="stat-value">${shortenAddress(item.wallet)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Токен</div>
                        <div class="stat-value">${shortenAddress(item.token_mint)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">SOL потрачено</div>
                        <div class="stat-value positive">${formatNumber(item.sol_spent)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Время</div>
                        <div class="stat-value">${formatTime(item.ts)}</div>
                    </div>
                </div>
                <div class="item-actions">
                    <a href="${pumpUrl}" target="_blank" class="action-button">
                        <i class="fas fa-external-link-alt"></i> Pump.fun
                    </a>
                    <a href="${txUrl}" target="_blank" class="action-button secondary">
                        <i class="fas fa-receipt"></i> Транзакция
                    </a>
                    <a href="${walletUrl}" target="_blank" class="action-button secondary">
                        <i class="fas fa-wallet"></i> Кошелек
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
                <h3>Нет всплесков объема</h3>
                <p>За последние 15 минут не обнаружено значительных всплесков торгового объема</p>
            </div>`;
        return;
    }
    
    container.innerHTML = data.map((item, index) => {
        const pumpUrl = `https://pump.fun/coin/${item.token_mint}`;
        const surgePercentage = parseFloat(item.surge_percentage || 0);
        const surgeClass = surgePercentage > 50 ? 'positive' : 'neutral';
        
        return `
            <div class="data-item surge-item">
                <h3>
                    <i class="fas fa-chart-line"></i>
                    ${index + 1}. ${shortenAddress(item.token_mint)}
                </h3>
                <div class="item-stats">
                    <div class="stat-item">
                        <div class="stat-label">Текущий объем (15м)</div>
                        <div class="stat-value positive">${formatNumber(item.volume_15m)} SOL</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Предыдущий объем</div>
                        <div class="stat-value">${formatNumber(item.volume_previous)} SOL</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Рост</div>
                        <div class="stat-value ${surgeClass}">+${formatNumber(surgePercentage, 1)}%</div>
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

// Рендеринг Co-buy данных
function renderCoBuy(data) {
    const container = document.getElementById('coBuyData');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>Нет совместных покупок</h3>
                <p>За последние 20 минут не обнаружено токенов, покупаемых одновременно</p>
            </div>`;
        return;
    }
    
    container.innerHTML = data.map((item, index) => {
        const pumpUrlA = `https://pump.fun/coin/${item.token_a}`;
        const pumpUrlB = `https://pump.fun/coin/${item.token_b}`;
        
        return `
            <div class="data-item">
                <h3>
                    <i class="fas fa-users"></i>
                    ${index + 1}. Парная покупка
                </h3>
                <div class="item-stats">
                    <div class="stat-item">
                        <div class="stat-label">Токен A</div>
                        <div class="stat-value">${shortenAddress(item.token_a)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Токен B</div>
                        <div class="stat-value">${shortenAddress(item.token_b)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Общие покупатели</div>
                        <div class="stat-value positive">${item.common_buyers || 0}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Общий объем</div>
                        <div class="stat-value neutral">${formatNumber(item.combined_volume)} SOL</div>
                    </div>
                </div>
                <div class="item-actions">
                    <a href="${pumpUrlA}" target="_blank" class="action-button">
                        <i class="fas fa-external-link-alt"></i> Токен A
                    </a>
                    <a href="${pumpUrlB}" target="_blank" class="action-button secondary">
                        <i class="fas fa-external-link-alt"></i> Токен B
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
                <h3>Нет активности умных денег</h3>
                <p>За последний час не обнаружена активность опытных трейдеров</p>
            </div>`;
        return;
    }
    
    // Группируем данные по кошелькам
    const walletGroups = data.reduce((groups, item) => {
        if (!groups[item.wallet]) {
            groups[item.wallet] = {
                wallet: item.wallet,
                unique_tokens: item.unique_tokens,
                avg_buy_size: item.avg_buy_size,
                trades: []
            };
        }
        groups[item.wallet].trades.push(item);
        return groups;
    }, {});
    
    container.innerHTML = Object.values(walletGroups).map((walletData, index) => {
        const walletUrl = `https://solscan.io/account/${walletData.wallet}`;
        const latestTrade = walletData.trades[0]; // Первая торговля (самая свежая)
        
        // Получаем данные о трейдере из latest trade
        const traderName = latestTrade.wallet_name || 'Анонимный трейдер';
        const telegramLink = latestTrade.wallet_telegram;
        const twitterLink = latestTrade.wallet_twitter;
        
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
                        <div class="stat-label">Кошелек</div>
                        <div class="stat-value">${shortenAddress(walletData.wallet)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Уникальных токенов</div>
                        <div class="stat-value positive">${walletData.unique_tokens || 0}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Средний размер</div>
                        <div class="stat-value neutral">${formatNumber(walletData.avg_buy_size)} SOL</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Последний токен</div>
                        <div class="stat-value">${shortenAddress(latestTrade.token_mint)}</div>
                    </div>
                </div>
                <div class="item-actions">
                    <a href="https://pump.fun/coin/${latestTrade.token_mint}" target="_blank" class="action-button">
                        <i class="fas fa-external-link-alt"></i> Последний токен
                    </a>
                    <a href="${walletUrl}" target="_blank" class="action-button secondary">
                        <i class="fas fa-wallet"></i> Кошелек
                    </a>
                    <button class="action-button secondary" onclick="showTokenDetails('${latestTrade.token_mint}')">
                        <i class="fas fa-info-circle"></i> Детали
                    </button>
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
                <h3>Нет новых токенов</h3>
                <p>За последние 5 минут не появились новые токены с активностью</p>
            </div>`;
        return;
    }
    
    container.innerHTML = data.map((item, index) => {
        const pumpUrl = `https://pump.fun/coin/${item.token_mint}`;
        const timeSinceCreation = new Date() - new Date(item.first_seen);
        const minutesAgo = Math.floor(timeSinceCreation / (1000 * 60));
        
        return `
            <div class="data-item fresh-item">
                <h3>
                    <i class="fas fa-seedling"></i>
                    ${index + 1}. ${shortenAddress(item.token_mint)}
                </h3>
                <div class="item-stats">
                    <div class="stat-item">
                        <div class="stat-label">Ранних покупателей</div>
                        <div class="stat-value positive">${item.early_buyers || 0}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Общий объем</div>
                        <div class="stat-value neutral">${formatNumber(item.total_volume)} SOL</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Возраст</div>
                        <div class="stat-value">${minutesAgo}м назад</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Создан</div>
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
                <h3>Нет лидеров</h3>
                <p>За последний час не обнаружены токены с объемом свыше 100 SOL</p>
            </div>`;
        return;
    }
    
    container.innerHTML = data.map((item, index) => {
        const pumpUrl = `https://pump.fun/coin/${item.token_mint}`;
        const dexUrl = `https://dexscreener.com/solana/${item.token_mint}`;
        
        return `
            <div class="data-item">
                <h3>
                    <i class="fas fa-trophy"></i>
                    ${index + 1}. ${shortenAddress(item.token_mint)}
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
                    <h3>Нет данных</h3>
                    <p>Нет данных по активности токена за последние 2 часа</p>
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
    
    // Create elements for smooth scrolling with better variety
    const totalItems = traders.length * 2; // Only 2 copies for better variety

    traders.forEach((trader, originalIndex) => {
        for (let copy = 0; copy < 2; copy++) {
            const index = originalIndex * 2 + copy;
            const traderElement = createTraderElement(trader, index);
            tradersContainer.appendChild(traderElement);
        }
    });
}

function createTraderElement(trader, index) {
    const div = document.createElement('div');
    div.className = 'trader-item';
    div.style.cssText = `--delay: ${index * 0.3}s; animation-delay: ${index * 0.3}s;`;
    
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

// Запуск приложения после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
