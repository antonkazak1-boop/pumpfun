-- Fix tokens table - change market_cap from BIGINT to DECIMAL
-- Run this in Supabase SQL Editor

-- 1. Check current table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tokens' 
ORDER BY ordinal_position;

-- 2. Update market_cap column type
ALTER TABLE tokens 
ALTER COLUMN market_cap TYPE DECIMAL(20, 8);

-- 3. Also update price column to be more precise
ALTER TABLE tokens 
ALTER COLUMN price TYPE DECIMAL(20, 8);

-- 4. Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tokens' 
ORDER BY ordinal_position;

-- 5. Test with sample data
SELECT 
    address,
    symbol,
    name,
    market_cap,
    price,
    source
FROM tokens 
LIMIT 5;
