const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const axios = require('axios');

// Импорт wallet map модуля
const { resolveWalletMeta } = require('./walletMap');
const { 
    initializeTokenMetadata, 
    enrichTransactionData, 
    getTokenMetadata, 
    getTokenMetadataAsync,
    fetchMultipleTokenMetadata 
} = require('./tokenMetadata');
const { 
    getNewPumpTokens, 
    getPumpTokenDetails, 
    getTopPumpTokensByVolume,
    getTrendingPumpTokens,
    getTokenStats
} = require('./pumpfunAPI');

const {
    getLatestPumpTokens,
    getCurrentlyLiveTokens,
    getTopRunners,
    getFreshPumpTokens,
    getVolatileTokens,
    searchPumpTokens
} = require('./pumpfunRealAPI');

// Pump.fun API endpoints
const FRONTEND_API_V3 = 'https://frontend-api-v3.pump.fun';

// Helper функция для обогащения данных информацией о кошельках
function enrichWalletData(data) {
    if (!data) return data;
    
    if (Array.isArray(data)) {
        return data.map(item => {
            const walletMeta = resolveWalletMeta(item.wallet);
            return {
                ...item,
                wallet_name: walletMeta.wallet_name,
                wallet_telegram: walletMeta.wallet_telegram,
                wallet_twitter: walletMeta.wallet_twitter
            };
        });
    } else {
        const walletMeta = resolveWalletMeta(data.wallet);
        return {
            ...data,
            wallet_name: walletMeta.wallet_name,
            wallet_telegram: walletMeta.wallet_telegram,
            wallet_twitter: walletMeta.wallet_twitter
        };
    }
}

// Функция для расчета Win Rate
function calculateWinRate(tokenPnl) {
    if (!tokenPnl || tokenPnl.length === 0) return 0;
    const profitableTrades = tokenPnl.filter(token => token.pnl_sol > 0).length;
    return Math.round((profitableTrades / tokenPnl.length) * 100);
}

// Функция для расчета средней продолжительности от покупки до первой продажи
async function calculateAvgDuration(wallet, timeInterval) {
    try {
        const query = `
            WITH token_trades AS (
                SELECT 
                    token_mint,
                    side,
                    ts,
                    ROW_NUMBER() OVER (PARTITION BY token_mint ORDER BY ts) as trade_sequence
                FROM events 
                WHERE wallet = $1 AND ts >= NOW() - INTERVAL '${timeInterval}'
                ORDER BY token_mint, ts
            ),
            buy_sell_pairs AS (
                SELECT 
                    b.token_mint,
                    b.ts as buy_time,
                    s.ts as sell_time,
                    EXTRACT(EPOCH FROM (s.ts - b.ts)) / 60 as duration_minutes
                FROM token_trades b
                JOIN token_trades s ON b.token_mint = s.token_mint 
                    AND s.trade_sequence = (
                        SELECT MIN(trade_sequence) 
                        FROM token_trades 
                        WHERE token_mint = b.token_mint 
                            AND side = 'SELL' 
                            AND trade_sequence > b.trade_sequence
                    )
                WHERE b.side = 'BUY' AND s.side = 'SELL'
                    AND s.ts > b.ts
            )
            SELECT AVG(duration_minutes) as avg_duration
            FROM buy_sell_pairs
            WHERE duration_minutes > 0;
        `;
        
        const result = await pool.query(query, [wallet]);
        const avgDuration = result.rows[0]?.avg_duration;
        
        return avgDuration ? Math.round(avgDuration) : 0;
    } catch (error) {
        console.error('❌ Error calculating avg duration:', error);
        return 0;
    }
}

// Функция для получения актуальной цены SOL
async function getSOLPrice() {
    try {
        // Пытаемся получить цену из Pump.fun API
        const response = await fetch('https://frontend-api-v3.pump.fun/coins/So11111111111111111111111111111111111111112');
        if (response.ok) {
            const data = await response.json();
            return data.usd_market_cap / data.total_supply; // Примерный расчет цены
        }
    } catch (error) {
        console.log('⚠️ Failed to get SOL price from Pump.fun, using fallback');
    }
    
    // Fallback - получаем цену из CoinGecko
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        if (response.ok) {
            const data = await response.json();
            return data.solana.usd;
        }
    } catch (error) {
        console.log('⚠️ Failed to get SOL price from CoinGecko, using default');
    }
    
    // Последний fallback
    return 227.96;
}

// Функция для расчета объема в USD (используем актуальную цену SOL)
async function calculateVolumeUSD(totalVolumeSOL) {
    const solPrice = await getSOLPrice();
    return totalVolumeSOL * solPrice;
}

// Функция для получения периода времени для фильтра
function getTimeInterval(period) {
    switch (period) {
        case '1d': return '1 day';
        case '3d': return '3 days';
        case '7d': return '7 days';
        case '14d': return '14 days';
        case '30d': return '30 days';
        default: return '30 days';
    }
}

// Функция для фильтрации трейдеров по типу (серверная версия)
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

// Функция для кэширования данных
async function cacheData(key, data, ttlMinutes = 15) {
    try {
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
        await pool.query(
            'INSERT INTO analytics_cache (cache_key, data, expires_at) VALUES ($1, $2, $3) ON CONFLICT (cache_key) DO UPDATE SET data = $2, expires_at = $3',
            [key, JSON.stringify(data), expiresAt]
        );
        console.log(`✅ Cached data for key: ${key}`);
    } catch (error) {
        console.error('❌ Cache error:', error);
    }
}

// Функция для получения данных из кэша
async function getCachedData(key) {
    try {
        const result = await pool.query(
            'SELECT data FROM analytics_cache WHERE cache_key = $1 AND expires_at > NOW()',
            [key]
        );
        
        if (result.rows.length > 0) {
            console.log(`✅ Cache hit for key: ${key}`);
            return JSON.parse(result.rows[0].data);
        }
        
        console.log(`❌ Cache miss for key: ${key}`);
        return null;
    } catch (error) {
        console.error('❌ Cache retrieval error:', error);
        return null;
    }
}

// Функция для кэширования токенов
async function cacheTokenMetadata(tokenMint, metadata) {
    try {
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
        console.error('❌ Token cache error:', error);
    }
}

// Функция для получения кэшированных токенов
async function getCachedTokens(tokenMints) {
    try {
        const result = await pool.query(
            'SELECT address, symbol, name, image, market_cap, price, source FROM tokens WHERE address = ANY($1)',
            [tokenMints]
        );
        
        const tokenMap = new Map();
        result.rows.forEach(row => {
            tokenMap.set(row.address, {
                symbol: row.symbol,
                name: row.name,
                image: row.image,
                market_cap: row.market_cap,
                price: row.price,
                source: row.source
            });
        });
        
        return tokenMap;
    } catch (error) {
        console.error('❌ Token retrieval error:', error);
        return new Map();
    }
}

const app = express();
const port = process.env.PORT || 3000;

// Подключение к Supabase pooler (как в n8n)
let pool;
// Всегда используем pooler - переопределяем DATABASE_URL если она есть
pool = new Pool({
    user: 'postgres.gzwxdmoqntnninlqpmmw',
    host: 'aws-1-eu-north-1.pooler.supabase.com',
    database: 'postgres',
    password: 'FedorAnnaSemen123',
    port: 5432,
    ssl: false,  // Отключаем SSL как в твоих настройках n8n
    max: 100    // Максимальное количество подключений
});

// Тест подключения и инициализация таблицы
console.log('Testing database connection...');
pool.query('SELECT NOW() as current_time').then(async result => {
    console.log('✅ Database connection successful! Time:', result.rows[0].current_time);
    
    // Проверяем и инициализируем таблицу events
    await initializeEventsTable();
}).catch(error => {
    console.error('❌ Database connection failed:', error.message);
});

