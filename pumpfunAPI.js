/**
 * Pump.fun API Integration Module
 * 
 * Официального публичного API у Pump.fun нет, но можно использовать:
 * 1. Их публичные данные через Solana RPC
 * 2. DexScreener API для получения данных о токенах на Pump.fun
 * 3. Jupiter API для цен и метаданных
 */

const axios = require('axios');

// Pump.fun program ID на Solana
const PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

/**
 * Получить список новых токенов с Pump.fun через DexScreener
 */
async function getNewPumpTokens(limit = 50) {
    try {
        // DexScreener предоставляет данные о новых токенах на Solana
        const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/latest/solana`, {
            timeout: 10000
        });
        
        if (response.data && response.data.pairs) {
            // Фильтруем только токены с Pump.fun
            const pumpTokens = response.data.pairs
                .filter(pair => pair.dexId === 'raydium' || pair.labels?.includes('pump'))
                .slice(0, limit)
                .map(pair => ({
                    address: pair.baseToken.address,
                    symbol: pair.baseToken.symbol,
                    name: pair.baseToken.name,
                    priceUsd: pair.priceUsd,
                    priceChange24h: pair.priceChange?.h24,
                    volume24h: pair.volume?.h24,
                    liquidity: pair.liquidity?.usd,
                    marketCap: pair.fdv,
                    createdAt: pair.pairCreatedAt,
                    url: pair.url
                }));
            
            return pumpTokens;
        }
        
        return [];
    } catch (error) {
        console.error('❌ Failed to fetch Pump.fun tokens from DexScreener:', error.message);
        return [];
    }
}

/**
 * Получить детали токена с Pump.fun
 */
async function getPumpTokenDetails(tokenAddress) {
    try {
        const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`, {
            timeout: 10000
        });
        
        if (response.data && response.data.pairs && response.data.pairs.length > 0) {
            const pair = response.data.pairs[0];
            return {
                address: pair.baseToken.address,
                symbol: pair.baseToken.symbol,
                name: pair.baseToken.name,
                priceUsd: pair.priceUsd,
                priceChange: {
                    m5: pair.priceChange?.m5,
                    h1: pair.priceChange?.h1,
                    h6: pair.priceChange?.h6,
                    h24: pair.priceChange?.h24
                },
                volume: {
                    m5: pair.volume?.m5,
                    h1: pair.volume?.h1,
                    h6: pair.volume?.h6,
                    h24: pair.volume?.h24
                },
                txns: {
                    m5: pair.txns?.m5,
                    h1: pair.txns?.h1,
                    h6: pair.txns?.h6,
                    h24: pair.txns?.h24
                },
                liquidity: pair.liquidity?.usd,
                marketCap: pair.fdv,
                createdAt: pair.pairCreatedAt,
                url: pair.url
            };
        }
        
        return null;
    } catch (error) {
        console.error(`❌ Failed to fetch token details for ${tokenAddress}:`, error.message);
        return null;
    }
}

/**
 * Получить топ токенов по volume за последние 24 часа
 */
async function getTopPumpTokensByVolume(limit = 20) {
    try {
        const response = await axios.get(`https://api.dexscreener.com/latest/dex/search?q=pump.fun`, {
            timeout: 10000
        });
        
        if (response.data && response.data.pairs) {
            const topTokens = response.data.pairs
                .filter(pair => pair.volume?.h24 > 0)
                .sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
                .slice(0, limit)
                .map(pair => ({
                    address: pair.baseToken.address,
                    symbol: pair.baseToken.symbol,
                    name: pair.baseToken.name,
                    priceUsd: pair.priceUsd,
                    volume24h: pair.volume?.h24,
                    priceChange24h: pair.priceChange?.h24,
                    marketCap: pair.fdv,
                    liquidity: pair.liquidity?.usd,
                    txns24h: (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0)
                }));
            
            return topTokens;
        }
        
        return [];
    } catch (error) {
        console.error('❌ Failed to fetch top Pump.fun tokens:', error.message);
        return [];
    }
}

/**
 * Проверить является ли токен с Pump.fun
 */
async function isPumpFunToken(tokenAddress) {
    try {
        const details = await getPumpTokenDetails(tokenAddress);
        return details !== null;
    } catch (error) {
        return false;
    }
}

/**
 * Получить trending токены (по объему и изменению цены)
 */
async function getTrendingPumpTokens(limit = 15) {
    try {
        const tokens = await getTopPumpTokensByVolume(50);
        
        // Фильтруем по критериям: высокий volume + положительное изменение цены
        const trending = tokens
            .filter(token => token.priceChange24h > 0 && token.volume24h > 1000)
            .sort((a, b) => {
                // Сортируем по комбинации volume и price change
                const scoreA = (a.volume24h || 0) * (1 + (a.priceChange24h || 0) / 100);
                const scoreB = (b.volume24h || 0) * (1 + (b.priceChange24h || 0) / 100);
                return scoreB - scoreA;
            })
            .slice(0, limit);
        
        return trending;
    } catch (error) {
        console.error('❌ Failed to fetch trending tokens:', error.message);
        return [];
    }
}

/**
 * Получить статистику по токену за разные периоды
 */
async function getTokenStats(tokenAddress) {
    try {
        const details = await getPumpTokenDetails(tokenAddress);
        if (!details) return null;
        
        return {
            address: tokenAddress,
            symbol: details.symbol,
            name: details.name,
            price: details.priceUsd,
            marketCap: details.marketCap,
            liquidity: details.liquidity,
            stats: {
                '5m': {
                    priceChange: details.priceChange?.m5,
                    volume: details.volume?.m5,
                    buys: details.txns?.m5?.buys,
                    sells: details.txns?.m5?.sells
                },
                '1h': {
                    priceChange: details.priceChange?.h1,
                    volume: details.volume?.h1,
                    buys: details.txns?.h1?.buys,
                    sells: details.txns?.h1?.sells
                },
                '6h': {
                    priceChange: details.priceChange?.h6,
                    volume: details.volume?.h6,
                    buys: details.txns?.h6?.buys,
                    sells: details.txns?.h6?.sells
                },
                '24h': {
                    priceChange: details.priceChange?.h24,
                    volume: details.volume?.h24,
                    buys: details.txns?.h24?.buys,
                    sells: details.txns?.h24?.sells
                }
            },
            url: details.url
        };
    } catch (error) {
        console.error(`❌ Failed to fetch token stats for ${tokenAddress}:`, error.message);
        return null;
    }
}

module.exports = {
    getNewPumpTokens,
    getPumpTokenDetails,
    getTopPumpTokensByVolume,
    isPumpFunToken,
    getTrendingPumpTokens,
    getTokenStats,
    PUMP_FUN_PROGRAM
};

