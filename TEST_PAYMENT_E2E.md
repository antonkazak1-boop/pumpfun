# 🧪 E2E ТЕСТ SOLANA PAYMENT

> **Пошаговое тестирование** полного payment flow

---

## ✅ **PRE-REQUISITES (УЖЕ ГОТОВО):**

- ✅ `payment_intents` table создана
- ✅ `pending_payments` table создана
- ✅ Helius webhook настроен на `G1baEgxW9rFLbPr8M6SmAxEbpeLw5Z5j4xyYwt8emTha`
- ✅ Events таблица пишется (market cap работает!)
- ✅ KOLScan balance check работает
- ✅ Discount применяется правильно

---

## 🎯 **ТЕСТ 1: Payment БЕЗ Скидки**

### **Шаг 1: Открой бота**
```
@solfun_bot → /subscribe
```

### **Шаг 2: Выбери tier**
```
💎 BASIC
```

### **Шаг 3: Выбери payment method**
```
☀️ Pay with SOL (0.01 SOL)
```

### **Шаг 4: Скидка?**
```
Do you hold KOLScan tokens? → Skip (no discount)
```

**Ожидаемый результат:**
```
💎 Solana Payment Instructions

BASIC Subscription
**0.01 SOL**

📍 Send exactly 0.01 SOL to:
G1baEgxW9rFLbPr8M6SmAxEbpeLw5Z5j4xyYwt8emTha

[✅ Check Payment Status]
[🔙 Back to Plans]
```

### **Шаг 5: Проверь логи Render**
Должно быть:
```
📝 Creating payment intent: { userId: 123456789, subscriptionType: 'basic', ... }
✅ Payment intent created: intent_123456789_xxx for 0.01 SOL
```

### **Шаг 6: Проверь Supabase**
```sql
SELECT * FROM payment_intents 
WHERE telegram_user_id = 123456789 
ORDER BY created_at DESC LIMIT 1;
```

Должно быть:
```
intent_id: intent_123456789_xxx
expected_amount_sol: 0.01
status: pending
expires_at: +30 minutes
```

✅ **PAYMENT INTENT СОЗДАН!**

---

## 🎯 **ТЕСТ 2: Payment СО Скидкой**

### **Шаг 1-3:** Те же (но выбери **PRO**)

### **Шаг 4: Введи wallet с токенами**
```
Do you hold KOLScan tokens? → Yes
Send wallet: FzDzVN9y7PJgRn21gGRtMQVmo9NzS1V2VzWxpRRHMsE4
```

**Ожидаемый результат:**
```
⏳ Checking KOLScan balance...

🎉 Discount applied! You hold 5000 $KOLScan tokens.
Your price: 0.015 SOL (25% off!)

💎 Solana Payment Instructions
PRO Subscription
~~0.02 SOL~~ → **0.015 SOL** (25% discount!)

📍 Send exactly 0.015 SOL to:
G1baEgxW9rFLbPr8M6SmAxEbpeLw5Z5j4xyYwt8emTha
```

### **Шаг 5: Проверь логи Render**
```
🔍 Checking KOLScan balance for: FzDz...
✅ KOLScan balance result: { balance: 5000, hasMinimumHold: true }
📝 Creating payment intent: { userId: xxx, expectedAmount: 0.015, ... }
✅ Payment intent created: intent_xxx for 0.015 SOL
```

### **Шаг 6: Проверь Supabase**
```sql
SELECT * FROM payment_intents ORDER BY created_at DESC LIMIT 1;
```

Должно быть:
```
expected_amount_sol: 0.015  ← СО СКИДКОЙ!
from_wallet: FzDz...        ← УКАЗАН!
```

✅ **DISCOUNT ПРИМЕНЁН!**

---

## 🎯 **ТЕСТ 3: Отправка SOL + Webhook**

### **Шаг 1: Отправь SOL**
Используй Phantom wallet:
```
From: FzDzVN9y7PJgRn21gGRtMQVmo9NzS1V2VzWxpRRHMsE4
To: G1baEgxW9rFLbPr8M6SmAxEbpeLw5Z5j4xyYwt8emTha
Amount: 0.015 SOL (ТОЧНО!)
```

### **Шаг 2: Жди 30-60 секунд**
Blockchain confirmation...

### **Шаг 3: Helius webhook должен сработать!**

