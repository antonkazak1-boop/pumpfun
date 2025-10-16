# 🔐 SUBSCRIPTION ACCESS MATRIX

> **Краткая справка** - Что доступно на каждом уровне подписки

---

## 📊 **УРОВНИ ПОДПИСКИ:**

### **🆓 TRIAL (Free)**
**Цена:** Бесплатно (5 дней)

**Доступ:**
- ✅ About / Dashboard / Analytics
- ✅ Fresh Tokens
- ✅ Trending Meta
- ✅ Coin Market
- ❌ **Live Signals** (LOCKED)
- ❌ **Smart Money** (LOCKED)
- ❌ **Most Bought** (LOCKED)

**Описание:** Базовый просмотр новых токенов и трендов

---

### **💎 BASIC**
**Цена:** 0.01 SOL (~1 ⭐) 
**База данных:** `subscription_tiers.price_sol` / `price_stars`

**Доступ:**
- ✅ Всё из Trial
- ✅ **Live Signals** (Cluster Buy + Volume Surge)
- ✅ Smart Money (ограниченный доступ)
- ✅ Most Bought
- ❌ Whale Moves (Pro only)
- ❌ Co-Buy signals (Pro only)

**Описание:** Основные сигналы для трейдинга

---

### **🚀 PRO**
**Цена:** 0.02 SOL (~2 ⭐)
**База данных:** `subscription_tiers.price_sol` / `price_stars`

**Доступ:**
- ✅ **ВСЁ БЕЗ ОГРАНИЧЕНИЙ!**
- ✅ Live Signals: ALL (Cluster + Volume + Whale + Co-Buy)
- ✅ Smart Money (полный доступ)
- ✅ Early access к новым фичам
- ✅ Advanced analytics

**Описание:** Максимальный набор инструментов

---

## 🔥 **LIVE SIGNALS - Детально:**

| Signal Type | Trial | Basic | Pro |
|------------|-------|-------|-----|
| **Cluster Buy** | ❌ | ✅ | ✅ |
| **Volume Surge** | ❌ | ✅ | ✅ |
| **Whale Moves** | ❌ | ❌ | ✅ |
| **Co-Buy** | ❌ | ❌ | ✅ |

### **Логика:**
```javascript
// Trial/Free → LOCKED (показываем upgrade prompt)
if (userTier === 'trial' || userTier === 'free') {
    return showUpgradePrompt();
}

// Basic → Cluster + Volume
if (userTier === 'basic') {
    availableSignals = ['cluster', 'volume'];
}

// Pro → ВСЁ
if (userTier === 'pro') {
    availableSignals = ['cluster', 'volume', 'whale', 'cobuy'];
}
```

---

## 💰 **ЦЕНЫ - Единый Источник:**

### **До (ПЛОХО):**
```javascript
// bot.js
const SUBSCRIPTION_PRICES = {
    basic: { sol: 0.01, stars: 1 }
};

// server.js
const prices = { basic: 0.01, pro: 0.02 };
```
❌ Цены в 2 местах → легко забыть обновить!

### **После (ХОРОШО):**
```sql
-- subscription_tiers table - ЕДИНСТВЕННЫЙ источник правды!
SELECT tier_name, price_sol, price_stars FROM subscription_tiers;

-- basic: 0.01 SOL, 1 Star
-- pro: 0.02 SOL, 2 Stars
```

```javascript
// bot.js - загружает prices ON STARTUP
async function loadSubscriptionPrices() {
    const response = await fetch('/api/subscription/tiers');
    // Update SUBSCRIPTION_PRICES from DB
}

// server.js - использует таблицу напрямую
const tiers = await subscriptionSystem.getAllSubscriptionTiers();
```

✅ **Одно место для обновления цен!**

---

## 🎯 **СКИДКИ:**

### **KOLScan Holder Discount:**
- **Условие:** Держишь ≥1000 токенов KOLScan
- **Скидка:** 25% на любой tier
- **Пример:** Pro: ~~0.02 SOL~~ → **0.015 SOL**

### **Реализация:**
```javascript
// 1. User вводит wallet
// 2. Check balance: /api/kolscan/balance/{wallet}
// 3. If balance >= 1000:
const discountedPrice = price * 0.75;
// 4. Create intent с finalPrice
await createPaymentIntent({ expectedAmount: discountedPrice });
```

---

## 🔍 **ПРОВЕРКА ПОДПИСКИ:**

### **В Mini App (Frontend):**
```javascript
const userTier = await getUserSubscriptionTier();
// Returns: 'trial', 'basic', 'pro'

// Check access
if (userTier === 'trial') {
    showUpgradePrompt();
} else {
    loadData();
}
```

### **В API (Backend):**
```javascript
// GET /api/user/subscription/:userId
{
    tier: 'pro',
    expires_at: '2025-11-15',
    is_active: true
}
```

---

## 📝 **ВАЖНО ДЛЯ ЗАПУСКА:**

1. **Проверь цены в БД:**
   ```sql
   SELECT * FROM subscription_tiers;
   ```
   
2. **Обнови цены если нужно:**
   ```sql
   UPDATE subscription_tiers 
   SET price_sol = 0.1, price_stars = 100 
   WHERE tier_name = 'basic';
   
   UPDATE subscription_tiers 
   SET price_sol = 0.25, price_stars = 250 
   WHERE tier_name = 'pro';
   ```

3. **Перезапусти бота** чтобы загрузились новые цены!

---

## ✅ **ЧЕКЛИСТ ПЕРЕД ЗАПУСКОМ:**

- [ ] Цены в `subscription_tiers` правильные
- [ ] Bot загружает prices on startup (логи: `✅ Subscription prices loaded`)
- [ ] Trial users видят LOCKED для Live Signals
- [ ] Basic users видят только Cluster + Volume
- [ ] Pro users видят ВСЕ 4 сигнала
- [ ] Discount работает (25% с KOLScan)
- [ ] Payment intent создаётся с правильной ценой

---

**Last Updated:** October 16, 2025  
**Author:** Sol Fun Team

