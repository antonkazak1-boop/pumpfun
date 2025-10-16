-- 🗑️ REMOVE DUPLICATES FROM EVENTS TABLE

-- ================================================
-- ШАГ 1: Посмотри сколько дубликатов
-- ================================================
SELECT tx_signature, COUNT(*) as count
FROM events
GROUP BY tx_signature
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 20;

-- ================================================
-- ШАГ 2: Удали дубликаты (оставь самый новый)
-- ================================================
DELETE FROM events a USING (
    SELECT MIN(id) as id, tx_signature
    FROM events
    GROUP BY tx_signature
    HAVING COUNT(*) > 1
) b
WHERE a.tx_signature = b.tx_signature 
AND a.id > b.id;

-- ================================================
-- ШАГ 3: Проверь - дубликатов больше нет
-- ================================================
SELECT tx_signature, COUNT(*) as count
FROM events
GROUP BY tx_signature
HAVING COUNT(*) > 1;

-- Должно вернуть 0 строк!

-- ================================================
-- ШАГ 4: ТЕПЕРЬ создай UNIQUE constraint
-- ================================================
ALTER TABLE events 
ADD CONSTRAINT events_tx_signature_unique 
UNIQUE (tx_signature);

-- ================================================
-- ШАГ 5: Проверь constraint создан
-- ================================================
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'events'::regclass
AND conname LIKE '%tx_signature%';

-- ✅ Должен показать: events_tx_signature_unique | u

-- ================================================
-- РЕЗУЛЬТАТ
-- ================================================
-- Теперь в events не будет дубликатов по tx_signature!
-- И market cap будет обновляться если приходит дважды!

