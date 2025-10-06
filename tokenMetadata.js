// Token Metadata Enrichment Service
// Интеграция с различными API для получения метаданных токенов

const fetch = require('node-fetch');
const axios = require('axios');
const { 
    getPumpTokenDetails, 
    getMultiplePumpTokens,
    isPumpFunToken 
} = require('./pumpfunRealAPI');

// Кеш для избежания повторных запросов
const tokenMetadataCache = new Map();

// Jupiter Token List для основных токенов Solana
const JUPITER_TOKEN_LIST = 'https://token.jup.ag/strict';

// DexScreener API для Pump.fun и других токенов
const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens';

// Кешированный список токенов Jupiter
let jupiterTokens = null;

/**
 * Инициализация - загрузка токенов из Jupiter
 */
async function initializeTokenMetadata() {
    try {
        console.log('🪙 Loading Jupiter token list...');
        const response = await fetch(JUPITER_TOKEN_LIST);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        jupiterTokens = await response.json();
        
        if (!Array.isArray(jupiterTokens)) {
            throw new Error('Invalid token list format received');
        }
        
        console.log(`✅ Loaded ${jupiterTokens.length} token metadata records`);
        return true;
    } catch (error) {
        console.error('❌ Failed to load Jupiter token list:', error.message);
        jupiterTokens = [];
        console.log('🔄 Token metadata service will work with empty list (fallback to address-only mode)');
        return false;
    }
}

/**
 * Получение метаданных токена из DexScreener (для Pump.fun и молодых токенов)
 * @param {string} tokenMint 
 * @returns {Promise<Object|null>}
 */
async function fetchFromDexScreener(tokenMint) {
    try {
        const response = await axios.get(`${DEXSCREENER_API}/${tokenMint}`, {
            timeout: 5000
        });
        
        if (response.data && response.data.pairs && response.data.pairs.length > 0) {
            const pair = response.data.pairs[0];
            const token = pair.baseToken;
            
            return {
                address: token.address,
                name: token.name || 'Unknown Token',
                symbol: token.symbol || tokenMint.slice(0, 4).toUpperCase(),
                image: pair.info?.imageUrl || '/img/token-placeholder.png',
                decimals: 6,
                price: parseFloat(pair.priceUsd) || 0,
                priceChange: pair.priceChange?.h24 || 0,
                market_cap: parseFloat(pair.fdv) || 0,
                liquidity: parseFloat(pair.liquidity?.usd) || 0,
                volume24h: parseFloat(pair.volume?.h24) || 0,
                verified: false,
                source: 'dexscreener'
            };
        }
        
        return null;
    } catch (error) {
        // Не логируем ошибку - это нормально если токен не найден
        return null;
    }
}

/**
 * Получение метаданных токена по адресу (синхронная версия для кеша)
 * @param {string} tokenMint - Адрес токена на Solana
 * @returns {Object} Metadata объект
 */
function getTokenMetadata(tokenMint) {
    // Проверяем кеш
    if (tokenMetadataCache.has(tokenMint)) {
        return tokenMetadataCache.get(tokenMint);
    }

    // Ищем в Jupiter Token List
    const token = jupiterTokens?.find(t => t.address === tokenMint);
    
    let metadata = {
        address: tokenMint,
        name: 'Unknown Token',
        symbol: tokenMint.slice(0, 4).toUpperCase() + '...',
        image: '/img/token-placeholder.png',
        decimals: 6,
        price: 0,
        priceChange: 0,
        market_cap: 0,
        source: 'fallback'
    };

    if (token) {
        metadata = {
            address: token.address,
            name: token.name || token.symbol || 'Unknown Token',
            symbol: token.symbol || tokenMint.slice(0, 4).toUpperCase(),
            image: token.logoURI || '/img/token-placeholder.png',
            decimals: token.decimals || 6,
            price: 0,
            priceChange: 0,
            market_cap: 0,
            tags: token.tags || [],
            verified: token.verified || false,
            source: 'jupiter'
        };
    }

    // Кешируем результат
    tokenMetadataCache.set(tokenMint, metadata);
    return metadata;
}

/**
 * Получение метаданных токена из Pump.fun API (для новых токенов)
 * @param {string} tokenMint 
 * @returns {Promise<Object|null>}
 */
async function fetchFromPumpFun(tokenMint) {
    try {
        const pumpData = await getPumpTokenDetails(tokenMint);
        if (pumpData) {
            return {
                address: pumpData.mint,
                name: pumpData.name || 'Unknown Token',
                symbol: pumpData.symbol || tokenMint.slice(0, 4).toUpperCase(),
                image: pumpData.image || '/img/token-placeholder.png',
                decimals: 6,
                price: pumpData.price || 0,
                priceChange: pumpData.price_change_24h || 0,
                market_cap: pumpData.market_cap || 0,
                volume24h: pumpData.volume_24h || 0,
                holders: pumpData.holders || 0,
                verified: false,
                source: 'pumpfun_direct',
                creator: pumpData.creator,
                created_timestamp: pumpData.created_timestamp,
                is_complete: pumpData.is_complete,
                is_raydium: pumpData.is_raydium
            };
        }
        return null;
    } catch (error) {
        // Не логируем ошибку - это нормально если токен не найден
        return null;
    }
}

