-- 📋 SUPABASE SETUP SCRIPT
-- Run this in Supabase SQL Editor to create all tables

-- ================================================
-- PAYMENT INTENTS TABLE (for secure Solana payment)
-- ================================================
CREATE TABLE IF NOT EXISTS payment_intents (
    id SERIAL PRIMARY KEY,
    intent_id VARCHAR(100) UNIQUE NOT NULL,
    telegram_user_id BIGINT NOT NULL,
    subscription_type VARCHAR(20) NOT NULL, -- 'basic', 'pro'
    expected_amount_sol DECIMAL(20, 8) NOT NULL,
    from_wallet VARCHAR(44), -- optional, for discount check
    merchant_wallet VARCHAR(44) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'expired', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    tx_signature VARCHAR(255)
);

-- Indexes for payment_intents
CREATE INDEX IF NOT EXISTS idx_payment_intents_intent_id ON payment_intents(intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id ON payment_intents(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);

-- ================================================
-- PENDING PAYMENTS TABLE (fallback for webhook)
-- ================================================
CREATE TABLE IF NOT EXISTS pending_payments (
    id SERIAL PRIMARY KEY,
    from_wallet VARCHAR(44) NOT NULL,
    amount_sol DECIMAL(20, 8) NOT NULL,
    tx_signature VARCHAR(255) UNIQUE NOT NULL,
    subscription_type VARCHAR(20) NOT NULL, -- 'basic', 'pro'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'activated', 'expired'
    telegram_user_id BIGINT, -- filled when user claims payment
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for pending_payments
CREATE INDEX IF NOT EXISTS idx_pending_payments_wallet ON pending_payments(from_wallet);
CREATE INDEX IF NOT EXISTS idx_pending_payments_status ON pending_payments(status);
CREATE INDEX IF NOT EXISTS idx_pending_payments_tx ON pending_payments(tx_signature);

-- ================================================
-- TEST QUERIES
-- ================================================

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('payment_intents', 'pending_payments');

-- Test insert
INSERT INTO payment_intents 
(intent_id, telegram_user_id, subscription_type, expected_amount_sol, merchant_wallet, expires_at)
VALUES 
('test_intent_123', 123456789, 'basic', 0.01, 'G1baEgxW9rFLbPr8M6SmAxEbpeLw5Z5j4xyYwt8emTha', NOW() + INTERVAL '30 minutes');

-- Verify insert
SELECT * FROM payment_intents WHERE intent_id = 'test_intent_123';

-- Clean up test
DELETE FROM payment_intents WHERE intent_id = 'test_intent_123';

-- ✅ Done! Tables ready for payment intent system!

