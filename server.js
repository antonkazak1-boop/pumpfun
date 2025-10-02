const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const dns = require('dns');

// Попробуем оптимизировать подключение к базе данных
dns.setDefaultResultOrder('ipv4first');

const app = express();
const port = process.env.PORT || 3000;

// Конфигурация базы данных PostgreSQL (поддержка DATABASE_URL для Supabase/Render/Neon)
let pool;

async function createPool() {
    if (process.env.DATABASE_URL) {
        try {
            console.log('Creating database connection to Supabase...');
            
            pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false },
                // Настройки для стабильной работы с Supabase
                min: 1,
                max: 10,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 10000,
                acquireTimeoutMillis: 10000,
                createTimeoutMillis: 10000,
                destroyTimeoutMillis: 5000,
                reapIntervalMillis: 1000,
                createRetryIntervalMillis: 200,
            });
            
            // Тестируем подключение
            const client = await pool.connect();
            const result = await client.query('SELECT NOW() as current_time');
            console.log('✅ Database connection successful! Time:', result.rows[0].current_time);
            client.release();
            
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            console.error('Creating pool with minimal config for fallback...');
            
            // Минимальная конфигурация для подключения
            pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false },
                min: 0,
                max: 1,
                connectionTimeoutMillis: 5000,
            });
        }
    } else {
        pool = new Pool({
            user: process.env.DB_USER || 'YOUR_DB_USER',
            host: process.env.DB_HOST || 'YOUR_DB_HOST',
            database: process.env.DB_NAME || 'YOUR_DB_NAME',
            password: process.env.DB_PASSWORD || 'YOUR_DB_PASSWORD',
            port: process.env.DB_PORT || 5432,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }
}

// Инициализируем pool асинхронно
createPool().catch(error => {
    console.error('Failed to create database pool:', error);
    process.exit(1);
});

app.use(cors());
// Limit incoming JSON to avoid abuse and large webhook payloads
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Webhook to replace n8n Webhook + Code + Postgres nodes ---
app.post('/webhook/helius', async (req, res) => {
    try {
        const body = Array.isArray(req.body) ? req.body : (Array.isArray(req.body?.body) ? req.body.body : [req.body]);
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

            let sol_spent = null;
            let sol_received = null;
            if (leg.side === 'BUY') sol_spent = Math.abs(solDelta);
            if (leg.side === 'SELL') sol_received = Math.abs(solDelta);

            const { wallet_name, wallet_telegram, wallet_twitter } = resolveWalletMeta(wallet);

            rows.push({
                tx_signature: ev.signature || null,
                slot: ev.slot || null,
                ts: ev.timestamp ? new Date(ev.timestamp * 1000).toISOString() : new Date().toISOString(),
                source: ev.source || null,
                type: ev.type || null,
                dex: ev.source || null,
                fee_payer: ev.feePayer || null,
                fee: toSol(ev.fee || 0),
                wallet: wallet || null,
                side: leg.side,
                token_mint: leg.token_mint,
                token_amount: leg.token_amount,
                native_sol_change: solDelta,
                sol_spent,
                sol_received,
                usd_value: ev.usdValue ?? null,
                wallet_name,
                wallet_telegram,
                wallet_twitter,
            });
        }

        if (rows.length === 0) {
            return res.status(200).json({ success: true, inserted: 0 });
        }

        // Bulk insert with basic dedupe on tx_signature + token_mint + side
        const columns = [
            'tx_signature','slot','ts','source','type','dex','fee_payer','fee','wallet','side','token_mint','token_amount','native_sol_change','sol_spent','sol_received','usd_value','wallet_name','wallet_telegram','wallet_twitter'
        ];
        const values = [];
        const params = [];
        let idx = 1;
        for (const r of rows) {
            values.push(`(${columns.map(() => `$${idx++}`).join(',')})`);
            params.push(
                r.tx_signature,
                r.slot,
                r.ts,
                r.source,
                r.type,
                r.dex,
                r.fee_payer,
                r.fee,
                r.wallet,
                r.side,
                r.token_mint,
                r.token_amount,
                r.native_sol_change,
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
            ON CONFLICT (tx_signature, token_mint, side) DO NOTHING;
        `;

        await pool.query(insertSql, params);

        return res.status(200).json({ success: true, inserted: rows.length });
    } catch (error) {
        console.error('Webhook error:', error);
        return res.status(500).json({ success: false, error: 'Webhook processing error' });
    }
});

// Обработка ошибок базы данных
const handleDatabaseError = (error, res, operation) => {
    console.error(`Ошибка при выполнении ${operation}:`, error);
    res.status(500).json({ 
        error: 'Database error', 
        message: `Ошибка при выполнении ${operation}` 
    });
};

// --- Helpers for Helius webhook parsing ---
function toSol(lamports) {
    return Number(lamports || 0) / 1e9;
}

function first(arr, pred) {
    if (!Array.isArray(arr)) return undefined;
    for (let i = 0; i < arr.length; i++) if (pred(arr[i])) return arr[i];
}

function pickWallet(ev, trackedSet) {
    if (ev.feePayer) return ev.feePayer;
    if (trackedSet && trackedSet.size > 0) {
        const accs = Array.isArray(ev.accountData) ? ev.accountData : [];
        for (const a of accs) if (trackedSet.has(a.account)) return a.account;
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

// Import wallet metadata resolver
const { resolveWalletMeta } = require('./walletMap');

// --- API Эндпоинты для Telegram Mini App ---

// Эндпоинт для Cluster Buy (10 минут)
app.get('/api/clusterbuy', async (req, res) => {
    try {
        const query = `
            SELECT token_mint,
                   COUNT(DISTINCT wallet) AS buyers,
                   SUM(sol_spent) AS total_sol
            FROM events
            WHERE side = 'BUY'
              AND ts > now() - interval '10 minutes'
            GROUP BY token_mint
            HAVING COUNT(DISTINCT wallet) >= 3
            ORDER BY total_sol DESC
            LIMIT 10;`;
        
        const result = await pool.query(query);
        res.json({
            success: true,
            data: result.rows,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        handleDatabaseError(error, res, 'Cluster Buy');
    }
});

// Эндпоинт для Whale Moves (30 минут)
app.get('/api/whalemoves', async (req, res) => {
    try {
        const query = `
            SELECT wallet,
                   token_mint,
                   sol_spent,
                   ts,
                   tx_signature
            FROM events
            WHERE side = 'BUY'
              AND sol_spent >= 100
              AND ts > now() - interval '30 minutes'
            ORDER BY sol_spent DESC
            LIMIT 10;`;
        
        const result = await pool.query(query);
        res.json({
            success: true,
            data: result.rows,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        handleDatabaseError(error, res, 'Whale Moves');
    }
});

// Эндпоинт для Volume Surge (15 минут)
app.get('/api/volumesurge', async (req, res) => {
    try {
        const query = `
            WITH recent_volume AS (
                SELECT token_mint,
                       SUM(sol_spent) AS volume_15m
                FROM events
                WHERE side = 'BUY'
                  AND ts > now() - interval '15 minutes'
                GROUP BY token_mint
            ),
            older_volume AS (
                SELECT token_mint,
                       SUM(sol_spent) AS volume_previous
                FROM events
                WHERE side = 'BUY'
                  AND ts BETWEEN now() - interval '30 minutes' AND now() - interval '15 minutes'
                GROUP BY token_mint
            )
            SELECT r.token_mint,
                   r.volume_15m,
                   COALESCE(o.volume_previous, 0) AS volume_previous,
                   CASE 
                       WHEN COALESCE(o.volume_previous, 0) > 0 THEN
                           ((r.volume_15m - COALESCE(o.volume_previous, 0)) / COALESCE(o.volume_previous, 0)) * 100
                       ELSE 100
                   END AS surge_percentage
            FROM recent_volume r
            LEFT JOIN older_volume o ON r.token_mint = o.token_mint
            WHERE r.volume_15m > 50
            ORDER BY surge_percentage DESC
            LIMIT 10;`;
        
        const result = await pool.query(query);
        res.json({
            success: true,
            data: result.rows,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        handleDatabaseError(error, res, 'Volume Surge');
    }
});

// Эндпоинт для Co-buy Analysis (20 минут)
app.get('/api/cobuy', async (req, res) => {
    try {
        const query = `
            WITH wallet_tokens AS (
                SELECT wallet,
                       token_mint,
                       SUM(sol_spent) AS total_spent
                FROM events
                WHERE side = 'BUY'
                  AND ts > now() - interval '20 minutes'
                GROUP BY wallet, token_mint
                HAVING SUM(sol_spent) > 10
            ),
            token_pairs AS (
                SELECT w1.token_mint AS token_a,
                       w2.token_mint AS token_b,
                       COUNT(DISTINCT w1.wallet) AS common_buyers,
                       SUM(w1.total_spent + w2.total_spent) AS combined_volume
                FROM wallet_tokens w1
                JOIN wallet_tokens w2 ON w1.wallet = w2.wallet AND w1.token_mint < w2.token_mint
                GROUP BY w1.token_mint, w2.token_mint
                HAVING COUNT(DISTINCT w1.wallet) >= 2
            )
            SELECT token_a,
                   token_b,
                   common_buyers,
                   combined_volume
            FROM token_pairs
            ORDER BY common_buyers DESC, combined_volume DESC
            LIMIT 10;`;
        
        const result = await pool.query(query);
        res.json({
            success: true,
            data: result.rows,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        handleDatabaseError(error, res, 'Co-buy Analysis');
    }
});

// Эндпоинт для Smart Money (1 час)
app.get('/api/smartmoney', async (req, res) => {
    try {
        const query = `
            WITH profitable_wallets AS (
                SELECT wallet,
                       COUNT(DISTINCT token_mint) AS unique_tokens,
                       AVG(sol_spent) AS avg_buy_size
                FROM events
                WHERE side = 'BUY'
                  AND ts > now() - interval '1 hour'
                GROUP BY wallet
                HAVING COUNT(DISTINCT token_mint) >= 3
                   AND AVG(sol_spent) > 5
            )
            SELECT p.wallet,
                   p.unique_tokens,
                   p.avg_buy_size,
                   e.token_mint,
                   e.sol_spent,
                   e.ts,
                   e.tx_signature
            FROM profitable_wallets p
            JOIN events e ON p.wallet = e.wallet
            WHERE e.side = 'BUY'
              AND e.ts > now() - interval '1 hour'
            ORDER BY p.unique_tokens DESC, e.ts DESC
            LIMIT 15;`;
        
        const result = await pool.query(query);
        res.json({
            success: true,
            data: result.rows,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        handleDatabaseError(error, res, 'Smart Money');
    }
});

// Эндпоинт для Fresh Tokens (5 минут)
app.get('/api/freshtokens', async (req, res) => {
    try {
        const query = `
            WITH first_appearance AS (
                SELECT token_mint,
                       MIN(ts) AS first_seen
                FROM events
                GROUP BY token_mint
            )
            SELECT e.token_mint,
                   COUNT(DISTINCT e.wallet) AS early_buyers,
                   SUM(e.sol_spent) AS total_volume,
                   fa.first_seen
            FROM events e
            JOIN first_appearance fa ON e.token_mint = fa.token_mint
            WHERE e.side = 'BUY'
              AND fa.first_seen > now() - interval '5 minutes'
              AND e.ts > now() - interval '5 minutes'
            GROUP BY e.token_mint, fa.first_seen
            HAVING SUM(e.sol_spent) > 10
            ORDER BY fa.first_seen DESC
            LIMIT 10;`;
        
        const result = await pool.query(query);
        res.json({
            success: true,
            data: result.rows,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        handleDatabaseError(error, res, 'Fresh Tokens');
    }
});

// Эндпоинт для Top Gainers (1 час)
app.get('/api/topgainers', async (req, res) => {
    try {
        const query = `
            SELECT token_mint,
                   COUNT(DISTINCT wallet) AS total_buyers,
                   SUM(sol_spent) AS total_volume,
                   AVG(sol_spent) AS avg_buy_size,
                   MAX(sol_spent) AS largest_buy
            FROM events
            WHERE side = 'BUY'
              AND ts > now() - interval '1 hour'
            GROUP BY token_mint
            HAVING SUM(sol_spent) > 100
            ORDER BY total_volume DESC
            LIMIT 10;`;
        
        const result = await pool.query(query);
        res.json({
            success: true,
            data: result.rows,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        handleDatabaseError(error, res, 'Top Gainers');
    }
});

// === Дополнительные эндпоинты под n8n SQL ===

// Cluster Buy (5 минут)
app.get('/api/clusterbuy5m', async (req, res) => {
    try {
        const query = `SELECT token_mint,
       COUNT(DISTINCT wallet) AS buyers,
       SUM(sol_spent) AS total_sol
FROM events
WHERE side = 'BUY'
  AND ts > now() - interval '5 minutes'
GROUP BY token_mint
HAVING COUNT(DISTINCT wallet) >= 3
ORDER BY total_sol DESC;`;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows, timestamp: new Date().toISOString() });
    } catch (error) {
        handleDatabaseError(error, res, 'Cluster Buy 5m');
    }
});

// Volume Surge (2 часа)
app.get('/api/volumesurge2h', async (req, res) => {
    try {
        const query = `SELECT 'Volume Surge' AS alert_type,
       token_mint,
       SUM(sol_spent) AS total_sol,
       COUNT(*) AS tx_count
FROM events
WHERE side = 'BUY'
  AND ts > now() - interval '2 hours'
GROUP BY token_mint
HAVING SUM(sol_spent) >= 300
ORDER BY total_sol DESC;`;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows, timestamp: new Date().toISOString() });
    } catch (error) {
        handleDatabaseError(error, res, 'Volume Surge 2h');
    }
});

// Co-buy (3 часа)
app.get('/api/cobuy3h', async (req, res) => {
    try {
        const query = `SELECT 'Co-buy' AS alert_type,
       token_mint,
       array_agg(DISTINCT wallet) AS wallets,
       COUNT(*) AS total_tx
FROM events
WHERE side = 'BUY'
  AND ts > now() - interval '3 hours'
GROUP BY token_mint
HAVING COUNT(DISTINCT wallet) BETWEEN 2 AND 4
   AND COUNT(*) >= 5
ORDER BY total_tx DESC;`;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows, timestamp: new Date().toISOString() });
    } catch (error) {
        handleDatabaseError(error, res, 'Co-buy 3h');
    }
});

// Consensus Signal (3 часа)
app.get('/api/consensus3h', async (req, res) => {
    try {
        const query = `WITH activity AS (
  SELECT wallet,
         SUM(CASE WHEN side = 'BUY' THEN 1 ELSE 0 END) AS buy_count,
         SUM(CASE WHEN side = 'SELL' THEN 1 ELSE 0 END) AS sell_count
  FROM events
  WHERE ts > now() - interval '180 minutes'
  GROUP BY wallet
)
SELECT 'Consensus Signal' AS alert_type,
       COUNT(*) AS total_wallets,
       SUM(CASE WHEN buy_count > sell_count THEN 1 ELSE 0 END) AS mostly_buy,
       SUM(CASE WHEN sell_count > buy_count THEN 1 ELSE 0 END) AS mostly_sell,
       ROUND(100.0 * SUM(CASE WHEN buy_count > sell_count THEN 1 ELSE 0 END) / COUNT(*), 2) AS buy_pct,
       ROUND(100.0 * SUM(CASE WHEN sell_count > buy_count THEN 1 ELSE 0 END) / COUNT(*), 2) AS sell_pct
FROM activity;`;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows, timestamp: new Date().toISOString() });
    } catch (error) {
        handleDatabaseError(error, res, 'Consensus 3h');
    }
});

// Netflow Token (24 часа)
app.get('/api/netflow24h', async (req, res) => {
    try {
        const query = `SELECT 'Netflow Token' AS alert_type,
       token_mint,
       SUM(CASE WHEN side = 'BUY' THEN sol_spent ELSE 0 END) AS buy_sol,
       SUM(CASE WHEN side = 'SELL' THEN sol_received ELSE 0 END) AS sell_sol,
       SUM(CASE WHEN side = 'BUY' THEN sol_spent ELSE 0 END) -
       SUM(CASE WHEN side = 'SELL' THEN sol_received ELSE 0 END) AS netflow
FROM events
WHERE ts > now() - interval '24 hour'
GROUP BY token_mint
HAVING ABS(SUM(CASE WHEN side = 'BUY' THEN sol_spent ELSE 0 END) -
           SUM(CASE WHEN side = 'SELL' THEN sol_received ELSE 0 END)) >= 100;`;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows, timestamp: new Date().toISOString() });
    } catch (error) {
        handleDatabaseError(error, res, 'Netflow 24h');
    }
});

// Buy/Sell Delta (29 часов)
app.get('/api/delta29h', async (req, res) => {
    try {
        const query = `SELECT 
  'Buy/Sell Delta' AS alert_type,
  token_mint,
  SUM(CASE WHEN side = 'BUY'  THEN sol_spent    ELSE 0 END) AS total_bought,
  SUM(CASE WHEN side = 'SELL' THEN sol_received ELSE 0 END) AS total_sold,
  SUM(CASE WHEN side = 'BUY'  THEN sol_spent    ELSE 0 END) -
  SUM(CASE WHEN side = 'SELL' THEN sol_received ELSE 0 END) AS delta
FROM events
WHERE ts > now() - interval '29 hours'
GROUP BY token_mint
HAVING ABS(
  SUM(CASE WHEN side = 'BUY'  THEN sol_spent    ELSE 0 END) -
  SUM(CASE WHEN side = 'SELL' THEN sol_received ELSE 0 END)
) >= 10
ORDER BY delta DESC;`;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows, timestamp: new Date().toISOString() });
    } catch (error) {
        handleDatabaseError(error, res, 'Delta 29h');
    }
});

// Early Signal (1 час после создания) — требует таблицу token_metadata
app.get('/api/earlysignal1h', async (req, res) => {
    try {
        const query = `SELECT 'Early Signal' AS alert_type,
       e.token_mint,
       COUNT(DISTINCT e.wallet) AS early_buyers,
       MIN(e.ts) AS first_seen
FROM events e
JOIN token_metadata t ON e.token_mint = t.token_mint
WHERE e.side = 'BUY'
  AND e.ts < t.created_at + interval '1 hour'
  AND e.ts > now() - interval '1 hour'
GROUP BY e.token_mint
HAVING COUNT(DISTINCT e.wallet) BETWEEN 2 AND 3;`;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows, timestamp: new Date().toISOString() });
    } catch (error) {
        handleDatabaseError(error, res, 'Early Signal 1h');
    }
});

// Эндпоинт для получения информации о конкретном токене
app.get('/api/token/:mint', async (req, res) => {
    try {
        const { mint } = req.params;
        const query = `
            SELECT wallet,
                   sol_spent,
                   ts,
                   tx_signature,
                   side
            FROM events
            WHERE token_mint = $1
              AND ts > now() - interval '2 hours'
            ORDER BY ts DESC
            LIMIT 50;`;
        
        const result = await pool.query(query, [mint]);
        res.json({
            success: true,
            data: result.rows,
            token_mint: mint,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        handleDatabaseError(error, res, `Token Info for ${req.params.mint}`);
    }
});

// Эндпоинт для проверки здоровья сервера
app.get('/api/health', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({
                success: false,
                database: 'initializing',
                error: 'Database pool is being initialized'
            });
        }
        
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

// Обслуживание статических файлов и SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`🚀 Pump Dex Mini App сервер запущен на порту ${port}`);
    console.log(`📱 Mini App доступен по адресу: http://localhost:${port}`);
    console.log(`🔗 API эндпоинты:`);
    console.log(`   - GET /api/health - проверка здоровья`);
    console.log(`   - GET /api/clusterbuy - кластерные покупки (10м)`);
    console.log(`   - GET /api/whalemoves - движения китов (30м)`);
    console.log(`   - GET /api/volumesurge - всплески объема (15м)`);
    console.log(`   - GET /api/cobuy - совместные покупки (20м)`);
    console.log(`   - GET /api/smartmoney - умные деньги (1ч)`);
    console.log(`   - GET /api/freshtokens - новые токены (5м)`);
    console.log(`   - GET /api/topgainers - топ по объему (1ч)`);
    console.log(`   - GET /api/token/:mint - информация о токене`);
    console.log(`🔧 Database URL: ${process.env.DATABASE_URL ? 'configured' : 'not configured'}`);
    console.log(`🔧 Pool status: ${pool ? 'initialized' : 'initializing...'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM получен, завершение сервера...');
    pool.end();
    process.exit(0);
});