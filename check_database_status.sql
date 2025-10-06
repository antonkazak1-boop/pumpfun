-- Check Database Status - Run this in Supabase SQL Editor
-- This will show all existing tables and their structure

-- 1. Check all tables that exist
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Check table structures for main tables
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('users', 'subscriptions', 'payments', 'subscription_tiers', 'kolscan_settings', 'tokens', 'events', 'prices_history', 'analytics_cache', 'user_wallets', 'portfolio_snapshots', 'user_alerts')
ORDER BY table_name, ordinal_position;

-- 3. Check data counts in each table
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'subscription_tiers', COUNT(*) FROM subscription_tiers
UNION ALL
SELECT 'kolscan_settings', COUNT(*) FROM kolscan_settings
UNION ALL
SELECT 'tokens', COUNT(*) FROM tokens
UNION ALL
SELECT 'events', COUNT(*) FROM events
UNION ALL
SELECT 'prices_history', COUNT(*) FROM prices_history
UNION ALL
SELECT 'analytics_cache', COUNT(*) FROM analytics_cache
UNION ALL
SELECT 'user_wallets', COUNT(*) FROM user_wallets
UNION ALL
SELECT 'portfolio_snapshots', COUNT(*) FROM portfolio_snapshots
UNION ALL
SELECT 'user_alerts', COUNT(*) FROM user_alerts;

-- 4. Check sample data from tokens table (to see if images are there)
SELECT address, symbol, name, image, market_cap, price, source 
FROM tokens 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Check sample data from events table
SELECT token_mint, wallet, side, sol_spent, ts 
FROM events 
ORDER BY ts DESC 
LIMIT 5;
