-- 📊 ADD MARKET CAP TRACKING TO EVENTS
-- Для правильного расчета ROI/PnL/Win Rate

-- Добавить колонки в events
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS entry_market_cap NUMERIC,
ADD COLUMN IF NOT EXISTS exit_market_cap NUMERIC,
ADD COLUMN IF NOT EXISTS entry_price NUMERIC,
ADD COLUMN IF NOT EXISTS exit_price NUMERIC;

-- Создать индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_events_entry_mc ON events(entry_market_cap) WHERE entry_market_cap IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_exit_mc ON events(exit_market_cap) WHERE exit_market_cap IS NOT NULL;

-- Проверка
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name IN ('entry_market_cap', 'exit_market_cap', 'entry_price', 'exit_price');

-- ✅ Готово! Теперь можно записывать market cap при каждой транзакции