async function initializeEventsTable() {
    try {
        // Проверяем существование таблицы events
        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'events' 
            ORDER BY ordinal_position
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ Table events does not exist, creating...');
            await createEventsTable();
        } else {
            console.log('✅ Table events exists with', result.rows.length, 'columns');
            console.log('Table schema:', result.rows.map(row => `${row.column_name} (${row.data_type})`).join(', '));
        }
    } catch (error) {
        console.log('❌ Error checking table events:', error.message);
        console.log('Creating table events...');
        await createEventsTable();
    }
}

async function createEventsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS events (
                id bigserial primary key,
                ts timestamptz not null,
                wallet text not null,
                wallet_name text,
                wallet_telegram text,
                wallet_twitter text,
                token_mint text,
                token_amount numeric,
                sol_spent numeric,
                sol_received numeric,
                side text,
                dex text,
                tx_signature text,
                usd_value numeric,
                usd_estimate numeric,
                created_at timestamptz default now()
            );
        `);
        console.log('✅ Table events created successfully');
    } catch (error) {
        console.error('❌ Failed to create table events:', error.message);
    }
}


// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Helper functions из n8n parse node ---

function toSol(lamports) {
    return Number(lamports || 0) / 1e9;
}

function first(arr, pred) {
    if (!Array.isArray(arr)) return undefined;
    for (let i = 0; i < arr.length; i++) if (pred(arr[i])) return arr[i];
}

function pickWallet(ev, tracked) {
    if (ev.feePayer) return ev.feePayer;
    if (tracked && tracked.size > 0) {
        const accs = Array.isArray(ev.accountData) ? ev.accountData : [];
        for (const a of accs) if (tracked.has(a.account)) return a.account;
    }
    const tt = ev.tokenTransfers || [];
    if (tt.length) return tt[0].toUserAccount || tt[0].fromUserAccount || null;
    return null;
}

function nativeDeltaFor(ev, wallet) {
    if (!wallet) return 0;
    const accs = ev.accountData || [];
    const found = accs.find(a => a.account === wallet);
    return found ? toSol(found.nativeBalanceChange || 0) : 0;
}

function readTokenAmount(obj) {
    if (obj?.rawTokenAmount?.decimals != null && obj.rawTokenAmount.tokenAmount != null) {
        return Number(obj.rawTokenAmount.tokenAmount) / Math.pow(10, Number(obj.rawTokenAmount.decimals));
    }
    return Number(obj?.tokenAmount || 0);
}

function extractTokenLeg(ev, wallet) {
    const out = { side: 'EVENT', token_mint: null, token_amount: null };
    const tt = ev.tokenTransfers || [];

    if (ev.type === 'SWAP') {
        const buyLeg  = first(tt, t => t.toUserAccount === wallet && Number(t.tokenAmount) > 0);
        const sellLeg = first(tt, t => t.fromUserAccount === wallet && Number(t.tokenAmount) > 0);
        if (buyLeg) return { side: 'BUY', token_mint: buyLeg.mint, token_amount: readTokenAmount(buyLeg) };
        if (sellLeg) return { side: 'SELL', token_mint: sellLeg.mint, token_amount: readTokenAmount(sellLeg) };
        if (tt[0]) return { side: 'EVENT', token_mint: tt[0].mint, token_amount: readTokenAmount(tt[0]) };
        return out;
    }

    if (ev.type === 'TRANSFER') {
        if (tt[0]) return { side: 'TRANSFER', token_mint: tt[0].mint, token_amount: Math.abs(readTokenAmount(tt[0])) };
        return { side: 'TRANSFER', token_mint: 'So11111111111111111111111111111111111111112', token_amount: Math.abs(nativeDeltaFor(ev, wallet)) };
    }

    if (ev.type === 'NFT_SALE') {
        const nft = first(tt, t => t.tokenStandard === 'NonFungible') || tt[0];
        return { side: 'NFT_SALE', token_mint: nft?.mint, token_amount: Number(nft?.tokenAmount || 1) };
    }

    if (tt[0]) return { side: ev.type || 'EVENT', token_mint: tt[0].mint, token_amount: readTokenAmount(tt[0]) };
    return out;
}

// --- Webhook endpoint из n8n ---

app.post('/webhook/helius', async (req, res) => {
    try {
        console.log('Received webhook:', req.body);
        
        // Обрабатываем входящие данные как в n8n
        let body = [];
        if (Array.isArray(req.body)) {
            body = req.body;
        } else if (Array.isArray(req.body?.body)) {
            body = req.body.body;
        } else if (req.body && typeof req.body === 'object') {
            body = [req.body];
        }

        if (!Array.isArray(body) || body.length === 0) {
            return res.status(400).json({ success: false, error: 'Empty body' });
        }

        const TRACKED = new Set(); // optional: fill if needed
        const rows = [];

        for (const ev of body) {
            if (!ev || typeof ev !== 'object') continue;
            
            const wallet = pickWallet(ev, TRACKED);
            const leg = extractTokenLeg(ev, wallet);
            const solDelta = nativeDeltaFor(ev, wallet);

            // определяем SOL spent/received как в n8n
            let sol_spent = null;
            let sol_received = null;
            if (leg.side === 'BUY') sol_spent = Math.abs(solDelta);
            if (leg.side === 'SELL') sol_received = Math.abs(solDelta);

            // получаем метаданные wallet из нашего модуля
            const { wallet_name, wallet_telegram, wallet_twitter } = resolveWalletMeta(wallet);

            rows.push({
                tx_signature: ev.signature || null,
                ts: ev.timestamp ? new Date(ev.timestamp * 1000).toISOString() : new Date().toISOString(),
                dex: ev.source || null,
                wallet: wallet || null,
                side: leg.side,
                token_mint: leg.token_mint,
                token_amount: leg.token_amount,
                sol_spent,
                sol_received,
                usd_value: ev.usdValue ?? null,
                wallet_name,
                wallet_telegram,
                wallet_twitter,
            });

            console.log(`✅ Parsed event: ${ev.source} ${leg.side} ${leg.token_mint} - wallet: ${wallet || 'unknown'}`);
        }

        if (rows.length === 0) {
            return res.status(200).json({ success: true, inserted: 0 });
        }

        // Bulk insert с базовой дедупликацией по tx_signature + token_mint + side
                const columns = [
                    'tx_signature','ts','dex','wallet','side','token_mint','token_amount','sol_spent','sol_received','usd_value','wallet_name','wallet_telegram','wallet_twitter'
                ];
        
        const values = [];
        const params = [];
        let idx = 1;
        
        for (const r of rows) {
            values.push(`(${columns.map(() => `$${idx++}`).join(',')})`);
            params.push(
                r.tx_signature,
                r.ts,
                r.dex,
                r.wallet,
                r.side,
                r.token_mint,
                r.token_amount,
                r.sol_spent,
                r.sol_received,
                r.usd_value,
                r.wallet_name,
                r.wallet_telegram,
                r.wallet_twitter,
            );
        }

                const insertSql = `
                    INSERT INTO events (${columns.join(',')})
                    VALUES ${values.join(',')}
                    ON CONFLICT (id) DO NOTHING;
                `;

        await pool.query(insertSql, params);

        console.log(`Inserted ${rows.length} events`);
        return res.status(200).json({ success: true, inserted: rows.length });
        
    } catch (error) {
        console.error('Webhook error:', error);
        return res.status(500).json({ success: false, error: 'Webhook processing error' });
    }
});

// --- API endpoints ---

app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({
            success: true,
            database: 'connected',
            timestamp: result.rows[0].now
        });
    } catch (error) {
        console.error('Health check error:', error);
    res.status(500).json({ 
            success: false,
            database: 'disconnected',
            error: error.message
        });
    }
});

// Добавляем все остальные API endpoints из основного server.js...
app.get('/api/clusterbuy', async (req, res) => {
    try {
        const query = `
            SELECT token_mint, COUNT(*) as purchase_count, MAX(ts) as latest_purchase
            FROM events
            WHERE side = 'BUY' AND ts >= NOW() - INTERVAL '24 hours'
            GROUP BY token_mint
            HAVING COUNT(*) >= 10
            ORDER BY purchase_count DESC, latest_purchase DESC
            LIMIT 100;
        `;
        const result = await pool.query(query);
        
        // Массово получаем метаданные через Pump.fun + DexScreener + Jupiter
        const tokenMints = result.rows.map(row => row.token_mint);
        const metadataMap = await fetchMultipleTokenMetadata(tokenMints);
        
        // Обогащаем данные метаданными токенов
        const enrichedData = result.rows.map((item) => {
            const tokenMeta = metadataMap.get(item.token_mint) || getTokenMetadata(item.token_mint);
            return {
                ...item,
                symbol: tokenMeta?.symbol || item.token_mint.substring(0, 8),
                name: tokenMeta?.name || 'Unknown Token',
                image: tokenMeta?.image || '/img/token-placeholder.png',
                price: tokenMeta?.price || 0,
                market_cap: tokenMeta?.market_cap || 0
            };
        });
        
        res.json({ success: true, data: enrichedData });
    } catch (error) {
        console.error('Clusterbuy error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// === Все остальные API endpoints ===

app.get('/api/whalemoves', async (req, res) => {
    try {
        const query = `
            SELECT token_mint, wallet, sol_spent, ts
            FROM events
            WHERE side = 'BUY' AND sol_spent > 10 AND ts >= NOW() - INTERVAL '2 hours'
            ORDER BY sol_spent DESC, ts DESC
            LIMIT 100;
        `;
        const result = await pool.query(query);
        let enrichedData = enrichWalletData(result.rows);
        enrichedData = await enrichTransactionData(enrichedData);
        res.json({ success: true, data: enrichedData });
    } catch (error) {
        console.error('Whalemoves error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/volumesurge', async (req, res) => {
    try {
        const query = `
            SELECT token_mint, SUM(sol_spent) as total_volume, COUNT(*) as tx_count
                FROM events
            WHERE side = 'BUY' AND ts >= NOW() - INTERVAL '2 hours'
                GROUP BY token_mint
            HAVING SUM(sol_spent) > 10
            ORDER BY total_volume DESC
            LIMIT 100;
        `;
        const result = await pool.query(query);
        
        // Массово получаем метаданные через Pump.fun + DexScreener + Jupiter
        const tokenMints = result.rows.map(row => row.token_mint);
        const metadataMap = await fetchMultipleTokenMetadata(tokenMints);
        
        // Обогащаем данные метаданными токенов
        const enrichedData = result.rows.map((item) => {
            const tokenMeta = metadataMap.get(item.token_mint) || getTokenMetadata(item.token_mint);
            return {
                ...item,
                symbol: tokenMeta?.symbol || item.token_mint.substring(0, 8),
                name: tokenMeta?.name || 'Unknown Token',
                image: tokenMeta?.image || '/img/token-placeholder.png',
                price: tokenMeta?.price || 0,
                market_cap: tokenMeta?.market_cap || 0
            };
        });
        
        res.json({ success: true, data: enrichedData });
    } catch (error) {
        console.error('Volume surge error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// Дополнительные эндпоинты из n8n SQL
app.get('/api/clusterbuy5m', async (req, res) => {
    try {
        const query = `SELECT token_mint, COUNT(DISTINCT wallet) AS buyers, SUM(sol_spent) AS total_sol
        FROM events
        WHERE side = 'BUY' AND ts > now() - interval '5 minutes'
        GROUP BY token_mint
        HAVING COUNT(DISTINCT wallet) >= 3
        ORDER BY total_sol DESC;`;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Cluster buy 5m error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/volumesurge2h', async (req, res) => {
    try {
        const query = `SELECT 'Volume Surge' AS alert_type, token_mint, SUM(sol_spent) AS total_sol, COUNT(*) AS tx_count
        FROM events
        WHERE side = 'BUY' AND ts > now() - interval '2 hours'
        GROUP BY token_mint
        HAVING SUM(sol_spent) >= 300
        ORDER BY total_sol DESC;`;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Volume surge 2h error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/cobuy3h', async (req, res) => {
    try {
        const query = `SELECT 'Co-buy' AS alert_type, token_mint, array_agg(DISTINCT wallet) AS wallets, COUNT(*) AS total_tx
        FROM events
        WHERE side = 'BUY' AND ts > now() - interval '3 hours'
        GROUP BY token_mint
        HAVING COUNT(DISTINCT wallet) BETWEEN 2 AND 4 AND COUNT(*) >= 5
        ORDER BY total_tx DESC;`;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Co-buy 3h error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/consensus3h', async (req, res) => {
    try {
        const query = `SELECT 'Consensus' AS alert_type, token_mint, COUNT(DISTINCT wallet) AS wallets, SUM(sol_spent) AS total_sol
        FROM events
        WHERE side = 'BUY' AND ts > now() - interval '3 hours'
        GROUP BY token_mint
        HAVING COUNT(DISTINCT wallet) >= 5 AND SUM(sol_spent) > 75
        ORDER BY total_sol DESC;`;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Consensus 3h error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/netflow24h', async (req, res) => {
    try {
        const query = `SELECT 'Net Flow' AS alert_type, token_mint, SUM(CASE WHEN side = 'BUY' THEN sol_spent ELSE -sol_received END) AS net_flow
        FROM events
        WHERE ts > now() - interval '1 day'
        GROUP BY token_mint
        HAVING SUM(CASE WHEN side = 'BUY' THEN sol_spent ELSE -sol_received END) > 5000
        ORDER BY net_flow DESC;`;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Net flow 24h error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/delta29h', async (req, res) => {
    try {
        const query = `SELECT 'Delta 29h' AS alert_type, token_mint, SUM(sol_spent) AS total_sol, COUNT(*) AS tx_count
        FROM events
        WHERE side = 'BUY' AND ts > now() - interval '29 hours'
        GROUP BY token_mint
        HAVING SUM(sol_spent) >= 1000
        ORDER BY total_sol DESC;`;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Delta 29h error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/earlysignal1h', async (req, res) => {
    try {
        const query = `SELECT 'Early Signal' AS alert_type, token_mint, COUNT(DISTINCT wallet) AS early_buyers
        FROM events
        WHERE side = 'BUY' AND ts > now() - interval '1 hour'
        GROUP BY token_mint
        HAVING COUNT(DISTINCT wallet) BETWEEN 1 AND 2
        ORDER BY early_buyers DESC;`;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Early signal 1h error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/token/details/:mint', async (req, res) => {
    try {
        const { mint } = req.params;
        const query = `
            SELECT 
                wallet, side, sol_spent, tx_signature, ts
            FROM events
            WHERE token_mint = $1 AND ts >= NOW() - INTERVAL '2 hours'
            ORDER BY ts DESC
            LIMIT 200;
        `;
        const result = await pool.query(query, [mint]);
        const enrichedData = enrichWalletData(result.rows);
        res.json({ success: true, data: enrichedData });
    } catch (error) {
        console.error('Token details error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/token/:mint', async (req, res) => {
    try {
        const { mint } = req.params;
        const query = `
            SELECT 
                token_mint,
                side,
                COUNT(*) as transaction_count,
                SUM(token_amount) as total_amount,
                SUM(sol_spent) as total_sol_spent,
                SUM(sol_received) as total_sol_received,
                MAX(ts) as latest_activity
            FROM events
            WHERE token_mint = $1
            GROUP BY token_mint, side
            ORDER BY latest_activity DESC;
        `;
        const result = await pool.query(query, [mint]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Token info error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Проверка соединения с базой данных
async function testDatabaseConnection() {
    try {
        const startTime = Date.now();
        const result = await pool.query('SELECT NOW() as current_time');
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        console.log(`✅ Database connection successful! Time: ${new Date(result.rows[0].current_time).toISOString()}`);
        console.log(`⏱️ Database response time: ${responseTime}ms`);
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}

// API endpoint для получения списка всех трейдеров с их статистикой
app.get('/api/traders/stats', async (req, res) => {
    try {
        const { period = '30d', type = 'all' } = req.query;
        const timeInterval = getTimeInterval(period);
        
        console.log(`📊 Getting traders stats for period: ${timeInterval}`);
        
        const query = `
            WITH             trader_stats AS (
                SELECT 
                    wallet,
                    COUNT(*) as total_trades,
                    COUNT(DISTINCT token_mint) as unique_tokens,
                    SUM(CASE WHEN side = 'BUY' THEN sol_spent ELSE 0 END) as total_buy_volume,
                    SUM(CASE WHEN side = 'SELL' THEN sol_received ELSE 0 END) as total_sell_volume,
                    MIN(ts) as first_trade,
                    MAX(ts) as last_trade,
                    AVG(CASE WHEN side = 'BUY' THEN sol_spent ELSE NULL END) as avg_buy_size
                FROM events 
                WHERE ts >= NOW() - INTERVAL '${timeInterval}'
                GROUP BY wallet
                HAVING COUNT(*) >= 5 AND SUM(sol_spent) > 0.1
            ),
            trader_avg_duration AS (
                SELECT 
                    wallet,
                    AVG(duration_minutes) as avg_duration_minutes
                FROM (
                    WITH token_trades AS (
                        SELECT 
                            wallet,
                            token_mint,
                            side,
                            ts,
                            ROW_NUMBER() OVER (PARTITION BY wallet, token_mint ORDER BY ts) as trade_sequence
                        FROM events 
                        WHERE ts >= NOW() - INTERVAL '${timeInterval}'
                        ORDER BY wallet, token_mint, ts
                    )
                    SELECT 
                        b.wallet,
                        EXTRACT(EPOCH FROM (s.ts - b.ts)) / 60 as duration_minutes
                    FROM token_trades b
                    JOIN token_trades s ON b.wallet = s.wallet 
                        AND b.token_mint = s.token_mint
                        AND s.trade_sequence = (
                            SELECT MIN(trade_sequence) 
                            FROM token_trades 
                            WHERE wallet = b.wallet 
                                AND token_mint = b.token_mint 
                                AND side = 'SELL' 
                                AND trade_sequence > b.trade_sequence
                        )
                    WHERE b.side = 'BUY' AND s.side = 'SELL'
                        AND s.ts > b.ts
                ) buy_sell_pairs
                GROUP BY wallet
            ),
            trader_pnl AS (
                SELECT 
                    wallet,
                    SUM(CASE WHEN side = 'SELL' THEN sol_received ELSE 0 END) - 
                    SUM(CASE WHEN side = 'BUY' THEN sol_spent ELSE 0 END) as realized_pnl
                FROM events 
                WHERE ts >= NOW() - INTERVAL '${timeInterval}'
                GROUP BY wallet
            )
            SELECT 
                ts.wallet,
                ts.total_trades,
                ts.unique_tokens,
                ts.total_buy_volume,
                ts.total_sell_volume,
                (ts.total_buy_volume + ts.total_sell_volume) as total_volume,
                ts.first_trade,
                ts.last_trade,
                ts.avg_buy_size,
                COALESCE(tp.realized_pnl, 0) as realized_pnl,
                COALESCE(tad.avg_duration_minutes, 0) as duration_minutes
            FROM trader_stats ts
            LEFT JOIN trader_pnl tp ON ts.wallet = tp.wallet
            LEFT JOIN trader_avg_duration tad ON ts.wallet = tad.wallet
            ORDER BY (ts.total_buy_volume + ts.total_sell_volume) DESC
            LIMIT 100;
        `;
        
        const result = await pool.query(query);
        
        // Обогащаем данные информацией о кошельках
        const enrichedData = await Promise.all(result.rows.map(async row => {
            const walletMeta = resolveWalletMeta(row.wallet);
            const totalVolumeSOL = row.total_volume;
            
            return {
                ...row,
                wallet_name: walletMeta.wallet_name || `Trader ${row.wallet.substring(0, 8)}`,
                wallet_telegram: walletMeta.wallet_telegram,
                wallet_twitter: walletMeta.wallet_twitter,
                total_volume_usd: await calculateVolumeUSD(totalVolumeSOL),
                avg_duration: Math.round(row.duration_minutes), // Duration from first to last trade
                win_rate: row.realized_pnl > 0 ? 100 : (row.realized_pnl < 0 ? 0 : 50) // Simple win rate
            };
        }));
        
        // Фильтруем по типу трейдеров
        const filteredData = filterTradersByType(enrichedData, type);
        
        res.json({ 
            success: true, 
            data: filteredData,
            period: period,
            time_interval: timeInterval,
            trader_type: type
        });
    } catch (error) {
        console.error('Traders stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получение детальной статистики кошелька (как на Kolscan)
app.get('/api/wallet/stats/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const { period = '30d' } = req.query;
        
        const timeInterval = getTimeInterval(period);
        console.log(`📊 Getting wallet stats for ${address} for period: ${timeInterval}`);
        
        // Основная статистика кошелька с фильтром по времени
        const statsQuery = `
            WITH wallet_stats AS (
                SELECT 
                    COUNT(*) as total_trades,
                    COUNT(DISTINCT token_mint) as unique_tokens,
                    SUM(CASE WHEN side = 'BUY' THEN sol_spent ELSE 0 END) as total_buy_volume,
                    SUM(CASE WHEN side = 'SELL' THEN sol_received ELSE 0 END) as total_sell_volume,
                    AVG(CASE WHEN side = 'BUY' THEN sol_spent ELSE NULL END) as avg_buy_size,
                    AVG(CASE WHEN side = 'SELL' THEN sol_received ELSE NULL END) as avg_sell_size,
                    MIN(ts) as first_trade,
                    MAX(ts) as last_trade
                FROM events 
                WHERE wallet = $1 AND ts >= NOW() - INTERVAL '${timeInterval}'
            ),
            token_pnl AS (
                SELECT 
                    token_mint,
                    SUM(CASE WHEN side = 'BUY' THEN sol_spent ELSE 0 END) as total_bought_sol,
                    SUM(CASE WHEN side = 'SELL' THEN sol_received ELSE 0 END) as total_sold_sol,
                    COUNT(CASE WHEN side = 'BUY' THEN 1 END) as buy_count,
                    COUNT(CASE WHEN side = 'SELL' THEN 1 END) as sell_count,
                    MAX(CASE WHEN side = 'BUY' THEN sol_spent ELSE 0 END) as max_buy,
                    MAX(CASE WHEN side = 'SELL' THEN sol_received ELSE 0 END) as max_sell
                FROM events 
                WHERE wallet = $1 AND ts >= NOW() - INTERVAL '${timeInterval}'
                GROUP BY token_mint
            )
            SELECT 
                ws.*,
                COALESCE(SUM(tp.total_sold_sol - tp.total_bought_sol), 0) as realized_pnl,
                COALESCE(COUNT(tp.token_mint), 0) as tokens_traded
            FROM wallet_stats ws
            LEFT JOIN token_pnl tp ON true
            GROUP BY ws.total_trades, ws.unique_tokens, ws.total_buy_volume, 
                     ws.total_sell_volume, ws.avg_buy_size, ws.avg_sell_size, 
                     ws.first_trade, ws.last_trade;
        `;
        
        const statsResult = await pool.query(statsQuery, [address]);
        
        // Детальная статистика по токенам с фильтром по времени
        const tokenPnlQuery = `
            SELECT 
                e.token_mint,
                SUM(CASE WHEN e.side = 'BUY' THEN e.sol_spent ELSE 0 END) as total_bought_sol,
                SUM(CASE WHEN e.side = 'SELL' THEN e.sol_received ELSE 0 END) as total_sold_sol,
                COUNT(CASE WHEN e.side = 'BUY' THEN 1 END) as buy_count,
                COUNT(CASE WHEN e.side = 'SELL' THEN 1 END) as sell_count,
                MAX(CASE WHEN e.side = 'BUY' THEN e.sol_spent ELSE 0 END) as max_buy,
                MAX(CASE WHEN e.side = 'SELL' THEN e.sol_received ELSE 0 END) as max_sell,
                MIN(e.ts) as first_trade,
                MAX(e.ts) as last_trade,
                (SUM(CASE WHEN e.side = 'SELL' THEN e.sol_received ELSE 0 END) - 
                 SUM(CASE WHEN e.side = 'BUY' THEN e.sol_spent ELSE 0 END)) as pnl_sol
            FROM events e
            WHERE e.wallet = $1 AND e.ts >= NOW() - INTERVAL '${timeInterval}'
            GROUP BY e.token_mint
            HAVING COUNT(*) > 0
            ORDER BY pnl_sol DESC
            LIMIT 50;
        `;
        
        const tokenPnlResult = await pool.query(tokenPnlQuery, [address]);
        
        // Получаем метаданные токенов
        const tokenMints = tokenPnlResult.rows.map(row => row.token_mint);
        const metadataMap = await fetchMultipleTokenMetadata(tokenMints);
        
        // Обогащаем данные метаданными токенов
        const enrichedTokenPnl = tokenPnlResult.rows.map((item) => {
            const tokenMeta = metadataMap.get(item.token_mint) || getTokenMetadata(item.token_mint);
            return {
                ...item,
                symbol: tokenMeta?.symbol || item.token_mint.substring(0, 8),
                name: tokenMeta?.name || 'Unknown Token',
                image: tokenMeta?.image || '/img/token-placeholder.png',
                market_cap: tokenMeta?.market_cap,
                price: tokenMeta?.price,
                source: tokenMeta?.source || 'fallback'
            };
        });
        
        // Получаем данные о кошельке из walletMap
        const walletMeta = resolveWalletMeta(address);
        
        const stats = statsResult.rows[0] || {};
        const totalVolumeSOL = (stats.total_buy_volume || 0) + (stats.total_sell_volume || 0);
        
        const response = {
            success: true,
            data: {
                wallet: address,
                wallet_name: walletMeta.wallet_name || `Trader ${address.substring(0, 8)}`,
                wallet_telegram: walletMeta.wallet_telegram,
                wallet_twitter: walletMeta.wallet_twitter,
                stats: stats,
                token_pnl: enrichedTokenPnl,
                period: period,
                time_interval: timeInterval,
                // Добавляем расчетные метрики
                metrics: {
                    win_rate: calculateWinRate(enrichedTokenPnl),
                    avg_duration: await calculateAvgDuration(address, timeInterval),
                    top_win: Math.max(...enrichedTokenPnl.map(t => t.pnl_sol || 0), 0),
                    total_volume_sol: totalVolumeSOL,
                    total_volume_usd: await calculateVolumeUSD(totalVolumeSOL),
                    realized_profits: enrichedTokenPnl.reduce((sum, t) => sum + (t.pnl_sol || 0), 0)
                }
            }
        };
        
        res.json(response);
    } catch (error) {
        console.error('Wallet stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получение списка известных трейдеров для Portfolio вкладки
app.get('/api/traders/list', async (req, res) => {
    try {
        // Получаем уникальные кошельки с их профилями и PnL
        const query = `
            WITH trader_stats AS (
                SELECT wallet, 
                       COUNT(*) as total_trades, 
                       SUM(sol_spent) as total_volume,
                       COUNT(DISTINCT token_mint) as unique_tokens,
                       MAX(ts) as last_activity,
                       SUM(CASE WHEN side = 'SELL' THEN sol_received ELSE 0 END) - 
                       SUM(CASE WHEN side = 'BUY' THEN sol_spent ELSE 0 END) as realized_pnl
                FROM events 
                WHERE ts >= NOW() - INTERVAL '30 days'
                GROUP BY wallet 
            )
            SELECT * FROM trader_stats
            ORDER BY total_volume DESC 
            LIMIT 200
        `;
        
        const result = await pool.query(query);
        console.log(`📊 Found ${result.rows.length} traders in database`);
        
        // Если нет данных, попробуем получить данные за больший период
        if (result.rows.length === 0) {
            console.log(`📊 No traders found for 30 days, trying 90 days...`);
            const fallbackQuery = `
                WITH trader_stats AS (
                    SELECT wallet, 
                           COUNT(*) as total_trades, 
                           SUM(sol_spent) as total_volume,
                           COUNT(DISTINCT token_mint) as unique_tokens,
                           MAX(ts) as last_activity,
                           SUM(CASE WHEN side = 'SELL' THEN sol_received ELSE 0 END) - 
                           SUM(CASE WHEN side = 'BUY' THEN sol_spent ELSE 0 END) as realized_pnl
                    FROM events 
                    WHERE ts >= NOW() - INTERVAL '90 days'
                    GROUP BY wallet 
                )
                SELECT * FROM trader_stats
                ORDER BY total_volume DESC 
                LIMIT 200
            `;
            const fallbackResult = await pool.query(fallbackQuery);
            console.log(`📊 Found ${fallbackResult.rows.length} traders for 90 days`);
            
            if (fallbackResult.rows.length > 0) {
                result.rows = fallbackResult.rows;
            }
        }
        
        // Обогащаем данные информацией о кошельках от walletMap
        const enrichedData = result.rows
            .map(trader => {
                const walletMeta = resolveWalletMeta(trader.wallet);
                
                return {
                    ...trader,
                    name: walletMeta.wallet_name || `Trader ${trader.wallet.substring(0, 8)}`,
                    telegram: walletMeta.wallet_telegram,
                    twitter: walletMeta.wallet_twitter,
                    symbol: walletMeta.wallet_name ? 
                        walletMeta.wallet_name.charAt(0).toUpperCase() : 
                        trader.wallet.charAt(0).toUpperCase(),
                    isVerified: !!walletMeta.wallet_name
                };
            })
                .filter(trader => trader.total_volume > 0.01); // Показываем всех активных трейдеров
        
        console.log(`✅ After filtering: ${enrichedData.length} verified traders`);
        
        res.json({ success: true, data: enrichedData });
    } catch (error) {
        console.error('Traders list error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Coins Market API - аналог Kolscan.io/tokens
app.get('/api/coins/market', async (req, res) => {
    try {
        const { cap = 'all', period = '24h' } = req.query;
        
        // Определяем интервал времени
        let timeInterval = '1 day';
        if (period === '7d') timeInterval = '7 days';
        if (period === '30d') timeInterval = '30 days';
        
        let marketCapFilter = '';
        if (cap === 'low') {
            marketCapFilter = 'AND (t.market_cap IS NULL OR t.market_cap < 100000)'; // 0-99K
        } else if (cap === 'mid') {
            marketCapFilter = 'AND t.market_cap >= 100000 AND t.market_cap < 1000000'; // 100K-999K
        } else if (cap === 'high') {
            marketCapFilter = 'AND t.market_cap >= 1000000'; // 1M+
        }

        const query = `
            WITH token_stats AS (
                SELECT 
                    e.token_mint,
                    COUNT(DISTINCT e.wallet) as trader_count,
                    COUNT(*) as total_trades,
                    SUM(CASE WHEN e.side = 'BUY' THEN e.sol_spent ELSE 0 END) as buy_volume,
                    SUM(CASE WHEN e.side = 'SELL' THEN e.sol_received ELSE 0 END) as sell_volume,
                    AVG(CASE WHEN e.side = 'BUY' THEN e.sol_spent ELSE NULL END) as avg_buy_size,
                    AVG(CASE WHEN e.side = 'SELL' THEN e.sol_received ELSE NULL END) as avg_sell_size,
                    MIN(e.ts) as first_activity,
                    MAX(e.ts) as last_activity
                FROM events e
                LEFT JOIN tokens t ON e.token_mint = t.address
                WHERE e.side IN ('BUY', 'SELL')
                AND e.ts >= NOW() - INTERVAL '${timeInterval}'
                ${marketCapFilter}
                GROUP BY e.token_mint
                HAVING COUNT(DISTINCT e.wallet) >= 1 AND SUM(e.sol_spent) > 0.01
            ),
            top_traders AS (
                SELECT 
                    e.token_mint,
                    e.wallet,
                    SUM(CASE WHEN e.side = 'BUY' THEN e.sol_spent ELSE 0 END) as trader_buy_volume,
                    SUM(CASE WHEN e.side = 'SELL' THEN e.sol_received ELSE 0 END) as trader_sell_volume,
                    COUNT(CASE WHEN e.side = 'BUY' THEN 1 END) as trader_buy_count,
                    COUNT(CASE WHEN e.side = 'SELL' THEN 1 END) as trader_sell_count,
                    MAX(e.ts) as trader_last_activity,
                    ROW_NUMBER() OVER (PARTITION BY e.token_mint ORDER BY SUM(e.sol_spent) DESC) as trader_rank
                FROM events e
                LEFT JOIN tokens t ON e.token_mint = t.address
                WHERE e.side IN ('BUY', 'SELL')
                AND e.ts >= NOW() - INTERVAL '${timeInterval}'
                ${marketCapFilter}
                GROUP BY e.token_mint, e.wallet
            )
            SELECT 
                ts.*,
                (ts.buy_volume + ts.sell_volume) as total_volume,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'wallet', tt.wallet,
                            'buy_volume', tt.trader_buy_volume,
                            'sell_volume', tt.trader_sell_volume,
                            'buy_count', tt.trader_buy_count,
                            'sell_count', tt.trader_sell_count,
                            'net_volume', (tt.trader_sell_volume - tt.trader_buy_volume),
                            'last_activity', tt.trader_last_activity,
                            'rank', tt.trader_rank
                        ) ORDER BY tt.trader_rank
                    ) FILTER (WHERE tt.trader_rank <= 10), 
                    '[]'::json
                ) as top_traders
            FROM token_stats ts
            LEFT JOIN top_traders tt ON ts.token_mint = tt.token_mint
            GROUP BY ts.token_mint, ts.trader_count, ts.total_trades, ts.buy_volume, 
                     ts.sell_volume, ts.avg_buy_size, ts.avg_sell_size, 
                     ts.first_activity, ts.last_activity
            ORDER BY ts.trader_count DESC, ts.total_volume DESC
            LIMIT 200;
        `;
        
        const result = await pool.query(query);
        
        // Получаем уникальные токены
        const tokenMints = result.rows.map(row => row.token_mint);
        console.log(`🔍 Fetching metadata for ${tokenMints.length} tokens...`);
        
        // Массово получаем метаданные через DexScreener + Jupiter
        const metadataMap = await fetchMultipleTokenMetadata(tokenMints);
        
        // Обогащаем данные метаданными токенов
        let enrichedData = result.rows.map((coin) => {
            const tokenMeta = metadataMap.get(coin.token_mint) || getTokenMetadata(coin.token_mint);
            return {
                ...coin,
                symbol: tokenMeta?.symbol || coin.token_mint.substring(0, 8),
                name: tokenMeta?.name || 'Unknown Token',
                image: tokenMeta?.image || '/img/token-placeholder.png',
                market_cap: tokenMeta?.market_cap || 0,
                price: tokenMeta?.price || 0,
                source: tokenMeta?.source || 'unknown'
            };
        });
        
        console.log(`✅ Enriched ${enrichedData.length} tokens (Sources: ${enrichedData.filter(t => t.source === 'dexscreener').length} DexScreener, ${enrichedData.filter(t => t.source === 'jupiter').length} Jupiter)`);
        
        // Применяем фильтрацию по market cap
        if (cap !== 'all') {
            enrichedData = enrichedData.filter(coin => {
                const marketCap = coin.market_cap || 0;
                switch (cap) {
                    case 'low':
                        return marketCap >= 0 && marketCap < 100000; // 0-99K
                    case 'mid':
                        return marketCap >= 100000 && marketCap < 1000000; // 100K-999K
                    case 'high':
                        return marketCap >= 1000000; // 1M+
                    default:
                        return true;
                }
            });
        }
        
        // Ограничиваем результат
        enrichedData = enrichedData.slice(0, 20);
        
        res.json({ success: true, data: enrichedData });
    } catch (error) {
        console.error('Coins market error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Recent Activity API - ВСЕ последние действия из БД
app.get('/api/recentactivity', async (req, res) => {
    try {
        const query = `
            SELECT 
                id, ts, wallet, token_mint, side, sol_spent, sol_received, 
                token_amount, dex, tx_signature, usd_estimate
            FROM events 
            ORDER BY ts DESC 
            LIMIT 100;
        `;
        const result = await pool.query(query);
        
        // Обогащаем данные
        let enrichedData = enrichWalletData(result.rows);
        enrichedData = await enrichTransactionData(enrichedData);
        
        // Добавляем метаданные токенов
        enrichedData = await Promise.all(enrichedData.map(async (item) => {
            const tokenMeta = getTokenMetadata(item.token_mint);
            return {
                ...item,
                token_symbol: tokenMeta?.symbol || item.token_mint.substring(0, 8),
                token_name: tokenMeta?.name || 'Unknown Token',
                token_image: tokenMeta?.image || '/img/token-placeholder.png'
            };
        }));
        
        res.json({ success: true, data: enrichedData });
    } catch (error) {
        console.error('Recent activity error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получить трейдеров конкретной монеты
app.get('/api/coins/traders/:tokenMint', async (req, res) => {
    try {
        const { tokenMint } = req.params;
        
        const query = `
            SELECT wallet, sol_spent, ts, tx_signature
            FROM events 
            WHERE token_mint = $1 AND side = 'BUY'
            ORDER BY sol_spent DESC
            LIMIT 20
        `;
        
        const result = await pool.query(query, [tokenMint]);
        const enrichedData = enrichWalletData(result.rows);
        
        res.json({ success: true, data: enrichedData });
    } catch (error) {
        console.error('Coin traders error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Добавляем недостающие API эндпоинты
app.get('/api/clusterbuy', async (req, res) => {
    try {
        const query = `
            SELECT token_mint, COUNT(DISTINCT wallet) as unique_buyers, SUM(sol_spent) as total_volume, AVG(sol_spent) as avg_buy_size, MAX(ts) as last_activity
            FROM events
            WHERE side = 'BUY' AND ts >= NOW() - INTERVAL '24 hours'
            GROUP BY token_mint
            HAVING COUNT(DISTINCT wallet) >= 1 AND SUM(sol_spent) > 0.01
            ORDER BY unique_buyers DESC, total_volume DESC
            LIMIT 100;
        `;
        const result = await pool.query(query);
        
        // Обогащаем данные метаданными токенов
        const enrichedData = await Promise.all(result.rows.map(async (item) => {
            const tokenMeta = getTokenMetadata(item.token_mint);
            return {
                ...item,
                symbol: tokenMeta?.symbol || item.token_mint.substring(0, 8),
                name: tokenMeta?.name || 'Unknown Token',
                image: tokenMeta?.image || '/img/token-placeholder.png'
            };
        }));
        
        res.json({ success: true, data: enrichedData });
    } catch (error) {
        console.error('Cluster buy error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/cobuy', async (req, res) => {
    try {
        const query = `
            SELECT token_mint, COUNT(DISTINCT wallet) as simultaneous_buyers, SUM(sol_spent) as total_volume, AVG(sol_spent) as avg_buy_size
            FROM events
            WHERE side = 'BUY' AND ts >= NOW() - INTERVAL '24 hours'
            GROUP BY token_mint
            HAVING COUNT(DISTINCT wallet) >= 1 AND SUM(sol_spent) > 0.01
            ORDER BY simultaneous_buyers DESC, total_volume DESC
            LIMIT 100;
        `;
        const result = await pool.query(query);
        
        // Массово получаем метаданные через DexScreener + Jupiter
        const tokenMints = result.rows.map(row => row.token_mint);
        const metadataMap = await fetchMultipleTokenMetadata(tokenMints);
        
        // Обогащаем данные метаданными токенов
        const enrichedData = result.rows.map((item) => {
            const tokenMeta = metadataMap.get(item.token_mint) || getTokenMetadata(item.token_mint);
            return {
                ...item,
                symbol: tokenMeta?.symbol || item.token_mint.substring(0, 8),
                name: tokenMeta?.name || 'Unknown Token',
                image: tokenMeta?.image || '/img/token-placeholder.png'
            };
        });
        
        res.json({ success: true, data: enrichedData });
    } catch (error) {
        console.error('Co-buy error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/smartmoney', async (req, res) => {
    try {
        const query = `
            WITH wallet_stats AS (
                SELECT 
                    wallet,
                    COUNT(DISTINCT token_mint) AS unique_tokens,
                    COUNT(*) AS total_trades,
                    SUM(sol_spent) AS total_volume,
                    AVG(sol_spent) AS avg_buy_size,
                    MAX(ts) AS last_activity,
                    STRING_AGG(DISTINCT token_mint, ',') AS token_list
                FROM events
                WHERE side = 'BUY' AND ts > now() - interval '24 hours'
                GROUP BY wallet
                HAVING COUNT(DISTINCT token_mint) >= 1 AND AVG(sol_spent) > 0.01
            ),
            recent_trades AS (
                SELECT 
                    wallet,
                    token_mint,
                    sol_spent,
                    ts,
                    tx_signature,
                    ROW_NUMBER() OVER (PARTITION BY wallet ORDER BY ts DESC) as rn
                FROM events 
                WHERE side = 'BUY' AND ts > now() - interval '24 hours'
            )
            SELECT 
                ws.wallet,
                ws.unique_tokens,
                ws.total_trades,
                ws.total_volume,
                ws.avg_buy_size,
                ws.last_activity,
                rt.token_mint,
                rt.sol_spent,
                rt.ts,
                rt.tx_signature
            FROM wallet_stats ws
            LEFT JOIN recent_trades rt ON ws.wallet = rt.wallet AND rt.rn = 1
            ORDER BY ws.unique_tokens DESC, ws.total_volume DESC
            LIMIT 50;
        `;
        const result = await pool.query(query);
        let enrichedData = enrichWalletData(result.rows);
        enrichedData = await enrichTransactionData(enrichedData);
        
        // Массово получаем метаданные токенов
        const tokenMints = enrichedData.map(item => item.token_mint).filter(Boolean);
        const metadataMap = await fetchMultipleTokenMetadata(tokenMints);
        
        // Обогащаем данные метаданными токенов
        enrichedData = enrichedData.map((item) => {
            const tokenMeta = metadataMap.get(item.token_mint) || getTokenMetadata(item.token_mint);
            return {
                ...item,
                token_symbol: tokenMeta?.symbol || item.token_mint?.substring(0, 8) || 'Unknown',
                token_name: tokenMeta?.name || 'Unknown Token',
                token_image: tokenMeta?.image || '/img/token-placeholder.png',
                token_market_cap: tokenMeta?.market_cap,
                token_price: tokenMeta?.price,
                token_source: tokenMeta?.source || 'fallback'
            };
        });
        
        res.json({ success: true, data: enrichedData });
    } catch (error) {
        console.error('Smart money error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/freshtokens', async (req, res) => {
    try {
        const query = `
            WITH first_appearance AS (
                SELECT token_mint, MIN(ts) AS first_seen
                FROM events
                GROUP BY token_mint
            )
            SELECT e.token_mint, COUNT(DISTINCT e.wallet) AS early_buyers, SUM(e.sol_spent) AS total_volume, fa.first_seen
            FROM events e
            JOIN first_appearance fa ON e.token_mint = fa.token_mint
            WHERE e.side = 'BUY' AND fa.first_seen > now() - interval '5 minutes' AND e.ts > now() - interval '5 minutes'
            GROUP BY e.token_mint, fa.first_seen
            HAVING SUM(e.sol_spent) > 0.01
            ORDER BY fa.first_seen DESC
            LIMIT 100;
        `;
        const result = await pool.query(query);
        
        // Массово получаем метаданные через Pump.fun + DexScreener + Jupiter
        const tokenMints = result.rows.map(row => row.token_mint);
        const metadataMap = await fetchMultipleTokenMetadata(tokenMints);
        
        // Обогащаем данные метаданными токенов
        const enrichedData = result.rows.map((item) => {
            const tokenMeta = metadataMap.get(item.token_mint) || getTokenMetadata(item.token_mint);
            return {
                ...item,
                symbol: tokenMeta?.symbol || item.token_mint.substring(0, 8),
                name: tokenMeta?.name || 'Unknown Token',
                image: tokenMeta?.image || '/img/token-placeholder.png',
                market_cap: tokenMeta?.market_cap,
                price: tokenMeta?.price,
                source: tokenMeta?.source || 'fallback'
            };
        });
        
        res.json({ success: true, data: enrichedData });
    } catch (error) {
        console.error('Fresh tokens error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/topgainers', async (req, res) => {
    try {
        const query = `
            SELECT token_mint, COUNT(DISTINCT wallet) as buyer_count, SUM(sol_spent) as total_volume, AVG(sol_spent) as avg_buy_size
            FROM events
            WHERE side = 'BUY' AND ts >= NOW() - INTERVAL '24 hours'
            GROUP BY token_mint
            HAVING COUNT(DISTINCT wallet) >= 1 AND SUM(sol_spent) > 0.01
            ORDER BY buyer_count DESC, total_volume DESC
            LIMIT 100;
        `;
        const result = await pool.query(query);
        
        // Массово получаем метаданные через DexScreener + Jupiter
        const tokenMints = result.rows.map(row => row.token_mint);
        const metadataMap = await fetchMultipleTokenMetadata(tokenMints);
        
        // Обогащаем данные метаданными токенов
        const enrichedData = result.rows.map((item) => {
            const tokenMeta = metadataMap.get(item.token_mint) || getTokenMetadata(item.token_mint);
            return {
                ...item,
                symbol: tokenMeta?.symbol || item.token_mint.substring(0, 8),
                name: tokenMeta?.name || 'Unknown Token',
                image: tokenMeta?.image || '/img/token-placeholder.png',
                price: tokenMeta?.price || 0,
                market_cap: tokenMeta?.market_cap || 0
            };
        });
        
        res.json({ success: true, data: enrichedData });
    } catch (error) {
        console.error('Top gainers error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- Pump.fun API endpoints ---

// Trending Meta Words
app.get('/api/pump/trending-meta', async (req, res) => {
    try {
        console.log('🔥 Fetching trending meta words from Pump.fun...');
        
        // Получаем trending meta words
        const response = await axios.get(`${FRONTEND_API_V3}/metas/current`, {
            headers: {
                'Origin': 'https://pump.fun',
                'Referer': 'https://pump.fun/'
            },
            timeout: 10000
        });
        
        const metaWords = response.data || [];
        console.log(`✅ Found ${metaWords.length} trending meta words`);
        
        // Для каждого meta word получаем связанные токены
        const enrichedMetaWords = await Promise.all(metaWords.map(async (meta) => {
            try {
                // Ищем токены по meta word
                const searchResponse = await axios.get(`${FRONTEND_API_V3}/search`, {
                    params: { q: meta.word },
                    headers: {
                        'Origin': 'https://pump.fun',
                        'Referer': 'https://pump.fun/'
                    },
                    timeout: 5000
                });
                
                const relatedTokens = searchResponse.data?.coins || [];
                
                return {
                    ...meta,
                    relatedTokens: relatedTokens.slice(0, 5), // Топ 5 токенов
                    pumpFunUrl: `https://pump.fun/search?q=${encodeURIComponent(meta.word)}`
                };
            } catch (error) {
                console.log(`⚠️ Failed to fetch tokens for meta "${meta.word}": ${error.message}`);
                return {
                    ...meta,
                    relatedTokens: [],
                    pumpFunUrl: `https://pump.fun/search?q=${encodeURIComponent(meta.word)}`
                };
            }
        }));
        
        res.json({ 
            success: true, 
            data: enrichedMetaWords,
            source: 'pumpfun_trending_meta'
        });
    } catch (error) {
        console.error('❌ Trending meta error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            fallback: 'Failed to fetch trending meta words from Pump.fun'
        });
    }
});

