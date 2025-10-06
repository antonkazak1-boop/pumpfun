-- Missing Database Tables - Run this in Supabase SQL Editor
-- This will create all missing tables that are not in complete_database_fix.sql

-- 1. PRICES_HISTORY TABLE - исторические цены токенов
CREATE TABLE IF NOT EXISTS prices_history (
    id SERIAL PRIMARY KEY,
    token_address VARCHAR(44) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    market_cap DECIMAL(20, 8),
    volume_24h DECIMAL(20, 8),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source VARCHAR(50)
);

-- Индексы для prices_history
CREATE INDEX IF NOT EXISTS idx_prices_token_address ON prices_history(token_address);
CREATE INDEX IF NOT EXISTS idx_prices_timestamp ON prices_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_prices_token_timestamp ON prices_history(token_address, timestamp);

-- 2. ANALYTICS_CACHE TABLE - кэш агрегированных данных
CREATE TABLE IF NOT EXISTS analytics_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для analytics_cache
CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);

-- 3. USER_WALLETS TABLE - подключенные кошельки пользователей
CREATE TABLE IF NOT EXISTS user_wallets (
    id SERIAL PRIMARY KEY,
    telegram_user_id BIGINT NOT NULL,
    wallet_address VARCHAR(44) NOT NULL,
    wallet_name VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE,
    UNIQUE(telegram_user_id, wallet_address)
);

-- Индексы для user_wallets
CREATE INDEX IF NOT EXISTS idx_user_wallets_telegram_id ON user_wallets(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON user_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_wallets_connected_at ON user_wallets(connected_at);

-- 4. PORTFOLIO_SNAPSHOTS TABLE - снимки портфелей трейдеров
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(44) NOT NULL,
    token_address VARCHAR(44) NOT NULL,
    balance DECIMAL(20, 8) NOT NULL,
    value_usd DECIMAL(20, 2),
    percentage DECIMAL(5, 2),
    snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    period VARCHAR(20) -- 'daily', 'weekly', 'monthly'
);

-- Индексы для portfolio_snapshots
CREATE INDEX IF NOT EXISTS idx_portfolio_wallet ON portfolio_snapshots(wallet_address);
CREATE INDEX IF NOT EXISTS idx_portfolio_token ON portfolio_snapshots(token_address);
CREATE INDEX IF NOT EXISTS idx_portfolio_date ON portfolio_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_portfolio_wallet_date ON portfolio_snapshots(wallet_address, snapshot_date);

-- 5. USER_ALERTS TABLE - пользовательские алерты
CREATE TABLE IF NOT EXISTS user_alerts (
    id SERIAL PRIMARY KEY,
    telegram_user_id BIGINT NOT NULL,
    alert_type VARCHAR(50) NOT NULL, -- 'wallet_buy', 'token_surge', 'whale_move'
    target_wallet VARCHAR(44),
    target_token VARCHAR(44),
    threshold DECIMAL(20, 8),
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для user_alerts
CREATE INDEX IF NOT EXISTS idx_user_alerts_telegram_id ON user_alerts(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_type ON user_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_user_alerts_active ON user_alerts(is_active);

-- 6. Вставляем основные токены Solana
INSERT INTO tokens (address, symbol, name, source) VALUES
    ('So11111111111111111111111111111111111111112', 'SOL', 'Solana', 'jupiter'),
    ('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'USDC', 'USD Coin', 'jupiter'),
    ('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', 'USDT', 'Tether USD', 'jupiter')
ON CONFLICT (address) DO NOTHING;

-- 7. Проверяем какие таблицы созданы
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('tokens', 'users', 'subscriptions', 'payments', 'subscription_tiers', 'kolscan_settings', 'events', 'prices_history', 'analytics_cache', 'user_wallets', 'portfolio_snapshots', 'user_alerts')
ORDER BY tablename;