/**
 * Получение метаданных токена (асинхронная версия с Pump.fun + DexScreener)
 * @param {string} tokenMint 
 * @returns {Promise<Object>}
 */
async function getTokenMetadataAsync(tokenMint) {
    // Проверяем кеш
    if (tokenMetadataCache.has(tokenMint)) {
        const cached = tokenMetadataCache.get(tokenMint);
        // Если это fallback - пытаемся обновить из Pump.fun или DexScreener
        if (cached.source !== 'fallback') {
            return cached;
        }
    }

    // 1. Сначала пытаемся получить из Pump.fun API (новые токены)
    const pumpData = await fetchFromPumpFun(tokenMint);
    if (pumpData) {
        tokenMetadataCache.set(tokenMint, pumpData);
        return pumpData;
    }

    // 2. Если не нашли в Pump.fun - пытаемся DexScreener (DEX токены)
    const dexData = await fetchFromDexScreener(tokenMint);
    if (dexData) {
        tokenMetadataCache.set(tokenMint, dexData);
        return dexData;
    }

    // 3. Если не нашли - используем синхронную версию (Jupiter + fallback)
    return getTokenMetadata(tokenMint);
}

/**
 * Получение цены токена через Jupiter API
 * @param {string} tokenMint - Адрес токена
 * @returns {Promise<number>} Цена в USD
 */
async function getTokenPrice(tokenMint) {
    try {
        const response = await fetch(`https://price.jup.ag/v4/price?ids=${tokenMint}`);
        const data = await response.json();
        return data.data?.[tokenMint]?.price || 0;
    } catch (error) {
        console.error(`❌ Failed to get price for ${tokenMint}:`, error);
        return 0;
    }
}

/**
 * Обогащение данных транзакции метаданными токенов
 * @param {Array} transactions - Массив транзакций
 * @returns {Promise<Array>} Обогащенные данные
 */
async function enrichTransactionData(transactions) {
    if (!transactions || !Array.isArray(transactions)) {
        return transactions;
    }

    const enrichedData = await Promise.all(
        transactions.map(async (tx) => {
            const tokenMetadata = getTokenMetadata(tx.token_mint);
            
            // Получаем цену токена если нужна стоимость
            let tokenPrice = 0;
            if (tx.needs_price_lookup) {
                tokenPrice = await getTokenPrice(tx.token_mint);
            }

            return {
                ...tx,
                token_name: tokenMetadata.name,
                token_symbol: tokenMetadata.symbol,
                token_image: tokenMetadata.image,
                token_decimals: tokenMetadata.decimals,
                token_price: tokenPrice,
                token_verified: tokenMetadata.verified || false
            };
        })
    );

    return enrichedData;
}

/**
 * Получение символа токена для отображения
 * @param {string} tokenMint 
 * @returns {string} Символ токена
 */
function getTokenSymbol(tokenMint) {
    const metadata = getTokenMetadata(tokenMint);
    return metadata.symbol;
}

/**
 * Получение имени токена
 * @param {string} tokenMint 
 * @returns {string} Имя токена
 */
function getTokenName(tokenMint) {
    const metadata = getTokenMetadata(tokenMint);
    return metadata.name;
}

/**
 * Получение URL аватарки токена
 * @param {string} tokenMint 
 * @returns {string} URL аватарки
 */
function getTokenImage(tokenMint) {
    const metadata = getTokenMetadata(tokenMint);
    return metadata.image;
}

/**
 * Массовое получение метаданных для списка токенов
 * @param {Array<string>} tokenMints 
 * @returns {Promise<Map>}
 */
async function fetchMultipleTokenMetadata(tokenMints, pool = null) {
    const uniqueTokens = [...new Set(tokenMints)];
    const results = new Map();
    
    // Сначала проверяем кэш в базе данных
    try {
        let dbPool = pool;
        let shouldClosePool = false;
        
        if (!dbPool) {
            const { Pool } = require('pg');
            dbPool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
            });
            shouldClosePool = true;
        }
        
        const cachedTokens = await getCachedTokens(uniqueTokens, dbPool);
        const uncachedTokens = uniqueTokens.filter(mint => !cachedTokens.has(mint));
        
        console.log(`✅ Found ${cachedTokens.size} cached tokens, fetching ${uncachedTokens.length} new ones`);
        
        // Добавляем кэшированные токены в результаты
        cachedTokens.forEach((metadata, mint) => {
            results.set(mint, metadata);
        });
        
        if (uncachedTokens.length === 0) {
            if (shouldClosePool) await dbPool.end();
            return results;
        }
        
        // Получаем метаданные для некэшированных токенов
        const newMetadata = await fetchNewTokenMetadata(uncachedTokens);
        
        // Кэшируем новые метаданные
        for (const [tokenMint, metadata] of newMetadata) {
            await cacheTokenMetadata(tokenMint, metadata, dbPool);
            results.set(tokenMint, metadata);
        }
        
        if (shouldClosePool) await dbPool.end();
        console.log(`✅ Total metadata: ${results.size} tokens (${cachedTokens.size} cached, ${newMetadata.size} new)`);
        return results;
        
    } catch (error) {
        console.error('❌ Cache error, falling back to direct fetch:', error);
        return await fetchNewTokenMetadata(uniqueTokens);
    }
}