// Получить новые токены с Pump.fun (через DexScreener - старый)
app.get('/api/pump/new', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const tokens = await getNewPumpTokens(limit);
        res.json({ success: true, data: tokens, count: tokens.length });
    } catch (error) {
        console.error('Pump.fun new tokens error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получить самые новые токены с Pump.fun (настоящий API)
app.get('/api/pump/latest', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const tokens = await getLatestPumpTokens(limit);
        res.json({ success: true, data: tokens, count: tokens.length });
    } catch (error) {
        console.error('Pump.fun latest tokens error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получить токены которые сейчас торгуются
app.get('/api/pump/live', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const tokens = await getCurrentlyLiveTokens(limit);
        res.json({ success: true, data: tokens, count: tokens.length });
    } catch (error) {
        console.error('Pump.fun live tokens error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получить топ перформеры
app.get('/api/pump/top-runners', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const tokens = await getTopRunners(limit);
        res.json({ success: true, data: tokens, count: tokens.length });
    } catch (error) {
        console.error('Pump.fun top runners error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получить свежие токены (созданные за последние N минут)
app.get('/api/pump/fresh', async (req, res) => {
    try {
        const minutesAgo = parseInt(req.query.minutes) || 60;
        const limit = parseInt(req.query.limit) || 50;
        const tokens = await getFreshPumpTokens(minutesAgo, limit);
        res.json({ success: true, data: tokens, count: tokens.length });
    } catch (error) {
        console.error('Pump.fun fresh tokens error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получить волатильные токены
app.get('/api/pump/volatile', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const tokens = await getVolatileTokens(limit);
        res.json({ success: true, data: tokens, count: tokens.length });
    } catch (error) {
        console.error('Pump.fun volatile tokens error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Поиск токенов на Pump.fun
app.get('/api/pump/search', async (req, res) => {
    try {
        const query = req.query.q;
        const limit = parseInt(req.query.limit) || 20;
        
        if (!query) {
            return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
        }
        
        const tokens = await searchPumpTokens(query, limit);
        res.json({ success: true, data: tokens, count: tokens.length });
    } catch (error) {
        console.error('Pump.fun search error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получить детали токена с Pump.fun
app.get('/api/pump/token/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const details = await getPumpTokenDetails(address);
        
        if (!details) {
            return res.status(404).json({ success: false, error: 'Token not found' });
        }
        
        res.json({ success: true, data: details });
    } catch (error) {
        console.error('Pump.fun token details error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получить топ токенов по объему
app.get('/api/pump/top', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const tokens = await getTopPumpTokensByVolume(limit);
        res.json({ success: true, data: tokens, count: tokens.length });
    } catch (error) {
        console.error('Pump.fun top tokens error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получить trending токены
app.get('/api/pump/trending', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 15;
        const tokens = await getTrendingPumpTokens(limit);
        res.json({ success: true, data: tokens, count: tokens.length });
    } catch (error) {
        console.error('Pump.fun trending tokens error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получить статистику токена
app.get('/api/pump/stats/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const stats = await getTokenStats(address);
        
        if (!stats) {
            return res.status(404).json({ success: false, error: 'Token not found' });
        }
        
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Pump.fun token stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Инициализация всех сервисов перед запуском
async function startServer() {
    try {
        // Инициализация метаданных токенов
        console.log('🪙 Initializing token metadata service...');
        const metadataLoaded = await initializeTokenMetadata();
        if (metadataLoaded) {
            console.log('✅ Token metadata service ready');
        } else {
            console.log('⚠️ Token metadata service running in fallback mode');
        }
        
        // Тест подключения к БД
        const dbConnected = await testDatabaseConnection();
        if (!dbConnected) {
            console.error('❌ Database connection failed, but continuing...');
        }
        
        app.listen(port, () => {
            console.log(`🚀 Pump Dex Mini App сервер запущен на порту ${port}`);
            console.log(`📱 Mini App доступен по адресу: http://localhost:${port}`);
            console.log(`🔗 Webhook эндпоинт: http://localhost:${port}/webhook/helius`);
            console.log(`🔗 Health check: http://localhost:${port}/api/health`);
            console.log(`🔗 API endpoints:`);
            console.log(`   - /api/clusterbuy - кластерные покупки (10м)`);
            console.log(`   - /api/whalemoves - движения китов (30м)`);
            console.log(`   - /api/volumesurge - всплески объема (15м)`);
            console.log(`   - /api/cobuy - совместные покупки (20м)`);
            console.log(`   - /api/smartmoney - умные деньги (1ч)`);
            console.log(`   - /api/freshtokens - новые токены (5м)`);
            console.log(`   - /api/topgainers - топ по объему (1ч)`);
            console.log(`   - /api/traders/list - список трейдеров для Portfolio`);
            console.log(`   - /api/coins/market - рынок монет с фильтрами`);
            console.log(`   - /api/coins/traders/:tokenMint - трейдеры конкретной монеты`);
            console.log(`🔥 Pump.fun integration endpoints:`);
            console.log(`   - /api/pump/trending-meta - trending meta words + связанные токены`);
            console.log(`   - /api/pump/latest - самые новые токены (настоящий API)`);
            console.log(`   - /api/pump/live - токены которые сейчас торгуются`);
            console.log(`   - /api/pump/top-runners - топ перформеры`);
            console.log(`   - /api/pump/fresh - свежие токены (за N минут)`);
            console.log(`   - /api/pump/volatile - волатильные токены`);
            console.log(`   - /api/pump/search - поиск токенов`);
            console.log(`   - /api/pump/token/:address - детали токена`);
            console.log(`   - /api/pump/new - новые токены (через DexScreener)`);
            console.log(`   - /api/pump/top - топ токенов по объему`);
            console.log(`   - /api/pump/trending - trending токены`);
            console.log(`   - /api/pump/stats/:address - статистика токена`);
            
            // Запускаем Telegram бота параллельно (если BOT_TOKEN настроен)
            if (process.env.BOT_TOKEN) {
                try {
                    console.log('\n🤖 Starting Telegram Bot...');
                    const { startBot } = require('./bot.js');
                    startBot().then(() => {
                        console.log('✅ Telegram Bot started successfully!');
                    }).catch((error) => {
                        console.log('⚠️ Telegram Bot not started:', error.message);
                        console.log('   Set BOT_TOKEN environment variable to enable bot');
                    });
                } catch (error) {
                    console.log('⚠️ Telegram Bot not started:', error.message);
                    console.log('   Set BOT_TOKEN environment variable to enable bot');
                }
            } else {
                console.log('\n⚠️ BOT_TOKEN not set - Telegram Bot disabled');
                console.log('   Set BOT_TOKEN environment variable to enable bot');
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Запускаем сервер
startServer();
