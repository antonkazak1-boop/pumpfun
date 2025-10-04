# 🔥 Pump.fun API Integration Guide

## Что сделано

✅ **Telegram Bot** теперь запускается **параллельно** с Mini App сервером  
✅ **Pump.fun API** интегрирован через DexScreener  
✅ **5 новых эндпоинтов** для получения данных о молодых токенах  

---

## 🚀 Как это работает

### 1. Параллельный запуск Bot + Server

Теперь при запуске `npm start` автоматически запускаются:
- 🌐 **Express сервер** (Mini App)
- 🤖 **Telegram Bot** (если `BOT_TOKEN` настроен)

**Логи при запуске:**
```
🚀 Pump Dex Mini App сервер запущен на порту 10000
📱 Mini App доступен по адресу: http://localhost:10000
🤖 Starting Telegram Bot...
✅ Telegram Bot started successfully!
```

### 2. Pump.fun API Endpoints

#### **GET /api/pump/new**
Получить новые токены с Pump.fun

**Параметры:**
- `limit` (optional) - количество токенов (default: 50)

**Пример запроса:**
```bash
curl https://your-app.com/api/pump/new?limit=20
```

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "symbol": "SAMO",
      "name": "Samoyedcoin",
      "priceUsd": "0.0123",
      "priceChange24h": 15.5,
      "volume24h": 123456.78,
      "marketCap": 12345678,
      "liquidity": 234567,
      "createdAt": 1704067200,
      "url": "https://dexscreener.com/solana/..."
    }
  ],
  "count": 20
}
```

---

#### **GET /api/pump/top**
Топ токенов по объему торгов за 24ч

**Параметры:**
- `limit` (optional) - количество токенов (default: 20)

**Пример:**
```bash
curl https://your-app.com/api/pump/top?limit=10
```

---

#### **GET /api/pump/trending**
Trending токены (высокий volume + положительное изменение цены)

**Параметры:**
- `limit` (optional) - количество токенов (default: 15)

**Пример:**
```bash
curl https://your-app.com/api/pump/trending
```

**Логика фильтрации:**
- Volume > $1000
- Price Change 24h > 0%
- Сортировка по `volume × (1 + priceChange/100)`

---

#### **GET /api/pump/token/:address**
Детали конкретного токена

**Параметры:**
- `address` - адрес токена на Solana

**Пример:**
```bash
curl https://your-app.com/api/pump/token/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "symbol": "SAMO",
    "name": "Samoyedcoin",
    "priceUsd": "0.0123",
    "priceChange": {
      "m5": 2.5,
      "h1": 5.3,
      "h6": 12.1,
      "h24": 15.5
    },
    "volume": {
      "m5": 1234,
      "h1": 12345,
      "h6": 56789,
      "h24": 123456
    },
    "txns": {
      "m5": { "buys": 5, "sells": 3 },
      "h1": { "buys": 23, "sells": 15 },
      "h6": { "buys": 67, "sells": 45 },
      "h24": { "buys": 234, "sells": 156 }
    },
    "liquidity": 234567,
    "marketCap": 12345678,
    "url": "https://dexscreener.com/solana/..."
  }
}
```

---

#### **GET /api/pump/stats/:address**
Статистика токена по периодам

**Пример:**
```bash
curl https://your-app.com/api/pump/stats/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "symbol": "SAMO",
    "name": "Samoyedcoin",
    "price": "0.0123",
    "marketCap": 12345678,
    "liquidity": 234567,
    "stats": {
      "5m": {
        "priceChange": 2.5,
        "volume": 1234,
        "buys": 5,
        "sells": 3
      },
      "1h": {
        "priceChange": 5.3,
        "volume": 12345,
        "buys": 23,
        "sells": 15
      },
      "6h": {
        "priceChange": 12.1,
        "volume": 56789,
        "buys": 67,
        "sells": 45
      },
      "24h": {
        "priceChange": 15.5,
        "volume": 123456,
        "buys": 234,
        "sells": 156
      }
    },
    "url": "https://dexscreener.com/solana/..."
  }
}
```

---

## 📊 Использование в Mini App

### Frontend пример (JavaScript)

```javascript
// Получить новые токены
async function loadNewPumpTokens() {
    try {
        const response = await fetch('/api/pump/new?limit=20');
        const result = await response.json();
        
        if (result.success) {
            console.log('New tokens:', result.data);
            renderTokens(result.data);
        }
    } catch (error) {
        console.error('Error loading tokens:', error);
    }
}

