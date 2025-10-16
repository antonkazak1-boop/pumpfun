# 💰 PAYMENT SYSTEM CHECKLIST

> **Статус:** Таблицы созданы ✅, нужна проверка flow

---

## ✅ **ЧТО УЖЕ РАБОТАЕТ:**

1. **Database Tables:**
   - ✅ `payment_intents` - создана, есть тестовые данные
   - ✅ `pending_payments` - создана, есть тестовые данные
   - ✅ `subscriptions` - уже существует

2. **Backend Endpoints:**
   - ✅ `/api/payment/create-intent` - создаёт intent с user_id
   - ✅ `/api/payment/check-intent/:intentId` - проверка статуса
   - ✅ `/api/payment/activate-pending` - активация по кошельку
   - ✅ `/webhook/payments` - Helius webhook handler
   - ✅ `/api/kolscan/balance/:walletAddress` - проверка баланса токенов

3. **Bot Integration:**
   - ✅ `/subscribe` command
   - ✅ Telegram Stars inline invoice
   - ✅ Solana payment flow (create intent → show address → check)

---

## 🔧 **ЧТО НУЖНО ПРОВЕРИТЬ/НАСТРОИТЬ:**

### **1. Helius Webhook (ГЛАВНОЕ!) - 5 минут**

**Где:** https://dashboard.helius.dev → Webhooks

**Настройки:**
```
✅ Webhook Type: Enhanced Transactions
✅ Webhook URL: https://pumpfun-u7av.onrender.com/webhook/payments
✅ Transaction Types: Native Transfer (SOL)
✅ Account Addresses: G1baEgxW9rFLbPr8M6SmAxEbpeLw5Z5j4xyYwt8emTha
✅ Auth Header (optional): x-webhook-auth: solfun_secret_2024
✅ Status: ACTIVE ✅
```

**Проверка:**
1. Send Test Event
2. Проверь логи Render: должно быть `💰 Payment webhook received`

---

### **2. Тест Payment Intent Creation - 2 минуты**

**Команда:**
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

Должна быть новая запись! ✅

---

### **3. Тест KOLScan Balance - 1 минута**

**URL в браузере:**
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

Если `balance: 0` → токены не найдены (проверь wallet на Solscan)

---

### **4. E2E Тест (в Telegram боте) - 5 минут**

#### **Шаг 1: Создать intent**
```
/subscribe → Pro → Yes (hold tokens) → <enter wallet>
```

**Бот должен ответить:**
```
✅ You qualify for 25% discount!

💳 Send exactly 0.015 SOL to:
G1baEgxW9rFLbPr8M6SmAxEbpeLw5Z5j4xyYwt8emTha

⏰ Payment expires in 30 minutes
```

#### **Шаг 2: Отправить SOL**
- From: `<твой кошелёк>`
- To: `G1baEgxW9rFLbPr8M6SmAxEbpeLw5Z5j4xyYwt8emTha`
- Amount: `0.015 SOL`

#### **Шаг 3: Webhook автоматически активирует**
Через 30-60 секунд должен прийти в логи Render:
```
💰 Payment webhook received: 0.015 SOL
✅ Payment received: 0.015 SOL from <wallet>
🎯 Matched payment intent: intent_xxx
✅ Subscription auto-activated for user 123456789
```

Бот должен отправить:
```
✅ Payment confirmed! Your Pro subscription is now active! 🎉
```

---

## 🐛 **ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ:**

### **Проблема 1: Webhook не срабатывает**

**Проверь:**
1. Helius Webhook Status = ✅ Active
2. Helius Logs (есть ли successful deliveries?)
3. Render Logs (есть ли `💰 Payment webhook received`?)

**Решение:**
- Убедись, что merchant wallet в Helius = `G1baEgxW9rFLbPr8M6SmAxEbpeLw5Z5j4xyYwt8emTha`
- Send Test Event в Helius

---

### **Проблема 2: Intent не записывается в БД**

**Логи:**
```
❌ Database error: relation "payment_intents" does not exist
```

**Решение:**
Выполни в Supabase SQL Editor:
```sql
-- Из SUPABASE_SETUP.sql
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
```

---

### **Проблема 3: KOLScan balance = 0**

**Проверь:**
1. Token address правильный:
   ```
   KOLSCAN_TOKEN_ADDRESS=Db8vz7nh1jbjxVBatBRgQWafqB5iDaW7A1VNh6DmraxP
   ```
2. Wallet действительно держит токены (Solscan):
   ```
   https://solscan.io/account/<wallet>
   ```

---

### **Проблема 4: Payment не матчится с intent**

**Логи:**
```
⚠️ No matching payment intent found
```

**Причины:**
- Intent создан ПОСЛЕ оплаты (нужно создавать ДО)
- Amount не совпадает (0.015 vs 0.02)
- fromWallet не совпадает
- Intent expired (>30 минут)

**Решение:**
Fallback уже работает! Payment сохраняется в `pending_payments`.
User может активировать вручную через `/activate` + wallet address.

---

## 📊 **МОНИТОРИНГ:**

### **Render Logs:**
```
Dashboard → Logs → Search:
- "Payment webhook"
- "Payment intent"
- "KOLScan balance"
- "Subscription auto-activated"
```

### **Supabase Queries:**
```sql
-- All payment intents
SELECT * FROM payment_intents 
ORDER BY created_at DESC LIMIT 10;

-- Pending payments
SELECT * FROM pending_payments 
WHERE status = 'pending';

-- Active subscriptions
SELECT * FROM subscriptions 
ORDER BY created_at DESC LIMIT 10;
```

---

## ✅ **ГОТОВО К РАБОТЕ КОГДА:**

- [ ] ✅ Helius webhook настроен и ACTIVE
- [ ] ✅ Test Event успешно принят
- [ ] ✅ Payment intent создаётся и пишется в БД
- [ ] ✅ KOLScan balance check возвращает корректные данные
- [ ] ✅ E2E тест прошёл: payment → webhook → subscription activated

---

## 🚀 **ПОСЛЕ ПРОВЕРКИ:**

Если ВСЁ работает → переходим к Referral System! 🎁

Если есть проблемы → пиши, разберёмся! 💪

