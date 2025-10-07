# 📡 API Documentation - Pump Dex Mini App

> **Для AI/Cursor**: Это актуальная документация всех API эндпоинтов проекта. Используй её для понимания структуры и внесения изменений.

## 🔧 Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://your-app.onrender.com`

---

## 📊 Analytics Endpoints

### GET `/api/health`
Проверка работоспособности API и подключения к БД

**Response:**
```json
{
  "success": true,
  "database": "connected",
  "timestamp": "2025-10-07T12:00:00.000Z"
}
```

---

### GET `/api/clusterbuy`
Получить токены с кластерными покупками (3+ покупателя за 10 минут)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "token": "abc...",
      "symbol": "TOKEN",
      "name": "Token Name",
      "image": "https://...",
      "unique_buyers": 5,
      "total_buys": 12,
      "total_volume_sol": 45.5,
      "first_buy": "2025-10-07T12:00:00.000Z",
      "last_buy": "2025-10-07T12:09:00.000Z"
    }
  ]
}
```

---

### GET `/api/whalemoves`
Большие покупки (>10 SOL) за последние 2 часа

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "wallet": "xyz...",
      "wallet_name": "Trader Name",
      "token": "abc...",
      "token_symbol": "TOKEN",
      "token_name": "Token Name",
      "image": "https://...",
      "sol_spent": 25.5,
      "created_at": "2025-10-07T12:00:00.000Z"
    }
  ]
}
```

---

### GET `/api/volumesurge`
Токены с резким ростом объема (>100 SOL за 2 часа)

**Query params:**
- `timeframe` (optional): `2h`, `6h`, `24h` (default: `2h`)
- `minVolume` (optional): minimum SOL volume (default: `100`)

---

### GET `/api/cobuy`
Токены купленные несколькими кошельками одновременно

---

### GET `/api/smartmoney`
Активность успешных трейдеров за последний час

---

### GET `/api/freshtokens`
Новые токены за последние 5 минут

---

### GET `/api/topgainers`
Топ растущие токены за 24 часа

---

### GET `/api/coins/market`
Список токенов с фильтрацией

**Query params:**
- `cap`: `low`, `mid`, `high` (market cap filter)
- `period`: `1h`, `6h`, `24h`, `7d` (time period)
- `sort`: `market_cap`, `volume`, `price_change` (sorting)
- `limit`: number of results (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "address": "abc...",
      "symbol": "TOKEN",
      "name": "Token Name",
      "image": "https://...",
      "market_cap": 123456.78,
      "price": 0.00123,
      "volume_24h": 50000,
      "price_change_24h": 25.5
    }
  ]
}
```

---

### GET `/api/pump/trending-meta`
Trending слова и связанные токены

---

### GET `/api/recent-activity`
Последние транзакции (live feed)

---

## 💳 Subscription Endpoints

### GET `/api/subscription/tiers`
Получить все доступные тарифы

**Response:**
```json
{
  "success": true,
  "tiers": [
    {
      "tier_name": "basic",
      "price_sol": 0.1,
      "price_stars": 100,
      "duration_days": 30,
      "features": ["All tabs", "50 notifications/day"]
    }
  ]
}
```

---

### GET `/api/subscription/status/:userId`
Статус подписки пользователя

**Params:**
- `userId` - Telegram user ID

**Response:**
```json
{
  "success": true,
  "user": {
    "telegram_user_id": 12345,
    "username": "user",
    "created_at": "2025-10-01T00:00:00.000Z"
  },
  "hasActiveSubscription": true,
  "activeSubscription": {
    "subscription_type": "pro",
    "expires_at": "2025-11-01T00:00:00.000Z"
  },
  "isTrial": false,
  "trialDaysRemaining": 0
}
```

---

### POST `/api/subscription/check-access`
Проверить доступ к функции

**Body:**
```json
{
  "userId": 12345,
  "feature": "smartMoney"
}
```

**Response:**
```json
{
  "success": true,
  "hasAccess": true,
  "tier": "pro"
}
```

---

## 💰 Payment Endpoints

### POST `/api/payment/telegram-stars`
Создать платеж через Telegram Stars

**Body:**
```json
{
  "userId": 12345,
  "subscriptionType": "pro"
}
```

**Response:**
```json
{
  "success": true,
  "invoice_url": "https://t.me/$your_bot?start=invoice_abc123"
}
```

---

### POST `/api/payment/solana`
Создать Solana payment transaction

**Body:**
```json
{
  "userId": 12345,
  "subscriptionType": "basic",
  "walletAddress": "xyz..."
}
```

---

### POST `/api/payment/verify-solana`
Подтвердить Solana транзакцию

**Body:**
```json
{
  "signature": "abc123...",
  "expectedAmount": 0.1,
  "userId": 12345,
  "subscriptionType": "basic"
}
```

---

## 👤 User Endpoints

### POST `/api/user/update`
Обновить данные пользователя из Telegram

**Body:**
```json
{
  "userId": 12345,
  "username": "trader",
  "first_name": "John",
  "last_name": "Doe"
}
```

---

## 🪙 KOLScan Endpoints

### GET `/api/kolscan/balance/:walletAddress`
Проверить баланс $KOLScan токена

**Response:**
```json
{
  "success": true,
  "balance": 5000,
  "hasDiscount": true
}
```

---

## 🔐 Access Rules

### Free Tier
- **Allowed tabs**: `about`, `dashboard`, `analytics`, `freshTokens`, `coins`
- **Max tokens**: 10 per tab
- **Refresh**: 60 seconds

### Trial Tier (5 days)
- **Allowed tabs**: ALL
- **Max tokens**: 50 per tab
- **Refresh**: 30 seconds

### Basic Tier
- **Allowed tabs**: Most tabs (except walletStats, trendingMeta)
- **Max tokens**: 100 per tab
- **Refresh**: 30 seconds

### Pro Tier
- **Allowed tabs**: ALL
- **Max tokens**: Unlimited
- **Refresh**: 15 seconds

---

## 🚨 Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | No valid user session |
| 403 | Forbidden | No access to this feature |
| 404 | Not Found | Endpoint doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## 📝 Response Format

### Success:
```json
{
  "success": true,
  "data": [...],
  "metadata": {
    "total": 100,
    "page": 1,
    "limit": 50
  }
}
```

### Error:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## 🔄 Webhook Events (для AI понимания)

### Telegram Bot Webhooks:
- `successful_payment` - когда пользователь оплатил Stars
- `pre_checkout_query` - перед оплатой

### Обработка:
```javascript
// bot.js
bot.on('successful_payment', handleSuccessfulPayment);
bot.on('pre_checkout_query', handlePreCheckout);
```

---

## 🛠️ Development Notes

### База данных:
- **Host**: Supabase PostgreSQL
- **Tables**: `users`, `subscriptions`, `payments`, `tokens`, `events`, `subscription_tiers`

### Основные зависимости:
- `express` - REST API
- `pg` - PostgreSQL client
- `telegraf` - Telegram Bot
- `axios` - HTTP requests

### Environment Variables (нужны):
```bash
BOT_TOKEN=...
DATABASE_URL=...
HELIUS_API_KEY=...
```

---

**Last Updated:** 2025-10-07  
**Version:** 1.0 (Lovable Hybrid + Subscriptions)

