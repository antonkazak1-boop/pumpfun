-- Quick fix for database issues
-- Run this in Supabase SQL Editor

-- 1. Update subscription tiers with correct pricing
UPDATE subscription_tiers SET 
    price_sol = 0,
    price_stars = 0,
    duration_days = 5,
    max_tabs = 2,
    features = ARRAY['About', 'Analytics', '5-day trial'],
    updated_at = CURRENT_TIMESTAMP
WHERE tier_name = 'free';

UPDATE subscription_tiers SET 
    price_sol = 0.1,
    price_stars = 100,
    duration_days = 30,
    max_tabs = NULL,
    features = ARRAY['All tabs', '50 notifications/day', 'Priority support'],
    updated_at = CURRENT_TIMESTAMP
WHERE tier_name = 'basic';

UPDATE subscription_tiers SET 
    price_sol = 0.25,
    price_stars = 250,
    duration_days = 30,
    max_tabs = NULL,
    features = ARRAY['All tabs', 'Unlimited notifications', 'Early access', 'Advanced analytics', 'Priority support'],
    updated_at = CURRENT_TIMESTAMP
WHERE tier_name = 'pro';

-- 2. Verify tables exist and have correct structure
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('users', 'subscriptions', 'payments', 'subscription_tiers', 'kolscan_settings')
ORDER BY table_name, ordinal_position;

-- 3. Check subscription tiers
SELECT tier_name, price_sol, price_stars, duration_days, features 
FROM subscription_tiers 
ORDER BY price_sol;

-- 4. Test query to check if everything works
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as subscription_count FROM subscriptions;
SELECT COUNT(*) as tier_count FROM subscription_tiers;
