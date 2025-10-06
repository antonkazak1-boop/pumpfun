-- ========================================
-- PUMP DEX MINI APP - DATABASE SCHEMA
-- ========================================

-- 1. TOKENS TABLE - кэширование метаданных токенов
CREATE TABLE IF NOT EXISTS tokens (
    id SERIAL PRIMARY KEY,
    address VARCHAR(44) UNIQUE NOT NULL,
    symbol VARCHAR(20),
    name VARCHAR(255),
    image TEXT,
    market_cap DECIMAL(20, 8),
    price DECIMAL(20, 8),
    source VARCHAR(50), -- 'pumpfun', 'dexscreener', 'jupiter', 'fallback'
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для tokens
CREATE INDEX IF NOT EXISTS idx_tokens_address ON tokens(address);
CREATE INDEX IF NOT EXISTS idx_tokens_symbol ON tokens(symbol);
CREATE INDEX IF NOT EXISTS idx_tokens_market_cap ON tokens(market_cap);
CREATE INDEX IF NOT EXISTS idx_tokens_last_updated ON tokens(last_updated);

-- 2. PRICES_HISTORY TABLE - исторические цены токенов
CREATE TABLE IF NOT EXISTS prices_history (
    id SERIAL PRIMARY KEY,
    token_address VARCHAR(44) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    market_cap BIGINT,
    volume_24h DECIMAL(20, 8),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source VARCHAR(50),
    FOREIGN KEY (token_address) REFERENCES tokens(address) ON DELETE CASCADE
);

-- Индексы для prices_history
CREATE INDEX IF NOT EXISTS idx_prices_token_address ON prices_history(token_address);
CREATE INDEX IF NOT EXISTS idx_prices_timestamp ON prices_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_prices_token_timestamp ON prices_history(token_address, timestamp);

-- 3. ANALYTICS_CACHE TABLE - кэш агрегированных данных
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

-- 4. USER_WALLETS TABLE - подключенные кошельки пользователей
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

-- 5. PORTFOLIO_SNAPSHOTS TABLE - снимки портфелей трейдеров
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

-- 6. SUBSCRIPTIONS TABLE - система подписок пользователей
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    telegram_user_id BIGINT UNIQUE NOT NULL,
    plan VARCHAR(20) NOT NULL, -- 'trial', 'basic', 'pro', 'premium'
    status VARCHAR(20) NOT NULL, -- 'active', 'expired', 'cancelled'
    trial_started_at TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_started_at TIMESTAMP WITH TIME ZONE,
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(50), -- 'telegram_stars', 'sol', 'usdc', 'usdt'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_telegram_id ON subscriptions(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends ON subscriptions(trial_ends_at);

-- 7. PAYMENTS TABLE - история платежей
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    telegram_user_id BIGINT NOT NULL,
    subscription_id INTEGER,
    amount DECIMAL(20, 8) NOT NULL,
    currency VARCHAR(10) NOT NULL, -- 'stars', 'SOL', 'USDC', 'USDT'
    payment_method VARCHAR(50) NOT NULL,
    transaction_hash VARCHAR(255),
    telegram_payment_id VARCHAR(255),
    status VARCHAR(20) NOT NULL, -- 'pending', 'completed', 'failed', 'refunded'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
);

-- Индексы для payments
CREATE INDEX IF NOT EXISTS idx_payments_telegram_id ON payments(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- 8. USER_ALERTS TABLE - пользовательские алерты
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

-- ========================================
-- ФУНКЦИИ И ТРИГГЕРЫ
-- ========================================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для subscriptions
CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для очистки устаревшего кэша
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM analytics_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- ========================================

-- Вставляем основные токены Solana
INSERT INTO tokens (address, symbol, name, source) VALUES
    ('So11111111111111111111111111111111111111112', 'SOL', 'Solana', 'jupiter'),
    ('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'USDC', 'USD Coin', 'jupiter'),
    ('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', 'USDT', 'Tether USD', 'jupiter')
ON CONFLICT (address) DO NOTHING;

-- ========================================
-- КОММЕНТАРИИ К ТАБЛИЦАМ
-- ========================================

COMMENT ON TABLE tokens IS 'Кэш метаданных токенов для быстрого доступа';
COMMENT ON TABLE prices_history IS 'Исторические цены токенов для графиков';
COMMENT ON TABLE analytics_cache IS 'Кэш агрегированных данных для быстрых запросов';
COMMENT ON TABLE user_wallets IS 'Подключенные кошельки пользователей';
COMMENT ON TABLE portfolio_snapshots IS 'Снимки портфелей трейдеров по периодам';
COMMENT ON TABLE subscriptions IS 'Система подписок пользователей';
COMMENT ON TABLE payments IS 'История платежей';
COMMENT ON TABLE user_alerts IS 'Пользовательские алерты';

-- ========================================
-- ПРАВА ДОСТУПА (если нужно)
-- ========================================

-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