// Показать детали токена
async function showTokenDetails(tokenAddress) {
    try {
        const response = await fetch(`/api/pump/token/${tokenAddress}`);
        const result = await response.json();
        
        if (result.success) {
            const token = result.data;
            console.log(`Token: ${token.symbol} - ${token.name}`);
            console.log(`Price: $${token.priceUsd}`);
            console.log(`24h Change: ${token.priceChange.h24}%`);
        }
    } catch (error) {
        console.error('Error loading token details:', error);
    }
}
```

---

## 🔧 Настройка окружения

### Обязательные переменные:

```env
# Telegram Bot Token (от BotFather)
BOT_TOKEN=your_bot_token_here

# URL вашего Mini App
MINI_APP_URL=https://your-app.com

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:5432/db
```

### На Render.com:

1. Перейди в **Environment** → **Environment Variables**
2. Добавь `BOT_TOKEN` если ещё не добавлен
3. Deploy автоматически подхватит изменения

---

## 🎯 Roadmap - что дальше?

### Ближайшие шаги:
1. **Создать новую вкладку "Pump Tokens"** в Mini App
   - Отображение новых токенов с Pump.fun
   - Фильтры по volume, price change, market cap
   - Карточки с деталями токенов

2. **Интегрировать Pump токены в существующие вкладки:**
   - Fresh Tokens - добавить токены с Pump.fun
   - Coins - показать Pump токены отдельной категорией
   - Smart Money - отслеживать покупки Pump токенов трейдерами

3. **Алерты через Telegram Bot:**
   - Уведомления о новых Pump токенах
   - Алерты когда трейдеры покупают Pump токены
   - Настраиваемые фильтры в UI

4. **Расширенная аналитика:**
   - Корреляция Pump токенов с активностью трейдеров
   - История performance Pump токенов
   - Рейтинг успешности токенов

---

## 📝 Технические детали

### Источники данных:

1. **DexScreener API** - основной источник данных о Pump.fun токенах
   - Публичный REST API
   - Данные в реальном времени
   - Поддержка Solana + Pump.fun

2. **Резервные источники** (будущее):
   - Jupiter API (цены)
   - Solana RPC (on-chain данные)
   - Pump.fun напрямую (если появится API)

### Обработка ошибок:

```javascript
// В pumpfunAPI.js
try {
    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
} catch (error) {
    console.error('API Error:', error.message);
    return null; // Graceful fallback
}
```

### Кэширование (TODO):
- Сохранять метаданные токенов в БД (`tokens` table)
- Кэшировать цены для быстрого доступа
- Обновлять данные каждые 5-10 минут

---

## 🐛 Troubleshooting

### Bot не запускается:
```
⚠️ BOT_TOKEN not set - Telegram Bot disabled
```
**Решение:** Добавь `BOT_TOKEN` в environment variables

### API возвращает пустые данные:
```json
{ "success": true, "data": [], "count": 0 }
```
**Возможные причины:**
- DexScreener API недоступен
- Нет новых токенов на Pump.fun
- Слишком строгие фильтры

**Решение:** Проверь логи сервера, попробуй позже

### Timeout errors:
```
❌ Failed to fetch Pump.fun tokens: timeout of 10000ms exceeded
```
**Решение:** Увеличь timeout в `pumpfunAPI.js` или проверь сетевое подключение

---

## 🎉 Готово!

Теперь у тебя:
- ✅ Bot + Server работают параллельно
- ✅ 5 новых API эндпоинтов для Pump.fun
- ✅ Готовая база для интеграции в UI

**Следующий шаг:** Добавить новую вкладку "Pump Tokens" в Mini App! 🚀

