-- 🔧 FIX EVENTS TABLE - Add unique constraint on tx_signature

-- ПРОБЛЕМА: ON CONFLICT (id) блокирует вставку новых записей
-- РЕШЕНИЕ: Добавить unique constraint на tx_signature

-- ================================================
-- ШАГ 1: Проверь дубликаты (если есть)
-- ================================================
SELECT tx_signature, COUNT(*) as count
FROM events
GROUP BY tx_signature
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 10;

-- ================================================
-- ШАГ 2: Удали дубликаты (если нашлись)
-- ================================================
-- DELETE FROM events a USING events b
-- WHERE a.id > b.id 
-- AND a.tx_signature = b.tx_signature;

-- ================================================
-- ШАГ 3: Добавь UNIQUE constraint
-- ================================================
ALTER TABLE events 
ADD CONSTRAINT events_tx_signature_unique 
UNIQUE (tx_signature);

-- ================================================
-- ШАГ 4: Проверь
-- ================================================
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'events'::regclass
AND conname LIKE '%tx_signature%';

-- ✅ Должен показать: events_tx_signature_unique | u

-- ================================================
-- ТЕПЕРЬ В КОДЕ МОЖНО ИСПОЛЬЗОВАТЬ:
-- ================================================
-- INSERT INTO events (...) VALUES (...)
-- ON CONFLICT (tx_signature) DO NOTHING;
-- 
-- Это предотвратит дубликаты по tx_signature!

