# 🗄️ Database Setup Guide

## 📋 Overview

This guide explains how to set up the complete database schema for the Pump Dex Mini App in Supabase.

## 🏗️ Database Tables

### Core Tables

1. **`tokens`** - Token metadata cache (name, symbol, image, market cap)
2. **`prices_history`** - Historical token prices for charts
3. **`analytics_cache`** - Cached aggregated data for fast queries
4. **`user_wallets`** - Connected user wallets
5. **`portfolio_snapshots`** - Portfolio snapshots by time periods

### Subscription & Payment Tables

6. **`subscriptions`** - User subscription system
7. **`payments`** - Payment history
8. **`user_alerts`** - Custom user alerts

## 🚀 Setup Instructions

### Option 1: Fresh Installation (Recommended)

1. **Connect to your Supabase project**
2. **Go to SQL Editor**
3. **Run the complete schema:**
   ```sql
   -- Copy and paste the entire content of database_tables.sql
   ```

### Option 2: Migration (If tables already exist)

1. **Connect to your Supabase project**
2. **Go to SQL Editor**
3. **Run the migration script:**
   ```sql
   -- Copy and paste the entire content of database_migrations.sql
   ```

## 📊 Table Details

### 🪙 `tokens`
```sql
- id (SERIAL PRIMARY KEY)
- address (VARCHAR(44) UNIQUE) - Token contract address
- symbol (VARCHAR(20)) - Token symbol (e.g., 'SOL', 'USDC')
- name (VARCHAR(255)) - Token name (e.g., 'Solana')
- image (TEXT) - Token image URL
- market_cap (BIGINT) - Market capitalization
- price (DECIMAL(20,8)) - Current price
- source (VARCHAR(50)) - Data source ('pumpfun', 'dexscreener', 'jupiter')
- last_updated (TIMESTAMP) - Last metadata update
- created_at (TIMESTAMP) - Record creation time
```

### 💰 `prices_history`
```sql
- id (SERIAL PRIMARY KEY)
- token_address (VARCHAR(44)) - Foreign key to tokens
- price (DECIMAL(20,8)) - Historical price
- market_cap (BIGINT) - Historical market cap
- volume_24h (DECIMAL(20,8)) - 24h volume
- timestamp (TIMESTAMP) - Price snapshot time
- source (VARCHAR(50)) - Price data source
```

### ⚡ `analytics_cache`
```sql
- id (SERIAL PRIMARY KEY)
- cache_key (VARCHAR(255) UNIQUE) - Cache identifier
- data (JSONB) - Cached data
- expires_at (TIMESTAMP) - Cache expiration
- created_at (TIMESTAMP) - Cache creation
```

### 👤 `user_wallets`
```sql
- id (SERIAL PRIMARY KEY)
- telegram_user_id (BIGINT) - Telegram user ID
- wallet_address (VARCHAR(44)) - Solana wallet address
- wallet_name (VARCHAR(255)) - Custom wallet name
- is_verified (BOOLEAN) - Verification status
- connected_at (TIMESTAMP) - Connection time
- last_activity (TIMESTAMP) - Last activity
```

### 📊 `portfolio_snapshots`
```sql
- id (SERIAL PRIMARY KEY)
- wallet_address (VARCHAR(44)) - Wallet address
- token_address (VARCHAR(44)) - Token address
- balance (DECIMAL(20,8)) - Token balance
- value_usd (DECIMAL(20,2)) - USD value
- percentage (DECIMAL(5,2)) - Portfolio percentage
- snapshot_date (TIMESTAMP) - Snapshot time
- period (VARCHAR(20)) - Snapshot period
```

### 💳 `subscriptions`
```sql
- id (SERIAL PRIMARY KEY)
- telegram_user_id (BIGINT UNIQUE) - Telegram user ID
- plan (VARCHAR(20)) - Subscription plan
- status (VARCHAR(20)) - Subscription status
- trial_started_at (TIMESTAMP) - Trial start
- trial_ends_at (TIMESTAMP) - Trial end
- subscription_started_at (TIMESTAMP) - Paid subscription start
- subscription_ends_at (TIMESTAMP) - Paid subscription end
- payment_method (VARCHAR(50)) - Payment method
- created_at (TIMESTAMP) - Creation time
- updated_at (TIMESTAMP) - Last update
```

