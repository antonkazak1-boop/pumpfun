/**
 * Real Pump.fun API Integration
 * 
 * Использует официальные эндпоинты Pump.fun для получения данных о новых токенах
 * Источник: https://github.com/BankkRoll/pumpfun-apis
 */

const axios = require('axios');

// Pump.fun API endpoints
const PUMP_FUN_APIS = {
    frontend_v3: 'https://frontend-api-v3.pump.fun',
    advanced_v2: 'https://advanced-api-v2.pump.fun',
    volatility_v2: 'https://volatility-api-v2.pump.fun'
};

// Общие заголовки для всех запросов
const COMMON_HEADERS = {
    'Accept': 'application/json',
    'Origin': 'https://pump.fun',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

/**
 * Получить новые токены с Pump.fun (самые свежие)
 */
async function getLatestPumpTokens(limit = 50) {
    try {
        const response = await axios.get(`${PUMP_FUN_APIS.frontend_v3}/coins/latest`, {
            headers: COMMON_HEADERS,
            timeout: 10000,
            params: {
                limit: limit
            }
        });
        
        if (response.data && Array.isArray(response.data)) {
            return response.data.map(token => ({
                mint: token.mint,
                name: token.name || 'Unknown Token',
                symbol: token.symbol || token.mint.substring(0, 4).toUpperCase(),
                description: token.description || '',
                image: token.image_uri || '/img/token-placeholder.png',
                creator: token.creator,
                created_timestamp: token.created_timestamp,
                market_cap: token.usd_market_cap || 0,
                price: token.price_usd || 0,
                volume_24h: token.volume_24h || 0,
                holders: token.holders || 0,
                is_complete: token.is_complete || false,
                is_raydium: token.is_raydium || false,
                source: 'pumpfun_latest'
            }));
        }
        
        return [];
    } catch (error) {
        console.error('❌ Failed to fetch latest Pump.fun tokens:', error.message);
        return [];
    }
}

/**
 * Получить токены которые сейчас торгуются (currently live)
 */
async function getCurrentlyLiveTokens(limit = 50) {
    try {
        const response = await axios.get(`${PUMP_FUN_APIS.frontend_v3}/coins/currently-live`, {
            headers: COMMON_HEADERS,
            timeout: 10000,
            params: {
                limit: limit
            }
        });
        
        if (response.data && Array.isArray(response.data)) {
            return response.data.map(token => ({
                mint: token.mint,
                name: token.name || 'Unknown Token',
                symbol: token.symbol || token.mint.substring(0, 4).toUpperCase(),
                description: token.description || '',
                image: token.image_uri || '/img/token-placeholder.png',
                creator: token.creator,
                created_timestamp: token.created_timestamp,
                market_cap: token.usd_market_cap || 0,
                price: token.price_usd || 0,
                volume_24h: token.volume_24h || 0,
                holders: token.holders || 0,
                is_complete: token.is_complete || false,
                is_raydium: token.is_raydium || false,
                source: 'pumpfun_live'
            }));
        }
        
        return [];
    } catch (error) {
        console.error('❌ Failed to fetch currently live tokens:', error.message);
        return [];
    }
}

/**
 * Получить топ перформеры (top runners)
 */
async function getTopRunners(limit = 20) {
    try {
        const response = await axios.get(`${PUMP_FUN_APIS.frontend_v3}/coins/top-runners`, {
            headers: COMMON_HEADERS,
            timeout: 10000,
            params: {
                limit: limit
            }
        });
        
        if (response.data && Array.isArray(response.data)) {
            return response.data.map(token => ({
                mint: token.mint,
                name: token.name || 'Unknown Token',
                symbol: token.symbol || token.mint.substring(0, 4).toUpperCase(),
                description: token.description || '',
                image: token.image_uri || '/img/token-placeholder.png',
                creator: token.creator,
                created_timestamp: token.created_timestamp,
                market_cap: token.usd_market_cap || 0,
                price: token.price_usd || 0,
                volume_24h: token.volume_24h || 0,
                holders: token.holders || 0,
                price_change_24h: token.price_change_24h || 0,
                is_complete: token.is_complete || false,
                is_raydium: token.is_raydium || false,
                source: 'pumpfun_top_runners'
            }));
        }
        
        return [];
    } catch (error) {
        console.error('❌ Failed to fetch top runners:', error.message);
        return [];
    }
}

/**
 * Получить детали конкретного токена по mint адресу
 */
async function getPumpTokenDetails(mint) {
    try {
        const response = await axios.get(`${PUMP_FUN_APIS.frontend_v3}/coins/${mint}`, {
            headers: COMMON_HEADERS,
            timeout: 10000
        });
        
        if (response.data) {
            const token = response.data;
            return {
                mint: token.mint,
                name: token.name || 'Unknown Token',
                symbol: token.symbol || mint.substring(0, 4).toUpperCase(),
                description: token.description || '',
                image: token.image_uri || '/img/token-placeholder.png',
                creator: token.creator,
                created_timestamp: token.created_timestamp,
                market_cap: token.usd_market_cap || 0,
                price: token.price_usd || 0,
                volume_24h: token.volume_24h || 0,
                holders: token.holders || 0,
                price_change_24h: token.price_change_24h || 0,
                is_complete: token.is_complete || false,
                is_raydium: token.is_raydium || false,
                complete_timestamp: token.complete_timestamp,
                source: 'pumpfun_direct'
            };
        }
        
        return null;
    } catch (error) {
        console.error(`❌ Failed to fetch token details for ${mint}:`, error.message);
        return null;
    }
}

/**
 * Получить метаданные для нескольких токенов сразу
 */
async function getMultiplePumpTokens(mints) {
    try {
        const response = await axios.post(`${PUMP_FUN_APIS.frontend_v3}/coins/mints`, {
            mints: mints
        }, {
            headers: COMMON_HEADERS,
            timeout: 15000
        });
        
        if (response.data && Array.isArray(response.data)) {
            return response.data.map(token => ({
                mint: token.mint,
                name: token.name || 'Unknown Token',
                symbol: token.symbol || token.mint.substring(0, 4).toUpperCase(),
                description: token.description || '',
                image: token.image_uri || '/img/token-placeholder.png',
                creator: token.creator,
                created_timestamp: token.created_timestamp,
                market_cap: token.usd_market_cap || 0,
                price: token.price_usd || 0,
                volume_24h: token.volume_24h || 0,
                holders: token.holders || 0,
                price_change_24h: token.price_change_24h || 0,
                is_complete: token.is_complete || false,
                is_raydium: token.is_raydium || false,
                source: 'pumpfun_batch'
            }));
        }
        
        return [];
    } catch (error) {
        console.error('❌ Failed to fetch multiple Pump.fun tokens:', error.message);
        return [];
    }
}

/**
 * Поиск токенов на Pump.fun
 */
async function searchPumpTokens(query, limit = 20) {
    try {
        const response = await axios.get(`${PUMP_FUN_APIS.frontend_v3}/coins/search`, {
            headers: COMMON_HEADERS,
            timeout: 10000,
            params: {
                q: query,
                limit: limit
            }
        });
        
        if (response.data && Array.isArray(response.data)) {
            return response.data.map(token => ({
                mint: token.mint,
                name: token.name || 'Unknown Token',
                symbol: token.symbol || token.mint.substring(0, 4).toUpperCase(),
                description: token.description || '',
                image: token.image_uri || '/img/token-placeholder.png',
                creator: token.creator,
                created_timestamp: token.created_timestamp,
                market_cap: token.usd_market_cap || 0,
                price: token.price_usd || 0,
                volume_24h: token.volume_24h || 0,
                holders: token.holders || 0,
                price_change_24h: token.price_change_24h || 0,
                is_complete: token.is_complete || false,
                is_raydium: token.is_raydium || false,
                source: 'pumpfun_search'
            }));
        }
        
        return [];
    } catch (error) {
        console.error(`❌ Failed to search Pump.fun tokens for "${query}":`, error.message);
        return [];
    }
}

/**
 * Получить самые волатильные токены
 */
async function getVolatileTokens(limit = 20) {
    try {
        const response = await axios.get(`${PUMP_FUN_APIS.volatility_v2}/coins/volatile`, {
            headers: COMMON_HEADERS,
            timeout: 10000,
            params: {
                limit: limit
            }
        });
        
        if (response.data && Array.isArray(response.data)) {
            return response.data.map(token => ({
                mint: token.mint,
                name: token.name || 'Unknown Token',
                symbol: token.symbol || token.mint.substring(0, 4).toUpperCase(),
                description: token.description || '',
                image: token.image_uri || '/img/token-placeholder.png',
                creator: token.creator,
                created_timestamp: token.created_timestamp,
                market_cap: token.usd_market_cap || 0,
                price: token.price_usd || 0,
                volume_24h: token.volume_24h || 0,
                holders: token.holders || 0,
                volatility_score: token.volatility_score || 0,
                price_change_24h: token.price_change_24h || 0,
                is_complete: token.is_complete || false,
                is_raydium: token.is_raydium || false,
                source: 'pumpfun_volatile'
            }));
        }
        
        return [];
    } catch (error) {
        console.error('❌ Failed to fetch volatile tokens:', error.message);
        return [];
    }
}

/**
 * Получить токены созданные конкретным пользователем
 */
async function getUserCreatedTokens(userAddress, limit = 20) {
    try {
        const response = await axios.get(`${PUMP_FUN_APIS.frontend_v3}/coins/user-created-coins/${userAddress}`, {
            headers: COMMON_HEADERS,
            timeout: 10000,
            params: {
                limit: limit
            }
        });
        
        if (response.data && Array.isArray(response.data)) {
            return response.data.map(token => ({
                mint: token.mint,
                name: token.name || 'Unknown Token',
                symbol: token.symbol || token.mint.substring(0, 4).toUpperCase(),
                description: token.description || '',
                image: token.image_uri || '/img/token-placeholder.png',
                creator: token.creator,
                created_timestamp: token.created_timestamp,
                market_cap: token.usd_market_cap || 0,
                price: token.price_usd || 0,
                volume_24h: token.volume_24h || 0,
                holders: token.holders || 0,
                is_complete: token.is_complete || false,
                is_raydium: token.is_raydium || false,
                source: 'pumpfun_user_created'
            }));
        }
        
        return [];
    } catch (error) {
        console.error(`❌ Failed to fetch user created tokens for ${userAddress}:`, error.message);
        return [];
    }
}

/**
 * Проверить является ли токен Pump.fun токеном
 */
async function isPumpFunToken(mint) {
    try {
        const details = await getPumpTokenDetails(mint);
        return details !== null;
    } catch (error) {
        return false;
    }
}

/**
 * Получить свежие токены (созданные за последние N минут)
 */
async function getFreshPumpTokens(minutesAgo = 60, limit = 50) {
    try {
        const latestTokens = await getLatestPumpTokens(limit * 2); // Получаем больше для фильтрации
        
        const cutoffTime = Date.now() - (minutesAgo * 60 * 1000);
        
        const freshTokens = latestTokens.filter(token => {
            if (!token.created_timestamp) return false;
            const createdTime = new Date(token.created_timestamp).getTime();
            return createdTime > cutoffTime;
        }).slice(0, limit);
        
        return freshTokens.map(token => ({
            ...token,
            source: 'pumpfun_fresh'
        }));
    } catch (error) {
        console.error('❌ Failed to fetch fresh Pump.fun tokens:', error.message);
        return [];
    }
}

module.exports = {
    getLatestPumpTokens,
    getCurrentlyLiveTokens,
    getTopRunners,
    getPumpTokenDetails,
    getMultiplePumpTokens,
    searchPumpTokens,
    getVolatileTokens,
    getUserCreatedTokens,
    isPumpFunToken,
    getFreshPumpTokens,
    PUMP_FUN_APIS
};
