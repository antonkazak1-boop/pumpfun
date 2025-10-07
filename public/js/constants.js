// 🔧 Constants for Pump Dex Mini App
// Централизованные константы для всего приложения

// API Endpoints
export const API_ENDPOINTS = {
    // Health
    HEALTH: '/api/health',
    
    // Analytics
    CLUSTER_BUY: '/api/clusterbuy',
    WHALE_MOVES: '/api/whalemoves',
    VOLUME_SURGE: '/api/volumesurge',
    CO_BUY: '/api/cobuy',
    SMART_MONEY: '/api/smartmoney',
    FRESH_TOKENS: '/api/freshtokens',
    TOP_GAINERS: '/api/topgainers',
    RECENT_ACTIVITY: '/api/recent-activity',
    TRENDING_META: '/api/pump/trending-meta',
    
    // Market
    COINS_MARKET: '/api/coins/market',
    COINS_TRADERS: '/api/coins/traders',
    
    // Portfolio
    TRADERS_LIST: '/api/traders/list',
    TRADERS_STATS: '/api/traders/stats',
    WALLET_STATS: '/api/wallet/stats',
    
    // Subscriptions
    SUBSCRIPTION_TIERS: '/api/subscription/tiers',
    SUBSCRIPTION_STATUS: '/api/subscription/status',
    SUBSCRIPTION_CHECK_ACCESS: '/api/subscription/check-access',
    
    // Payments
    PAYMENT_TELEGRAM_STARS: '/api/payment/telegram-stars',
    PAYMENT_SOLANA: '/api/payment/solana',
    PAYMENT_VERIFY_SOLANA: '/api/payment/verify-solana',
    
    // User
    USER_UPDATE: '/api/user/update',
    
    // KOLScan
    KOLSCAN_BALANCE: '/api/kolscan/balance'
};

// Refresh intervals by tier (milliseconds)
export const REFRESH_INTERVALS = {
    FREE: 60000,    // 1 minute
    TRIAL: 30000,   // 30 seconds
    BASIC: 30000,   // 30 seconds
    PRO: 15000      // 15 seconds
};

// API timeout
export const API_TIMEOUT = 10000; // 10 seconds

// Access rules by tier
export const ACCESS_RULES = {
    free: {
        allowedTabs: ['about', 'dashboard', 'analytics', 'freshTokens', 'coins'],
        maxTokensPerTab: 10,
        refreshInterval: REFRESH_INTERVALS.FREE
    },
    trial: {
        allowedTabs: ['about', 'dashboard', 'analytics', 'freshTokens', 'coins', 'smartMoney', 'clusterBuy', 'volumeSurge', 'coBuy', 'whaleMoves', 'topGainers', 'recentActivity', 'trendingMeta', 'portfolio', 'walletStats'],
        maxTokensPerTab: 50,
        refreshInterval: REFRESH_INTERVALS.TRIAL,
        daysAllowed: 5
    },
    basic: {
        allowedTabs: ['about', 'dashboard', 'analytics', 'freshTokens', 'coins', 'smartMoney', 'clusterBuy', 'volumeSurge', 'coBuy', 'whaleMoves', 'topGainers', 'recentActivity'],
        maxTokensPerTab: 100,
        refreshInterval: REFRESH_INTERVALS.BASIC
    },
    pro: {
        allowedTabs: 'all',
        maxTokensPerTab: 'unlimited',
        refreshInterval: REFRESH_INTERVALS.PRO
    }
};

// Tab to API endpoint mapping
export const TAB_API_MAP = {
    'about': null,
    'dashboard': null,
    'analytics': null,
    'portfolio': API_ENDPOINTS.TRADERS_LIST,
    'clusterBuy': API_ENDPOINTS.CLUSTER_BUY,
    'whaleMoves': API_ENDPOINTS.WHALE_MOVES,
    'volumeSurge': API_ENDPOINTS.VOLUME_SURGE,
    'coBuy': API_ENDPOINTS.CO_BUY,
    'smartMoney': API_ENDPOINTS.SMART_MONEY,
    'freshTokens': API_ENDPOINTS.FRESH_TOKENS,
    'topGainers': API_ENDPOINTS.TOP_GAINERS,
    'coins': API_ENDPOINTS.COINS_MARKET,
    'recentActivity': API_ENDPOINTS.RECENT_ACTIVITY,
    'trendingMeta': API_ENDPOINTS.TRENDING_META,
    'walletStats': null
};

