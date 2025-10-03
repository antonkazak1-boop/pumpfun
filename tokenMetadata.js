// Token Metadata Enrichment Service
// Интеграция с различными API для получения метаданных токенов

const fetch = require('node-fetch');

// Кеш для избежания повторных запросов
const tokenMetadataCache = new Map();

// Jupiter Token List для основных токенов Solana
const JUPITER_TOKEN_LIST = 'https://token.jup.ag/strict';

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
 * Получение метаданных токена по адресу
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
        priceChange: 0
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
            tags: token.tags || [],
            verified: token.verified || false
        };
    }

    // Кешируем результат
    tokenMetadataCache.set(tokenMint, metadata);
    return metadata;
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

module.exports = {
    initializeTokenMetadata,
    getTokenMetadata,
    getTokenPrice,
    enrichTransactionData,
    getTokenSymbol,
    getTokenName,
    getTokenImage
};
