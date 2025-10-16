# 🚨 СРОЧНОЕ ИСПРАВЛЕНИЕ ПЛАТЕЖЕЙ

## 🔥 **ЧТО СЛОМАЛОСЬ:**

1. ❌ **payment_intents** table не создана в Supabase
2. ❌ KOLScan discount check не работает
3. ❌ Solana payment verification не подтверждает

---

## ✅ **РЕШЕНИЕ - ШАГ ЗА ШАГОМ:**

### **ШАГ 1: Создай таблицы в Supabase** (2 минуты)

1. Открой **Supabase Dashboard**: https://supabase.com/dashboard
2. Выбери проект: `gzwxdmoqntnninlqpmmw`
3. Перейди: **SQL Editor** → **New Query**
4. Скопируй и выполни:

```sql
-- ================================================
-- PAYMENT INTENTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS payment_intents (
    id SERIAL PRIMARY KEY,
    intent_id VARCHAR(100) UNIQUE NOT NULL,
    telegram_user_id BIGINT NOT NULL,
    subscription_type VARCHAR(20) NOT NULL,
    expected_amount_sol DECIMAL(20, 8) NOT NULL,
    from_wallet VARCHAR(44),
    merchant_wallet VARCHAR(44) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    tx_signature VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_intent_id ON payment_intents(intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id ON payment_intents(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);

-- ================================================
-- PENDING PAYMENTS TABLE (fallback)
-- ================================================
CREATE TABLE IF NOT EXISTS pending_payments (
    id SERIAL PRIMARY KEY,
    from_wallet VARCHAR(44) NOT NULL,
    amount_sol DECIMAL(20, 8) NOT NULL,
    tx_signature VARCHAR(255) UNIQUE NOT NULL,
    subscription_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    telegram_user_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_pending_payments_wallet ON pending_payments(from_wallet);
CREATE INDEX IF NOT EXISTS idx_pending_payments_status ON pending_payments(status);
CREATE INDEX IF NOT EXISTS idx_pending_payments_tx ON pending_payments(tx_signature);

-- ================================================
-- ПРОВЕРКА
-- ================================================
SELECT 'payment_intents' as table_name, COUNT(*) as rows FROM payment_intents
UNION ALL
SELECT 'pending_payments', COUNT(*) FROM pending_payments;
```

5. Нажми **Run** (или F5)
6. Должен появиться результат:
   ```
   table_name         | rows
   -------------------+------
   payment_intents    | 0
   pending_payments   | 0
   ```

✅ **Готово!** Таблицы созданы!

---

### **ШАГ 2: Проверь KOLScan Balance Endpoint** (1 минута)

Открой в браузере:
```
https://pumpfun-u7av.onrender.com/api/kolscan/balance/FzDzVN9y7PJgRn21gGRtMQVmo9NzS1V2VzWxpRRHMsE4
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "balance": 5000,
  "hasMinimumHold": true,
  "tokenAddress": "Db8vz7nh1jbjxVBatBRgQWafqB5iDaW7A1VNh6DmraxP"
}
```

**Если ошибка:**
- Проверь логи Render: Dashboard → Logs
- Ищи: `Error checking KOLScan balance`

---

### **ШАГ 3: Тест Payment Intent Creation** (1 минута)

Выполни в терминале:
```bash
curl -X POST https://pumpfun-u7av.onrender.com/api/payment/create-intent \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 123456789,
    "subscriptionType": "pro",
    "fromWallet": "FzDzVN9y7PJgRn21gGRtMQVmo9NzS1V2VzWxpRRHMsE4"
  }'
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "intentId": "intent_123456789_1697...",
  "merchantWallet": "G1baEgxW9rFLbPr8M6SmAxEbpeLw5Z5j4xyYwt8emTha",
  "expectedAmount": 0.02,
  "subscriptionType": "pro"
}
```

**Проверь в Supabase:**
```sql
SELECT * FROM payment_intents ORDER BY created_at DESC LIMIT 1;
```

Должна быть запись! ✅

---

### **ШАГ 4: Настрой Helius Webhook** (3 минуты)

1. **Helius Dashboard**: https://dashboard.helius.dev
2. **Webhooks** → **Create Webhook**
3. **Webhook Type**: `Enhanced Transactions`
4. **Webhook URL**: 
   ```
   https://pumpfun-u7av.onrender.com/webhook/payments
   ```
5. **Transaction Types**: `Native Transfer` (SOL transfers)
6. **Account Addresses**:
   ```
   G1baEgxW9rFLbPr8M6SmAxEbpeLw5Z5j4xyYwt8emTha
   ```
7. **Auth Header** (optional):
   - Header: `x-webhook-auth`
   - Value: `solfun_webhook_secret_2024`
   
8. **Save** и **Send Test Event**

**Проверь логи Render:**
```
💰 Payment webhook received: { ... }
```

✅ **Webhook работает!**

---

### **ШАГ 5: Полный E2E Тест** (5 минут)

