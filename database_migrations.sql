-- ========================================
-- PUMP DEX MINI APP - DATABASE MIGRATIONS
-- ========================================

-- Проверяем существование таблиц и создаем их если нужно
-- Этот скрипт безопасен для повторного запуска

-- 1. TOKENS TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tokens') THEN
        CREATE TABLE tokens (
            id SERIAL PRIMARY KEY,
            address VARCHAR(44) UNIQUE NOT NULL,
            symbol VARCHAR(20),
            name VARCHAR(255),
            image TEXT,
            market_cap BIGINT,
            price DECIMAL(20, 8),
            source VARCHAR(50) DEFAULT 'fallback',
            last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_tokens_address ON tokens(address);
        CREATE INDEX idx_tokens_symbol ON tokens(symbol);
        CREATE INDEX idx_tokens_market_cap ON tokens(market_cap);
        CREATE INDEX idx_tokens_last_updated ON tokens(last_updated);
        
        RAISE NOTICE 'Table tokens created successfully';
    ELSE
        RAISE NOTICE 'Table tokens already exists';
    END IF;
END $$;

-- 2. PRICES_HISTORY TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prices_history') THEN
        CREATE TABLE prices_history (
            id SERIAL PRIMARY KEY,
            token_address VARCHAR(44) NOT NULL,
            price DECIMAL(20, 8) NOT NULL,
            market_cap BIGINT,
            volume_24h DECIMAL(20, 8),
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            source VARCHAR(50)
        );
        
        CREATE INDEX idx_prices_token_address ON prices_history(token_address);
        CREATE INDEX idx_prices_timestamp ON prices_history(timestamp);
        CREATE INDEX idx_prices_token_timestamp ON prices_history(token_address, timestamp);
        
        -- Добавляем внешний ключ если таблица tokens существует
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tokens') THEN
            ALTER TABLE prices_history ADD CONSTRAINT fk_prices_token 
                FOREIGN KEY (token_address) REFERENCES tokens(address) ON DELETE CASCADE;
        END IF;
        
        RAISE NOTICE 'Table prices_history created successfully';
    ELSE
        RAISE NOTICE 'Table prices_history already exists';
    END IF;
END $$;

-- 3. ANALYTICS_CACHE TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_cache') THEN
        CREATE TABLE analytics_cache (
            id SERIAL PRIMARY KEY,
            cache_key VARCHAR(255) UNIQUE NOT NULL,
            data JSONB NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_analytics_cache_key ON analytics_cache(cache_key);
        CREATE INDEX idx_analytics_cache_expires ON analytics_cache(expires_at);
        
        RAISE NOTICE 'Table analytics_cache created successfully';
    ELSE
        RAISE NOTICE 'Table analytics_cache already exists';
    END IF;
END $$;

-- 4. USER_WALLETS TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_wallets') THEN
        CREATE TABLE user_wallets (
            id SERIAL PRIMARY KEY,
            telegram_user_id BIGINT NOT NULL,
            wallet_address VARCHAR(44) NOT NULL,
            wallet_name VARCHAR(255),
            is_verified BOOLEAN DEFAULT FALSE,
            connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            last_activity TIMESTAMP WITH TIME ZONE,
            UNIQUE(telegram_user_id, wallet_address)
        );
        
        CREATE INDEX idx_user_wallets_telegram_id ON user_wallets(telegram_user_id);
        CREATE INDEX idx_user_wallets_address ON user_wallets(wallet_address);
        CREATE INDEX idx_user_wallets_connected_at ON user_wallets(connected_at);
        
        RAISE NOTICE 'Table user_wallets created successfully';
    ELSE
        RAISE NOTICE 'Table user_wallets already exists';
    END IF;
END $$;

-- 5. PORTFOLIO_SNAPSHOTS TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'portfolio_snapshots') THEN
        CREATE TABLE portfolio_snapshots (
            id SERIAL PRIMARY KEY,
            wallet_address VARCHAR(44) NOT NULL,
            token_address VARCHAR(44) NOT NULL,
            balance DECIMAL(20, 8) NOT NULL,
            value_usd DECIMAL(20, 2),
            percentage DECIMAL(5, 2),
            snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            period VARCHAR(20) DEFAULT 'daily'
        );
        
        CREATE INDEX idx_portfolio_wallet ON portfolio_snapshots(wallet_address);
        CREATE INDEX idx_portfolio_token ON portfolio_snapshots(token_address);
        CREATE INDEX idx_portfolio_date ON portfolio_snapshots(snapshot_date);
        CREATE INDEX idx_portfolio_wallet_date ON portfolio_snapshots(wallet_address, snapshot_date);
        
        RAISE NOTICE 'Table portfolio_snapshots created successfully';
    ELSE
        RAISE NOTICE 'Table portfolio_snapshots already exists';
    END IF;
END $$;

-- 6. SUBSCRIPTIONS TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
        CREATE TABLE subscriptions (
            id SERIAL PRIMARY KEY,
            telegram_user_id BIGINT UNIQUE NOT NULL,
            plan VARCHAR(20) NOT NULL DEFAULT 'trial',
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            trial_started_at TIMESTAMP WITH TIME ZONE,
            trial_ends_at TIMESTAMP WITH TIME ZONE,
            subscription_started_at TIMESTAMP WITH TIME ZONE,
            subscription_ends_at TIMESTAMP WITH TIME ZONE,
            payment_method VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_subscriptions_telegram_id ON subscriptions(telegram_user_id);
        CREATE INDEX idx_subscriptions_status ON subscriptions(status);
        CREATE INDEX idx_subscriptions_trial_ends ON subscriptions(trial_ends_at);
        
        RAISE NOTICE 'Table subscriptions created successfully';
    ELSE
        RAISE NOTICE 'Table subscriptions already exists';
    END IF;
END $$;

-- 7. PAYMENTS TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        CREATE TABLE payments (
            id SERIAL PRIMARY KEY,
            telegram_user_id BIGINT NOT NULL,
            subscription_id INTEGER,
            amount DECIMAL(20, 8) NOT NULL,
            currency VARCHAR(10) NOT NULL,
            payment_method VARCHAR(50) NOT NULL,
            transaction_hash VARCHAR(255),
            telegram_payment_id VARCHAR(255),
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            completed_at TIMESTAMP WITH TIME ZONE
        );
        
        CREATE INDEX idx_payments_telegram_id ON payments(telegram_user_id);
        CREATE INDEX idx_payments_status ON payments(status);
        CREATE INDEX idx_payments_created_at ON payments(created_at);
        
        -- Добавляем внешний ключ если таблица subscriptions существует
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
            ALTER TABLE payments ADD CONSTRAINT fk_payments_subscription 
                FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL;
        END IF;
        
        RAISE NOTICE 'Table payments created successfully';
    ELSE
        RAISE NOTICE 'Table payments already exists';
    END IF;
END $$;

-- 8. USER_ALERTS TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_alerts') THEN
        CREATE TABLE user_alerts (
            id SERIAL PRIMARY KEY,
            telegram_user_id BIGINT NOT NULL,
            alert_type VARCHAR(50) NOT NULL,
            target_wallet VARCHAR(44),
            target_token VARCHAR(44),
            threshold DECIMAL(20, 8),
            is_active BOOLEAN DEFAULT TRUE,
            last_triggered TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_user_alerts_telegram_id ON user_alerts(telegram_user_id);
        CREATE INDEX idx_user_alerts_type ON user_alerts(alert_type);
        CREATE INDEX idx_user_alerts_active ON user_alerts(is_active);
        
        RAISE NOTICE 'Table user_alerts created successfully';
    ELSE
        RAISE NOTICE 'Table user_alerts already exists';
    END IF;
END $$;

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

-- Триггер для subscriptions (если таблица существует)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
        DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
        CREATE TRIGGER update_subscriptions_updated_at 
            BEFORE UPDATE ON subscriptions 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Trigger update_subscriptions_updated_at created';
    END IF;
END $$;

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

-- Вставляем основные токены Solana (если их еще нет)
INSERT INTO tokens (address, symbol, name, source) VALUES
    ('So11111111111111111111111111111111111111112', 'SOL', 'Solana', 'jupiter'),
    ('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'USDC', 'USD Coin', 'jupiter'),
    ('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', 'USDT', 'Tether USD', 'jupiter')
ON CONFLICT (address) DO NOTHING;

-- ========================================
-- ПРОВЕРКА РЕЗУЛЬТАТА
-- ========================================

-- Выводим список созданных таблиц
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'tokens', 'prices_history', 'analytics_cache', 
    'user_wallets', 'portfolio_snapshots', 'subscriptions', 
    'payments', 'user_alerts'
)
ORDER BY tablename;

-- Выводим количество строк в каждой таблице
SELECT 
    'tokens' as table_name, COUNT(*) as row_count FROM tokens
UNION ALL
SELECT 
    'prices_history' as table_name, COUNT(*) as row_count FROM prices_history
UNION ALL
SELECT 
    'analytics_cache' as table_name, COUNT(*) as row_count FROM analytics_cache
UNION ALL
SELECT 
    'user_wallets' as table_name, COUNT(*) as row_count FROM user_wallets
UNION ALL
SELECT 
    'portfolio_snapshots' as table_name, COUNT(*) as row_count FROM portfolio_snapshots
UNION ALL
SELECT 
    'subscriptions' as table_name, COUNT(*) as row_count FROM subscriptions
UNION ALL
SELECT 
    'payments' as table_name, COUNT(*) as row_count FROM payments
UNION ALL
SELECT 
    'user_alerts' as table_name, COUNT(*) as row_count FROM user_alerts;

RAISE NOTICE 'Database migration completed successfully!';
