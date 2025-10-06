# 🗄️ Полный список таблиц Pump Dex Mini App

## 📋 **Все таблицы в проекте:**

### ✅ **Основные таблицы (уже созданы):**
1. **`users`** - Пользователи Telegram
   - `id`, `telegram_user_id`, `username`, `first_name`, `last_name`
   - `subscription_type`, `trial_started_at`, `subscription_expires_at`
   - `total_spent_sol`, `kolscan_balance`, `is_active`

2. **`tokens`** - Метаданные токенов (с аватарками!)
   - `id`, `address`, `symbol`, `name`, `image` ⭐
   - `market_cap`, `price`, `source`, `last_updated`

3. **`events`** - Транзакции (основная таблица)
   - `id`, `wallet`, `token_mint`, `side`, `sol_spent`, `sol_received`
   - `wallet_name`, `wallet_telegram`, `wallet_twitter`

4. **`subscriptions`** - Подписки пользователей
   - `id`, `user_id`, `subscription_type`, `status`
   - `price_sol`, `price_stars`, `payment_method`

5. **`payments`** - История платежей
   - `id`, `user_id`, `amount_sol`, `amount_stars`
   - `payment_method`, `transaction_hash`, `status`

6. **`subscription_tiers`** - Тарифные планы
   - `id`, `tier_name`, `price_sol`, `price_stars`
   - `duration_days`, `features`, `is_active`

7. **`kolscan_settings`** - Настройки скидок
   - `id`, `discount_percentage`, `min_hold_amount`
   - `token_address`, `is_active`

### ❓ **Дополнительные таблицы (нужно проверить):**
8. **`prices_history`** - Исторические цены
9. **`analytics_cache`** - Кэш аналитики
10. **`user_wallets`** - Подключенные кошельки
11. **`portfolio_snapshots`** - Снимки портфелей
12. **`user_alerts`** - Пользовательские алерты

## 🎯 **Проблемы и решения:**

### **🖼️ Аватарки токенов:**
- **✅ Поле есть**: `tokens.image` содержит URL
- **✅ Данные есть**: Твой пример показывает `"image":"https://dd.dexscreener.com/..."`
- **❓ Проблема**: Возможно frontend не получает это поле

### **📊 Coin Market:**
- **✅ API работает**: `/api/coins/market` реализован
- **❓ Проблема**: Возможно нет данных в `events` таблице

### **💎 Solana Payment:**
- **✅ Логика есть**: `solanaPayment.js` реализован
- **❓ Проблема**: Не подключен к frontend

### **🪙 KOLScan Discount:**
- **✅ Логика есть**: 25% скидка при ≥1000 токенов
- **✅ Только SOL**: Да, скидка только для SOL платежей