#### **A) В Telegram боте:**
1. `/subscribe`
2. Выбери `Pro (0.02 SOL)`
3. "Do you hold KOLScan tokens?" → **Yes**
4. Введи wallet: `FzDzVN9y7PJgRn21gGRtMQVmo9NzS1V2VzWxpRRHMsE4`

**Ожидаемый ответ:**
```
✅ You qualify for 25% discount! (5000 tokens found)

💳 Send exactly 0.015 SOL to:
G1baEgxW9rFLbPr8M6SmAxEbpeLw5Z5j4xyYwt8emTha

⏰ Payment expires in 30 minutes
🔍 Checking for payment...

[✅ I sent payment]
```

#### **B) Отправь SOL:**
- From: `FzDzVN9y7PJgRn21gGRtMQVmo9NzS1V2VzWxpRRHMsE4`
- To: `G1baEgxW9rFLbPr8M6SmAxEbpeLw5Z5j4xyYwt8emTha`
- Amount: `0.015 SOL`

#### **C) Через 30-60 секунд:**

**Helius webhook** автоматически поймает платёж:
```
💰 Payment webhook received
✅ Payment received: 0.015 SOL from FzDz...
🎯 Matched payment intent: intent_123456789_...
✅ Subscription auto-activated for user 123456789
```

**Бот отправит:**
```
✅ Payment confirmed! Your Pro subscription is now active! 🎉
```

---

## 🐛 **ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ:**

### **Проблема 1: payment_intents не записывается**

**Логи:**
```
❌ Database error: relation "payment_intents" does not exist
```

**Решение:**
1. Перепроверь ШАГ 1
2. Убедись, что таблица создана в **правильной** Supabase БД
3. Проверь `DATABASE_URL` в Render environment variables

---

### **Проблема 2: KOLScan balance = 0 (но токены есть)**

**Логи:**
```
🔍 Checking KOLScan balance for: FzDz...
✅ KOLScan balance result: { balance: 0, hasMinimumHold: false }
```

**Решение:**
1. Проверь `KOLSCAN_TOKEN_ADDRESS` в `.env`:
   ```
   KOLSCAN_TOKEN_ADDRESS=Db8vz7nh1jbjxVBatBRgQWafqB5iDaW7A1VNh6DmraxP
   ```
2. Проверь на Solscan, что wallet действительно держит токены:
   ```
   https://solscan.io/account/FzDzVN9y7PJgRn21gGRtMQVmo9NzS1V2VzWxpRRHMsE4
   ```
3. Проверь `HELIUS_RPC_URL` - должен быть с API key

---

### **Проблема 3: Webhook не срабатывает**

**Логи (в Render):**
```
(нет логов "💰 Payment webhook received")
```

**Решение:**
1. Проверь Helius Webhook Status (должен быть ✅ Active)
2. Проверь Helius Webhook Logs (должны быть successful deliveries)
3. Проверь, что в Helius указан правильный merchant wallet
4. Send Test Event в Helius

---

### **Проблема 4: Payment не матчится с intent**

**Логи:**
```
💰 Payment webhook received: 0.015 SOL
⚠️ No matching payment intent found - saving to pending_payments
```

**Решение:**
1. Проверь, что payment intent создан ПЕРЕД оплатой
2. Проверь amount (должен точно совпадать: `0.015 SOL`)
3. Проверь `from_wallet` (если указан, должен совпадать)
4. Проверь `expires_at` (intent не должен быть expired)

**Fallback работает!** User может активировать вручную:
```javascript
// Bot → Server
POST /api/payment/activate-pending
{
  "userId": 123456789,
  "fromWallet": "FzDz..."
}
```

---

## 📊 **ПРОВЕРКА СТАТУСА:**

### **Supabase:**
```sql
-- Все payment intents
SELECT * FROM payment_intents ORDER BY created_at DESC LIMIT 10;

-- Pending payments
SELECT * FROM pending_payments WHERE status = 'pending';

-- Active subscriptions
SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 10;
```

### **Render Logs:**
```
Dashboard → Logs → Search:
- "Payment webhook"
- "Payment intent"
- "KOLScan balance"
```

---

## ✅ **ЧЕКЛИСТ:**

- [ ] ✅ Таблицы созданы в Supabase
- [ ] ✅ KOLScan balance endpoint работает
- [ ] ✅ Payment intent creation работает
- [ ] ✅ Helius webhook настроен и активен
- [ ] ✅ Test payment успешно прошёл
- [ ] ✅ Subscription активировалась
- [ ] ✅ Discount применился (если есть токены)

---

## 🚀 **ПОСЛЕ ИСПРАВЛЕНИЯ:**

Переходим к **TRAVEL_SESSIONS_PLAN.md**:
1. ✅ Market Cap Tracking
2. ✅ Signals Merge
3. ✅ Referral System
4. ✅ Share to Stories

---

**Поехали чинить! 🔧**