// UI Messages
export const UI_MESSAGES = {
    LOADING: 'Loading data...',
    NO_DATA: 'No data available',
    ERROR: 'Error loading data',
    NO_ACCESS: '🔒 This feature requires Premium subscription',
    TRIAL_EXPIRED: '⏰ Your trial has ended. Please upgrade.',
    UPGRADE_NOW: 'Upgrade now to unlock all features!',
    PAYMENT_SUCCESS: '✅ Payment successful! Subscription activated.',
    PAYMENT_FAILED: '❌ Payment failed. Please try again.'
};

// Error messages
export const ERROR_MESSAGES = {
    NO_ACCESS: '🔒 This feature requires Premium subscription',
    TRIAL_EXPIRED: '⏰ Your trial has ended. Please upgrade.',
    API_ERROR: '❌ Unable to load data. Please refresh.',
    NETWORK_ERROR: '📡 Network error. Check your connection.',
    INVALID_WALLET: '⚠️ Invalid wallet address',
    PAYMENT_FAILED: '❌ Payment failed. Please try again.',
    SESSION_EXPIRED: '🔓 Session expired. Please restart the app.'
};

// Success messages
export const SUCCESS_MESSAGES = {
    PAYMENT_CONFIRMED: '✅ Payment confirmed! Subscription activated.',
    DATA_REFRESHED: '🔄 Data refreshed successfully',
    SETTINGS_SAVED: '💾 Settings saved',
    SUBSCRIPTION_UPDATED: '🎉 Subscription updated successfully'
};

// Filter options
export const FILTER_OPTIONS = {
    MARKET_CAP: {
        LOW: { label: 'Low Caps', value: 'low', range: [0, 100000] },
        MID: { label: 'Mid Caps', value: 'mid', range: [100000, 1000000] },
        HIGH: { label: 'High Caps', value: 'high', range: [1000000, Infinity] }
    },
    TIME_PERIOD: {
        '1H': { label: '1 Hour', value: '1h' },
        '6H': { label: '6 Hours', value: '6h' },
        '24H': { label: '24 Hours', value: '24h' },
        '7D': { label: '7 Days', value: '7d' }
    },
    SIGNAL_STRENGTH: {
        LOW: { label: 'Low', value: 'low', threshold: 3 },
        MEDIUM: { label: 'Medium', value: 'medium', threshold: 5 },
        HIGH: { label: 'High', value: 'high', threshold: 8 },
        EXTREME: { label: 'Extreme', value: 'extreme', threshold: 12 }
    }
};

// Theme configuration
export const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    LOVABLE: 'lovable'
};

// Animation durations (milliseconds)
export const ANIMATION_DURATION = {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500,
    VERY_SLOW: 1000
};

// Local storage keys
export const STORAGE_KEYS = {
    THEME: 'pump-dex-theme',
    USER_ID: 'pump-dex-user-id',
    CACHE_PREFIX: 'pump-dex-cache-',
    FAVORITES: 'pump-dex-favorites',
    SEARCH_HISTORY: 'pump-dex-search-history'
};

// Pagination
export const PAGINATION = {
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 200,
    FREE_TIER_LIMIT: 10,
    TRIAL_TIER_LIMIT: 50,
    BASIC_TIER_LIMIT: 100
};

// Cache duration (milliseconds)
export const CACHE_DURATION = {
    SHORT: 30000,   // 30 seconds
    MEDIUM: 300000, // 5 minutes
    LONG: 900000    // 15 minutes
};

// Color scheme
export const COLORS = {
    PRIMARY: '#00ff88',
    SECONDARY: '#0066ff',
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    PUMP_ORANGE: '#ff6b35',
    PUMP_YELLOW: '#f7931e'
};

// Subscription tier names
export const SUBSCRIPTION_TIERS = {
    FREE: 'free',
    TRIAL: 'trial',
    BASIC: 'basic',
    PRO: 'pro'
};

// Payment methods
export const PAYMENT_METHODS = {
    TELEGRAM_STARS: 'telegram_stars',
    SOLANA: 'solana'
};

// Regex patterns
export const PATTERNS = {
    SOLANA_ADDRESS: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    USERNAME: /^[a-zA-Z0-9_]{3,32}$/
};

// Default values
export const DEFAULTS = {
    CURRENT_TAB: 'about',
    THEME: THEMES.DARK,
    MARKET_CAP_FILTER: 'low',
    TIME_PERIOD_FILTER: '24h',
    SIGNAL_STRENGTH_FILTER: 'medium'
};