**Логи Render (автоматически):**
```
💰 Payment webhook received: { ... }
✅ Payment received: 0.015 SOL from FzDz...
📝 TX: 3SbibsxUoAvb2aT5...
🎯 Matched payment intent: intent_123456789_xxx
✅ Subscription auto-activated for user 123456789
```

### **Шаг 4: Проверь Supabase**
```sql
-- Payment intent обновлён
SELECT * FROM payment_intents 
WHERE intent_id = 'intent_xxx';

-- Должно быть:
status: paid              ← ОБНОВЛЕНО!
paid_at: 2025-10-16 ...   ← ЗАПОЛНЕНО!
tx_signature: 3Sbibsx... ← ЗАПОЛНЕНО!

-- Subscription создана
SELECT * FROM subscriptions 
WHERE telegram_user_id = 123456789
ORDER BY created_at DESC LIMIT 1;

-- Должно быть:
subscription_type: pro
payment_method: solana
transaction_id: 3Sbibsx...
is_active: true
```

✅ **SUBSCRIPTION АКТИВИРОВАНА!**

---

## 🎯 **ТЕСТ 4: Check Payment Button**

### **Шаг 1: В боте нажми**
```
[✅ Check Payment Status]
```

### **Шаг 2: Bot проверяет intent**

**Логи Render:**
```
📝 Checking payment intent: intent_xxx
✅ Intent status: paid
```

**Bot отправляет:**
```
✅ Payment Confirmed!

Your PRO subscription is now active!

💰 Transaction: 3Sbibsx...
🎉 Welcome to Premium!
• Access all tabs
• Unlimited notifications
• Priority support
• 30 days access

[🚀 Launch Sol Fun]
```

✅ **ПОЛНЫЙ FLOW РАБОТАЕТ!**

---

## 🚨 **ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ:**

### **Проблема 1: Intent не создаётся**

**Логи:**
```
❌ Database error: relation "payment_intents" does not exist
```

**Решение:**
Выполни в Supabase (из `SUPABASE_SETUP.sql`):
```sql
CREATE TABLE IF NOT EXISTS payment_intents (...);
```

---

### **Проблема 2: Webhook не срабатывает**

**Симптомы:**
- SOL отправлен
- В логах НЕТ `💰 Payment webhook received`

**Решение:**
1. Проверь Helius Dashboard → Webhooks → Status = ✅ Active
2. Проверь Helius Logs (есть ли successful deliveries?)
3. Send Test Event в Helius
4. Проверь merchant wallet в webhook config

---

### **Проблема 3: Payment не матчится**

**Логи:**
```
⚠️ No matching payment intent found
```

**Причины:**
- Amount не совпадает (0.015 vs 0.02)
- fromWallet не совпадает
- Intent expired (>30 минут)

**Решение:**
Fallback работает! Payment сохраняется в `pending_payments`.

---

### **Проблема 4: Subscription не активируется**

**Логи:**
```
🎯 Matched payment intent: intent_xxx
❌ Subscription system not available
```

**Решение:**
Проверь что `subscriptionSystem` initialized в server.js.

---

## 📊 **МОНИТОРИНГ:**

### **Render Logs (Real-time):**
```
Dashboard → Logs → Live Logs

Ищи:
- "Creating payment intent"
- "Payment webhook received"
- "Matched payment intent"
- "Subscription auto-activated"
```

### **Supabase Queries:**
```sql
-- Recent intents
SELECT * FROM payment_intents 
ORDER BY created_at DESC LIMIT 5;

-- Paid intents
SELECT * FROM payment_intents 
WHERE status = 'paid' 
ORDER BY paid_at DESC LIMIT 5;

-- Pending payments (fallback)
SELECT * FROM pending_payments 
WHERE status = 'pending';

-- Active subscriptions
SELECT * FROM subscriptions 
WHERE is_active = true
ORDER BY created_at DESC LIMIT 10;
```

---

## ✅ **SUCCESS CRITERIA:**

После успешного теста должно быть:

- ✅ Payment intent создан в БД
- ✅ Webhook получил событие
- ✅ Intent matched по amount + wallet
- ✅ Intent status = 'paid'
- ✅ Subscription created в БД
- ✅ User получил confirmation в боте
- ✅ Mini App показывает "Pro" tier

---

## 🚀 **NEXT STEPS AFTER SUCCESS:**

1. ✅ Referral System
2. ✅ Share to Stories  
3. ✅ Token Search
4. ✅ Final Testing
5. 🚀 **LAUNCH!**

---

**Начинай тестирование! Пиши результаты каждого шага! 💪**

