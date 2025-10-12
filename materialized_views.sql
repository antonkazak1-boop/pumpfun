-- 📊 MATERIALIZED VIEWS для быстрого доступа к Smart Money

-- ================================================
-- ВАЖНО! ТРЕБУЕТСЯ Market Cap в events таблице:
-- ================================================
-- ALTER TABLE events 
-- ADD COLUMN entry_market_cap NUMERIC,
-- ADD COLUMN exit_market_cap NUMERIC,
-- ADD COLUMN entry_price NUMERIC;

-- ================================================
-- TRADER_STATS_DAILY - обновляется раз в час
-- ================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS trader_stats_daily AS
WITH trader_trades AS (
    -- Собираем все пары BUY/SELL для каждого токена
    SELECT 
        wallet,
        token_mint,
        MIN(CASE WHEN side = 'BUY' THEN entry_market_cap END) as buy_market_cap,
        MAX(CASE WHEN side = 'SELL' THEN exit_market_cap END) as sell_market_cap,
        SUM(CASE WHEN side = 'BUY' THEN sol_spent ELSE 0 END) as total_buy_sol,
        SUM(CASE WHEN side = 'SELL' THEN sol_received ELSE 0 END) as total_sell_sol,
        COUNT(CASE WHEN side = 'BUY' THEN 1 END) as buys,
        COUNT(CASE WHEN side = 'SELL' THEN 1 END) as sells
    FROM events
    WHERE ts >= NOW() - INTERVAL '30 days'
      AND wallet IS NOT NULL
    GROUP BY wallet, token_mint
),
trader_stats AS (
    SELECT 
        wallet,
        COUNT(*) as total_trades,
        COUNT(CASE WHEN buys > 0 THEN 1 END) as buy_count,
        COUNT(CASE WHEN sells > 0 THEN 1 END) as sell_count,
        SUM(total_buy_sol + total_sell_sol) as total_volume,
        COUNT(DISTINCT token_mint) as unique_tokens,
        
        -- PnL на основе market cap (правильный расчет!)
        SUM(CASE 
            WHEN sells > 0 AND buy_market_cap > 0 AND sell_market_cap > 0
            THEN total_buy_sol * ((sell_market_cap - buy_market_cap) / buy_market_cap)
            ELSE 0 
        END) as realized_pnl_mc,
        
        -- PnL на основе SOL (текущий, простой)
        SUM(total_sell_sol - total_buy_sol) as realized_pnl_sol,
        
        SUM(total_buy_sol) as total_invested,
        AVG(total_buy_sol / NULLIF(buys, 0)) as avg_buy_size,
        MAX(total_buy_sol) as max_buy_size,
        
        -- Win Rate на основе market cap
        COUNT(CASE WHEN sells > 0 AND sell_market_cap > buy_market_cap THEN 1 END) as winning_tokens_mc,
        
        -- Win Rate на основе SOL (текущий)
        COUNT(CASE WHEN sells > 0 AND total_sell_sol > total_buy_sol THEN 1 END) as winning_tokens_sol,
        
        COUNT(CASE WHEN sells > 0 THEN 1 END) as sold_tokens,
        MAX(CASE WHEN sells > 0 THEN token_mint END) as last_sell_token
    FROM trader_trades
    GROUP BY wallet
    HAVING SUM(total_buy_sol) > 0
)
SELECT 
    *,
    -- ROI на основе market cap (ПРАВИЛЬНЫЙ!)
    CASE WHEN total_invested > 0 AND realized_pnl_mc IS NOT NULL
         THEN (realized_pnl_mc / total_invested * 100) 
         ELSE 0 
    END as roi_percentage_mc,
    
    -- ROI на основе SOL (временный, пока нет market cap)
    CASE WHEN total_invested > 0 
         THEN (realized_pnl_sol / total_invested * 100) 
         ELSE 0 
    END as roi_percentage,
    
    -- Win Rate на основе market cap (ПРАВИЛЬНЫЙ!)
    CASE WHEN sold_tokens > 0 AND winning_tokens_mc > 0
         THEN (winning_tokens_mc::FLOAT / sold_tokens * 100) 
         ELSE 0 
    END as win_rate_mc,
    
    -- Win Rate на основе SOL (временный)
    CASE WHEN sold_tokens > 0 
         THEN (winning_tokens_sol::FLOAT / sold_tokens * 100) 
         ELSE 0 
    END as win_rate,
    
    NOW() as refreshed_at
FROM trader_stats
WHERE total_volume > 0
ORDER BY total_volume DESC;

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_trader_stats_wallet ON trader_stats_daily(wallet);
CREATE INDEX IF NOT EXISTS idx_trader_stats_volume ON trader_stats_daily(total_volume DESC);
CREATE INDEX IF NOT EXISTS idx_trader_stats_roi ON trader_stats_daily(roi_percentage DESC);

-- ================================================
-- REFRESH FUNCTION - запускать раз в день
-- ================================================
CREATE OR REPLACE FUNCTION refresh_trader_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY trader_stats_daily;
    RAISE NOTICE 'Trader stats refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- CRON JOB (через pg_cron extension)
-- ================================================
-- Запускать каждый день в 00:00 UTC
-- SELECT cron.schedule('refresh-trader-stats', '0 0 * * *', 'SELECT refresh_trader_stats()');

-- ================================================
-- MANUAL REFRESH (для тестирования)
-- ================================================
-- SELECT refresh_trader_stats();

-- ================================================
-- USAGE
-- ================================================
-- SELECT * FROM trader_stats_daily 
-- WHERE total_volume > 10 
-- ORDER BY roi_percentage DESC 
-- LIMIT 50;

-- ================================================
-- ОБЪЯСНЕНИЕ РАСЧЕТОВ
-- ================================================

-- ❌ НЕПРАВИЛЬНЫЙ расчет (текущий):
-- ROI = (SOL_received - SOL_spent) / SOL_spent * 100
-- Проблема: Не учитывает изменение цены токена!
-- Пример: Купил за 0.5 SOL, продал за 0.4 SOL
--         → ROI = -20%
--         НО! Market cap вырос с $10K до $100K
--         → Реальный ROI = +900%!

-- ✅ ПРАВИЛЬНЫЙ расчет (нужен market_cap):
-- ROI = ((exit_mc - entry_mc) / entry_mc) * 100
-- Пример: Купил на $10K market cap, продал на $100K
--         → ROI = +900% ✅
-- 
-- Win Rate = COUNT(exit_mc > entry_mc) / COUNT(sells) * 100
-- PnL = invested_sol * (exit_mc / entry_mc - 1)

-- ================================================
-- ПЛАН НА ПОЕЗДКУ (Session 1)
-- ================================================

-- 1. Добавить market_cap колонки в events
-- 2. Обновить webhook для записи market_cap при BUY/SELL
-- 3. Пересоздать materialized view с правильными расчетами
-- 4. Обновить API для использования roi_percentage_mc и win_rate_mc
-- 5. Настроить cron для REFRESH каждый час

-- ================================================
-- TEMPORARY SOLUTION (пока нет market_cap)
-- ================================================
-- Показываем Volume, Trades, Tokens, Avg Buy
-- НЕ показываем ROI/PnL/Win Rate (будет неправильно)
-- Badges на основе Volume и activity, не на ROI