// Функция для получения кэшированных токенов из БД
async function getCachedTokens(tokenMints, pool) {
    try {
        const result = await pool.query(
            'SELECT address, symbol, name, image, market_cap, price, source FROM tokens WHERE address = ANY($1)',
            [tokenMints]
        );
        
        const tokenMap = new Map();
        result.rows.forEach(row => {
            tokenMap.set(row.address, {
                address: row.address,
                symbol: row.symbol,
                name: row.name,
                image: row.image,
                market_cap: row.market_cap,
                price: row.price,
                source: row.source || 'fallback'
            });
        });
        
        return tokenMap;
    } catch (error) {
        console.error('❌ Token retrieval error:', error);
        return new Map();
    }
}

// Функция для кэширования токенов в БД
async function cacheTokenMetadata(tokenMint, metadata, pool) {
    try {
        if (!pool) {
            console.log('⚠️ Database pool not available, skipping token cache');
            return;
        }
        
        await pool.query(
            `INSERT INTO tokens (address, symbol, name, image, market_cap, price, source, last_updated)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
             ON CONFLICT (address) 
             DO UPDATE SET 
                 symbol = EXCLUDED.symbol,
                 name = EXCLUDED.name,
                 image = EXCLUDED.image,
                 market_cap = EXCLUDED.market_cap,
                 price = EXCLUDED.price,
                 source = EXCLUDED.source,
                 last_updated = NOW()`,
            [
                tokenMint,
                metadata.symbol,
                metadata.name,
                metadata.image,
                metadata.market_cap,
                metadata.price,
                metadata.source
            ]
        );
    } catch (error) {
        if (error.code === 'ENETUNREACH' || error.code === 'ECONNREFUSED') {
            console.log('⚠️ Database connection unavailable, token cache skipped');
        } else {
            console.error('❌ Token cache error:', error.message);
        }
    }
}

// Функция для получения новых метаданных токенов
async function fetchNewTokenMetadata(tokenMints) {
    const results = new Map();
    
    // Сначала пытаемся получить через Pump.fun API (батчевый запрос)
    try {
        console.log(`🔥 Trying Pump.fun batch API for ${tokenMints.length} tokens...`);
        const pumpResults = await getMultiplePumpTokens(tokenMints);
        
        // Добавляем результаты из Pump.fun
        pumpResults.forEach(token => {
            const metadata = {
                address: token.mint,
                name: token.name || 'Unknown Token',
                symbol: token.symbol || token.mint.slice(0, 4).toUpperCase(),
                image: token.image || '/img/token-placeholder.png',
                decimals: 6,
                price: token.price || 0,
                priceChange: token.price_change_24h || 0,
                market_cap: token.market_cap || 0,
                volume24h: token.volume_24h || 0,
                holders: token.holders || 0,
                verified: false,
                source: 'pumpfun_batch',
                creator: token.creator,
                created_timestamp: token.created_timestamp,
                is_complete: token.is_complete,
                is_raydium: token.is_raydium
            };
            results.set(token.mint, metadata);
        });
        
        console.log(`✅ Pump.fun batch: found ${pumpResults.length} tokens`);
    } catch (error) {
        console.log(`⚠️ Pump.fun batch failed: ${error.message}`);
    }
    
    // Для токенов которые не нашли в Pump.fun - получаем индивидуально
    const notFoundTokens = tokenMints.filter(mint => !results.has(mint));
    
    if (notFoundTokens.length > 0) {
        console.log(`🔍 Fetching individual metadata for ${notFoundTokens.length} remaining tokens...`);
        
        // Получаем метаданные параллельно (батчами по 10)
        const batchSize = 10;
        for (let i = 0; i < notFoundTokens.length; i += batchSize) {
            const batch = notFoundTokens.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(async (mint) => {
                    const metadata = await getTokenMetadataAsync(mint);
                    return [mint, metadata];
                })
            );
            batchResults.forEach(([mint, metadata]) => results.set(mint, metadata));
        }
    }
    
    return results;
}

module.exports = {
    initializeTokenMetadata,
    getTokenMetadata,
    getTokenMetadataAsync,
    getTokenPrice,
    enrichTransactionData,
    getTokenSymbol,
    getTokenName,
    getTokenImage,
    fetchMultipleTokenMetadata,
    fetchFromDexScreener
};
