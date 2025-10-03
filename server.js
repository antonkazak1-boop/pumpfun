const express = require('express');
const { Pool } = require('pg');
const path = require('path');

// Импорт wallet map модуля
const { resolveWalletMeta } = require('./walletMap');
const { initializeTokenMetadata, enrichTransactionData, getTokenMetadata } = require('./tokenMetadata');

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
            WHERE side = 'BUY' AND ts >= NOW() - INTERVAL '10 minutes'
            GROUP BY token_mint
            HAVING COUNT(*) >= 10
            ORDER BY purchase_count DESC, latest_purchase DESC
            LIMIT 20;
        `;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
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
            WHERE side = 'BUY' AND sol_spent > 50 AND ts >= NOW() - INTERVAL '30 minutes'
            ORDER BY sol_spent DESC, ts DESC
            LIMIT 20;
        `;
        const result = await pool.query(query);
        const enrichedData = enrichWalletData(result.rows);
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
            WHERE side = 'BUY' AND ts >= NOW() - INTERVAL '15 minutes'
                GROUP BY token_mint
            HAVING SUM(sol_spent) > 100
            ORDER BY total_volume DESC
            LIMIT 15;
        `;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Volume surge error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/cobuy', async (req, res) => {
    try {
        const query = `
            WITH wallet_tokens AS (
                SELECT wallet, token_mint, SUM(sol_spent) AS total_spent
                FROM events
                WHERE side = 'BUY' AND ts > now() - interval '20 minutes'
                GROUP BY wallet, token_mint
                HAVING SUM(sol_spent) > 10
            ),
            token_pairs AS (
                SELECT w1.token_mint AS token_a, w2.token_mint AS token_b,
                       COUNT(DISTINCT w1.wallet) AS common_buyers,
                       SUM(w1.total_spent + w2.total_spent) AS combined_volume
                FROM wallet_tokens w1
                JOIN wallet_tokens w2 ON w1.wallet = w2.wallet AND w1.token_mint < w2.token_mint
                GROUP BY w1.token_mint, w2.token_mint
                HAVING COUNT(DISTINCT w1.wallet) >= 2
            )
            SELECT token_a, token_b, common_buyers, combined_volume
            FROM token_pairs
            ORDER BY common_buyers DESC, combined_volume DESC
            LIMIT 10;
        `;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Co-buy error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/smartmoney', async (req, res) => {
    try {
        const query = `
            WITH profitable_wallets AS (
                SELECT wallet, COUNT(DISTINCT token_mint) AS unique_tokens, AVG(sol_spent) AS avg_buy_size
                FROM events
                WHERE side = 'BUY' AND ts > now() - interval '1 hour'
                GROUP BY wallet
                HAVING COUNT(DISTINCT token_mint) >= 3 AND AVG(sol_spent) > 5
            )
            SELECT p.wallet, p.unique_tokens, p.avg_buy_size, e.token_mint, e.sol_spent as sol_spent_needs_price_lookup, e.ts, e.tx_signature
            FROM profitable_wallets p
            JOIN (SELECT wallet, token_mint, sol_spent, ts, tx_signature 
                  FROM events 
                  WHERE side = 'BUY' AND ts > now() - interval '1 hour') e ON p.wallet = e.wallet
            ORDER BY p.unique_tokens DESC, e.ts DESC
            LIMIT 15;
        `;
        const result = await pool.query(query);
        let enrichedData = enrichWalletData(result.rows);
        enrichedData = await enrichTransactionData(enrichedData);
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
            HAVING SUM(e.sol_spent) > 10
            ORDER BY fa.first_seen DESC
            LIMIT 10;
        `;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Fresh tokens error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/topgainers', async (req, res) => {
    try {
        const query = `
            SELECT token_mint, COUNT(DISTINCT wallet) AS total_buyers, SUM(sol_spent) AS total_volume, 
                   AVG(sol_spent) AS avg_buy_size, MAX(sol_spent) AS largest_buy
            FROM events
            WHERE side = 'BUY' AND ts > now() - interval '1 hour'
            GROUP BY token_mint
            HAVING SUM(sol_spent) > 100
            ORDER BY total_volume DESC
            LIMIT 10;
        `;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Top gainers error:', error);
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
            LIMIT 50;
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

// Получение списка известных трейдеров для Portfolio вкладки
app.get('/api/traders/list', async (req, res) => {
    try {
        // Получаем уникальные кошельки с их профилями
        const query = `
            SELECT DISTINCT wallet, COUNT(*) as total_trades, 
                   SUM(sol_spent) as total_volume,
                   COUNT(DISTINCT token_mint) as unique_tokens,
                   MAX(ts) as last_activity
            FROM events 
            WHERE ts >= NOW() - INTERVAL '7 days'
            GROUP BY wallet 
            ORDER BY total_volume DESC 
            LIMIT 50
        `;
        
        const result = await pool.query(query);
        console.log(`📊 Found ${result.rows.length} traders in database`);
        
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
                .filter(trader => trader.isVerified || trader.total_volume > 100); // Показываем верифицированных или активных трейдеров
        
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
        
        const query = `
            SELECT 
                e.token_mint,
                COUNT(DISTINCT e.wallet) as trader_count,
                COUNT(*) as total_trades,
                SUM(e.sol_spent) as volume_sol,
                AVG(e.sol_spent) as avg_trade_size,
                MIN(e.ts) as first_buy,
                MAX(e.ts) as last_activity
            FROM events e
            WHERE e.side = 'BUY' 
            AND e.ts >= NOW() - INTERVAL '${timeInterval}'
            GROUP BY e.token_mint
            HAVING COUNT(DISTINCT e.wallet) >= 2 AND SUM(e.sol_spent) > 10
            ORDER BY trader_count DESC, volume_sol DESC
            LIMIT 50
        `;
        
        const result = await pool.query(query);
        
        // Обогащаем данные метаданными токенов
        let enrichedData = await Promise.all(result.rows.map(async (coin) => {
            const tokenMeta = getTokenMetadata(coin.token_mint);
            return {
                ...coin,
                symbol: tokenMeta?.symbol || coin.token_mint.substring(0, 8),
                name: tokenMeta?.name || 'Unknown Token',
                image: tokenMeta?.image || '/img/token-placeholder.png',
                market_cap: tokenMeta?.market_cap || 0
            };
        }));
        
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
            WHERE side = 'BUY' AND ts >= NOW() - INTERVAL '10 minutes'
            GROUP BY token_mint
            HAVING COUNT(DISTINCT wallet) >= 3 AND SUM(sol_spent) > 10
            ORDER BY unique_buyers DESC, total_volume DESC
            LIMIT 15;
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
            WHERE side = 'BUY' AND ts >= NOW() - INTERVAL '20 minutes'
            GROUP BY token_mint
            HAVING COUNT(DISTINCT wallet) >= 2 AND SUM(sol_spent) > 10
            ORDER BY simultaneous_buyers DESC, total_volume DESC
            LIMIT 15;
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
        console.error('Co-buy error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/smartmoney', async (req, res) => {
    try {
        const query = `
            WITH profitable_wallets AS (
                SELECT wallet, COUNT(DISTINCT token_mint) AS unique_tokens, AVG(sol_spent) AS avg_buy_size
                FROM events
                WHERE side = 'BUY' AND ts > now() - interval '1 hour'
                GROUP BY wallet
                HAVING COUNT(DISTINCT token_mint) >= 3 AND AVG(sol_spent) > 5
            )
            SELECT p.wallet, p.unique_tokens, p.avg_buy_size, e.token_mint, e.sol_spent as sol_spent_needs_price_lookup, e.ts, e.tx_signature
            FROM profitable_wallets p
            JOIN (SELECT wallet, token_mint, sol_spent, ts, tx_signature 
                  FROM events 
                  WHERE side = 'BUY' AND ts > now() - interval '1 hour') e ON p.wallet = e.wallet
            ORDER BY p.unique_tokens DESC, e.ts DESC
            LIMIT 15;
        `;
        const result = await pool.query(query);
        let enrichedData = enrichWalletData(result.rows);
        enrichedData = await enrichTransactionData(enrichedData);
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
            HAVING SUM(e.sol_spent) > 10
            ORDER BY fa.first_seen DESC
            LIMIT 10;
        `;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
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
            WHERE side = 'BUY' AND ts >= NOW() - INTERVAL '1 hour'
            GROUP BY token_mint
            HAVING COUNT(DISTINCT wallet) >= 2 AND SUM(sol_spent) > 20
            ORDER BY buyer_count DESC, total_volume DESC
            LIMIT 15;
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
        console.error('Top gainers error:', error);
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
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Запускаем сервер
startServer();
