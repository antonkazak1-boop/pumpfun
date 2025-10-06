-- Database Diagnostic Script
-- Run this in Supabase SQL Editor to check database status

-- 1. Check all tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Check users table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 3. Check users table data
SELECT 
    id,
    telegram_user_id,
    username,
    first_name,
    subscription_type,
    trial_used,
    created_at,
    last_active
FROM users 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Check tokens table data
SELECT 
    address,
    symbol,
    name,
    source,
    last_updated
FROM tokens 
ORDER BY last_updated DESC 
LIMIT 10;

-- 5. Check subscription_tiers table
SELECT 
    tier_name,
    price_sol,
    price_stars,
    duration_days,
    features
FROM subscription_tiers 
ORDER BY price_sol;

-- 6. Check subscriptions table
SELECT 
    id,
    user_id,
    subscription_type,
    status,
    started_at,
    expires_at
FROM subscriptions 
ORDER BY started_at DESC 
LIMIT 10;

-- 7. Check payments table
SELECT 
    id,
    user_id,
    amount_sol,
    payment_method,
    status,
    created_at
FROM payments 
ORDER BY created_at DESC 
LIMIT 10;

-- 8. Count records in each table
SELECT 
    'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 
    'tokens' as table_name, COUNT(*) as record_count FROM tokens
UNION ALL
SELECT 
    'subscriptions' as table_name, COUNT(*) as record_count FROM subscriptions
UNION ALL
SELECT 
    'payments' as table_name, COUNT(*) as record_count FROM payments
UNION ALL
SELECT 
    'subscription_tiers' as table_name, COUNT(*) as record_count FROM subscription_tiers
UNION ALL
SELECT 
    'events' as table_name, COUNT(*) as record_count FROM events;
