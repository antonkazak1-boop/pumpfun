// Token Metadata Enrichment Service
// Интеграция с различными API для получения метаданных токенов

const fetch = require('node-fetch');
const axios = require('axios');

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
 * Получение метаданных токена (асинхронная версия с DexScreener)
 * @param {string} tokenMint 
 * @returns {Promise<Object>}
 */
async function getTokenMetadataAsync(tokenMint) {
    // Проверяем кеш
    if (tokenMetadataCache.has(tokenMint)) {
        const cached = tokenMetadataCache.get(tokenMint);
        // Если это fallback - пытаемся обновить из DexScreener
        if (cached.source !== 'fallback') {
            return cached;
        }
    }

    // Сначала пытаемся получить из DexScreener (молодые токены, Pump.fun)
    const dexData = await fetchFromDexScreener(tokenMint);
    if (dexData) {
        tokenMetadataCache.set(tokenMint, dexData);
        return dexData;
    }

    // Если не нашли - используем синхронную версию (Jupiter + fallback)
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
async function fetchMultipleTokenMetadata(tokenMints) {
    const uniqueTokens = [...new Set(tokenMints)];
    const results = new Map();
    
    // Получаем метаданные параллельно (батчами по 10)
    const batchSize = 10;
    for (let i = 0; i < uniqueTokens.length; i += batchSize) {
        const batch = uniqueTokens.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(async (mint) => {
                const metadata = await getTokenMetadataAsync(mint);
                return [mint, metadata];
            })
        );
        batchResults.forEach(([mint, metadata]) => results.set(mint, metadata));
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
