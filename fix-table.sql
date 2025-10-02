-- Создание таблицы events с правильной структурой
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    tx_signature VARCHAR(255),
    slot BIGINT,
    ts TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source VARCHAR(100),
    type VARCHAR(50),
    dex VARCHAR(100),
    fee_payer VARCHAR(255),
    fee DECIMAL(18, 9),
    wallet VARCHAR(255),
    side VARCHAR(20),
    token_mint VARCHAR(255),
    token_amount DECIMAL(36, 18),
    native_sol_change DECIMAL(18, 9),
    sol_spent DECIMAL(18, 9),
    sol_received DECIMAL(18, 9),
    usd_value DECIMAL(18, 9),
    wallet_name VARCHAR(255),
    wallet_telegram VARCHAR(500),
    wallet_twitter VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tx_signature, token_mint, side)
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_events_wallet ON events(wallet);
CREATE INDEX IF NOT EXISTS idx_events_token_mint ON events(token_mint);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_side ON events(side);