### 💰 `payments`
```sql
- id (SERIAL PRIMARY KEY)
- telegram_user_id (BIGINT) - Telegram user ID
- subscription_id (INTEGER) - Foreign key to subscriptions
- amount (DECIMAL(20,8)) - Payment amount
- currency (VARCHAR(10)) - Currency (stars, SOL, USDC, USDT)
- payment_method (VARCHAR(50)) - Payment method
- transaction_hash (VARCHAR(255)) - Blockchain transaction hash
- telegram_payment_id (VARCHAR(255)) - Telegram payment ID
- status (VARCHAR(20)) - Payment status
- created_at (TIMESTAMP) - Payment time
- completed_at (TIMESTAMP) - Completion time
```

### 🚨 `user_alerts`
```sql
- id (SERIAL PRIMARY KEY)
- telegram_user_id (BIGINT) - Telegram user ID
- alert_type (VARCHAR(50)) - Alert type
- target_wallet (VARCHAR(44)) - Target wallet address
- target_token (VARCHAR(44)) - Target token address
- threshold (DECIMAL(20,8)) - Alert threshold
- is_active (BOOLEAN) - Alert status
- last_triggered (TIMESTAMP) - Last trigger time
- created_at (TIMESTAMP) - Creation time
```

## 🔧 Functions & Triggers

### Automatic Updates
- **`update_updated_at_column()`** - Automatically updates `updated_at` timestamp
- **`cleanup_expired_cache()`** - Cleans up expired cache entries

### Triggers
- **`update_subscriptions_updated_at`** - Updates subscription timestamps

## 📈 Performance Optimizations

### Indexes
All tables have optimized indexes for:
- Primary lookups
- Time-based queries
- User-specific queries
- Cache operations

### Query Optimization
- Foreign key constraints for data integrity
- JSONB for flexible cache data
- Proper data types for Solana addresses and amounts

## 🔒 Security

### Row Level Security (RLS)
Consider enabling RLS for user-specific tables:
```sql
-- Enable RLS on user tables
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies (example for user_wallets)
CREATE POLICY "Users can only see their own wallets" ON user_wallets
    FOR ALL USING (telegram_user_id = current_setting('app.current_user_id')::bigint);
```

## 🧹 Maintenance

### Regular Cleanup
Run periodic cleanup to maintain performance:
```sql
-- Clean expired cache (run daily)
SELECT cleanup_expired_cache();

-- Clean old price history (run weekly)
DELETE FROM prices_history 
WHERE timestamp < NOW() - INTERVAL '30 days';

-- Clean old portfolio snapshots (run monthly)
DELETE FROM portfolio_snapshots 
WHERE snapshot_date < NOW() - INTERVAL '90 days';
```

## 📊 Monitoring

### Key Metrics to Monitor
- Cache hit rate
- Query performance
- Storage usage
- Active subscriptions

### Useful Queries
```sql
-- Cache performance
SELECT 
    COUNT(*) as total_cache_entries,
    COUNT(*) FILTER (WHERE expires_at > NOW()) as active_cache,
    AVG(EXTRACT(EPOCH FROM (expires_at - created_at))) as avg_ttl_seconds
FROM analytics_cache;

-- Subscription stats
SELECT 
    plan,
    status,
    COUNT(*) as user_count
FROM subscriptions 
GROUP BY plan, status;

-- User activity
SELECT 
    COUNT(DISTINCT telegram_user_id) as active_users,
    COUNT(*) as total_wallets,
    AVG(EXTRACT(EPOCH FROM (NOW() - last_activity))/3600) as avg_hours_since_activity
FROM user_wallets 
WHERE last_activity > NOW() - INTERVAL '7 days';
```

## 🚨 Troubleshooting

### Common Issues

1. **Foreign Key Errors**
   - Ensure tokens are inserted before prices_history
   - Check token addresses are valid Solana addresses

2. **Cache Issues**
   - Monitor cache expiration times
   - Check JSONB data validity

3. **Performance Issues**
   - Verify indexes are created
   - Run EXPLAIN ANALYZE on slow queries
   - Consider partitioning for large tables

### Support
If you encounter issues:
1. Check Supabase logs
2. Verify table permissions
3. Test with sample data
4. Review query execution plans

---

**✅ Database setup complete! Your Pump Dex Mini App is ready for production!**
