-- 📊 MATERIALIZED VIEWS для быстрого доступа к Smart Money

-- ================================================
-- TRADER_STATS_DAILY - обновляется раз в день
-- ================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS trader_stats_daily AS
WITH trader_stats AS (
    SELECT 
        wallet,
        COUNT(*) as total_trades, 
        COALESCE(SUM(CASE WHEN side = 'BUY' THEN sol_spent ELSE 0 END), 0) + 
        COALESCE(SUM(CASE WHEN side = 'SELL' THEN sol_received ELSE 0 END), 0) as total_volume,
        COUNT(DISTINCT token_mint) as unique_tokens,
        MAX(ts) as last_activity,
        COALESCE(SUM(CASE WHEN side = 'SELL' THEN sol_received ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN side = 'BUY' THEN sol_spent ELSE 0 END), 0) as realized_pnl,
        COALESCE(SUM(CASE WHEN side = 'BUY' THEN sol_spent ELSE 0 END), 0) as total_invested,
        COUNT(CASE WHEN side = 'BUY' THEN 1 END) as buy_count,
        COUNT(CASE WHEN side = 'SELL' THEN 1 END) as sell_count,
        AVG(CASE WHEN side = 'BUY' THEN sol_spent END) as avg_buy_size,
        MAX(CASE WHEN side = 'BUY' THEN sol_spent END) as max_buy_size,
        COUNT(DISTINCT CASE WHEN side = 'SELL' AND sol_received > sol_spent THEN token_mint END) as winning_tokens,
        COUNT(DISTINCT CASE WHEN side = 'SELL' THEN token_mint END) as sold_tokens
    FROM events
    WHERE ts >= NOW() - INTERVAL '30 days'
      AND wallet IS NOT NULL
    GROUP BY wallet 
    HAVING COALESCE(SUM(CASE WHEN side = 'BUY' THEN sol_spent ELSE 0 END), 0) > 0
)
SELECT 
    *,
    CASE WHEN total_invested > 0 
         THEN (realized_pnl / total_invested * 100) 
         ELSE 0 
    END as roi_percentage,
    CASE WHEN sold_tokens > 0 
         THEN (winning_tokens::FLOAT / sold_tokens * 100) 
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

