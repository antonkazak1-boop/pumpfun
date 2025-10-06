-- Complete Database Fix - Run this in Supabase SQL Editor
-- This will fix all database schema issues

-- 1. Fix users table - add missing columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT,
ADD COLUMN IF NOT EXISTS username VARCHAR(255),
ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(50) DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS total_spent_sol DECIMAL(20, 8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS kolscan_balance DECIMAL(20, 8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Fix tokens table - change market_cap from BIGINT to DECIMAL
ALTER TABLE tokens 
ALTER COLUMN market_cap TYPE DECIMAL(20, 8);

ALTER TABLE tokens 
ALTER COLUMN price TYPE DECIMAL(20, 8);

-- 3. Drop and recreate subscriptions table with correct schema
DROP TABLE IF EXISTS subscriptions CASCADE;
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT,
    subscription_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    price_sol DECIMAL(20, 8) NOT NULL,
    price_stars INTEGER,
    payment_method VARCHAR(50),
    transaction_hash VARCHAR(255),
    kolscan_discount_applied BOOLEAN DEFAULT FALSE,
    discount_percentage INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Drop and recreate payments table with correct schema
DROP TABLE IF EXISTS payments CASCADE;
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    user_id BIGINT,
    subscription_id INTEGER,
    amount_sol DECIMAL(20, 8),
    amount_stars INTEGER,
    payment_method VARCHAR(50) NOT NULL,
    transaction_hash VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP
);

-- 5. Create subscription_tiers table
CREATE TABLE IF NOT EXISTS subscription_tiers (
    id SERIAL PRIMARY KEY,
    tier_name VARCHAR(50) UNIQUE NOT NULL,
    price_sol DECIMAL(20, 8) NOT NULL,
    price_stars INTEGER NOT NULL,
    duration_days INTEGER NOT NULL,
    max_tabs INTEGER,
    features TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create kolscan_settings table
CREATE TABLE IF NOT EXISTS kolscan_settings (
    id SERIAL PRIMARY KEY,
    discount_percentage INTEGER DEFAULT 25,
    min_hold_amount DECIMAL(20, 8) DEFAULT 1000,
    token_address VARCHAR(255) DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Insert default subscription tiers with correct prices
INSERT INTO subscription_tiers (tier_name, price_sol, price_stars, duration_days, max_tabs, features) VALUES
('free', 0, 0, 5, 2, ARRAY['About', 'Analytics', '5-day trial']),
('basic', 0.1, 100, 30, NULL, ARRAY['All tabs', '50 notifications/day', 'Priority support']),
('pro', 0.25, 250, 30, NULL, ARRAY['All tabs', 'Unlimited notifications', 'Early access', 'Advanced analytics', 'Priority support'])
ON CONFLICT (tier_name) DO UPDATE SET
    price_sol = EXCLUDED.price_sol,
    price_stars = EXCLUDED.price_stars,
    duration_days = EXCLUDED.duration_days,
    max_tabs = EXCLUDED.max_tabs,
    features = EXCLUDED.features,
    updated_at = CURRENT_TIMESTAMP;

-- 8. Insert default KOLScan settings
INSERT INTO kolscan_settings (discount_percentage, min_hold_amount, token_address) VALUES
(25, 1000, '')
ON CONFLICT DO NOTHING;

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_type ON users(subscription_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 10. Verify tables were created successfully
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('users', 'subscriptions', 'payments', 'subscription_tiers', 'kolscan_settings', 'tokens', 'events')
ORDER BY tablename;

-- 11. Check table structures
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('users', 'subscriptions', 'payments', 'tokens')
ORDER BY table_name, ordinal_position;
