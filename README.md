# Pump Dex Mini App 🚀

Полноценное **Telegram Mini App** для анализа торговли токенами на блокчейне Solana в режиме реального времени.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-green.svg)
![PostgreSQL](https://img.shields.io/badge/postgresql-%3E%3D12.0-blue.svg)

## 📱 Возможности

- **🔥 Cluster Buy** - Отслеживание токенов с групповыми покупками (3+ уникальных покупателей за 10 минут)
- **🐋 Whale Moves** - Крупные покупки свыше 100 SOL за последние 30 минут  
- **📈 Volume Surge** - Резкие всплески торгового объема за 15 минут
- **👥 Co-buy Analysis** - Анализ токенов, покупаемых одновременно за 20 минут
- **🧠 Smart Money** - Отслеживание активности опытных трейдеров за час
- **🌱 Fresh Tokens** - Новые токены с активностью за 5 минут
- **🏆 Top Gainers** - Лидеры по объему торгов за час

## 🏗️ Архитектура

```
pump-dex-mini-app/
├── server.js              # Express сервер с API
├── bot.js                 # Telegram бот
├── package.json           # Зависимости Node.js
├── public/                # Frontend статические файлы
│   ├── index.html         # Главная страница Mini App
│   ├── style.css          # Стили с поддержкой Telegram тем
│   └── script.js          # JavaScript логика
└── README.md              # Данная документация
```

### Технологический стек:
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL
- **Frontend**: Vanilla HTML/CSS/JavaScript + Telegram Web App API
- **Bot**: Telegraf (Telegram Bot Framework)
- **Deployment**: Подходит для Heroku, Vercel, DigitalOcean, AWS

## 📋 Требования

### Системные требования:
- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **PostgreSQL** >= 12.0

### Необходимые аккаунты:
- **Telegram Bot** (создать через [@BotFather](https://t.me/BotFather))
- **HTTPS домен** для Mini App (обязательно для Telegram)
- **PostgreSQL база данных** с таблицей `events`

### Структура таблицы PostgreSQL:

```sql
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    wallet VARCHAR(50) NOT NULL,
    token_mint VARCHAR(50) NOT NULL,
    sol_spent DECIMAL(20, 8) NOT NULL,
    side VARCHAR(10) NOT NULL, -- 'BUY' или 'SELL'
    ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tx_signature VARCHAR(100) UNIQUE
);

-- Создание индексов для оптимизации запросов
CREATE INDEX idx_events_ts ON events(ts);
CREATE INDEX idx_events_token_mint ON events(token_mint);
CREATE INDEX idx_events_wallet ON events(wallet);
CREATE INDEX idx_events_side ON events(side);
CREATE INDEX idx_events_sol_spent ON events(sol_spent);
```

## 🚀 Быстрая установка

### 1. Клонирование и установка зависимостей

```bash
# Клонирование репозитория (или создание папки)
git clone https://github.com/yourusername/pump-dex-mini-app.git
cd pump-dex-mini-app

# Установка зависимостей
npm install
```

### 2. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
# Database Configuration
DB_USER=your_postgresql_user
DB_HOST=your_postgresql_host
DB_NAME=your_database_name
DB_PASSWORD=your_postgresql_password
DB_PORT=5432

# Telegram Bot Configuration
BOT_TOKEN=your_telegram_bot_token
MINI_APP_URL=https://your-domain.com

# Server Configuration
PORT=3000
NODE_ENV=production
```

### 3. Получение Telegram Bot Token

1. Отправьте `/start` боту [@BotFather](https://t.me/BotFather)
2. Создайте нового бота: `/newbot`
3. Выберите имя и username для бота
4. Скопируйте **Bot Token** в файл `.env`

## 💻 Локальная разработка

### Запуск сервера (в режиме разработки):

```bash
# Запуск API сервера с автоперезагрузкой
npm run dev

# Или обычный запуск
npm start
```

Сервер будет доступен на `http://localhost:3000`

### Запуск Telegram бота:

```bash
# В отдельном терминале
npm run bot

# Или с автоперезагрузкой
npm run dev:bot
```

### Тестирование локально:

1. **API эндпоинты**: `http://localhost:3000/api/health`
2. **Mini App интерфейс**: `http://localhost:3000`
3. **Telegram бот**: Напишите `/start` вашему боту

> ⚠️ **Важно**: Для полной работы Telegram Mini App требуется HTTPS. Для локального тестирования используйте ngrok или подобные сервисы.

## 🌐 Развертывание в продакшене

### Вариант 1: Heroku

1. **Создание приложения**:
```bash
heroku create your-app-name
```

2. **Настройка переменных окружения**:
```bash
heroku config:set BOT_TOKEN=your_bot_token
heroku config:set MINI_APP_URL=https://your-app-name.herokuapp.com
heroku config:set DB_HOST=your_db_host
heroku config:set DB_USER=your_db_user
heroku config:set DB_NAME=your_db_name
heroku config:set DB_PASSWORD=your_db_password
```

3. **Развертывание**:
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### Вариант 2: Vercel

1. **Установка Vercel CLI**:
```bash
npm install -g vercel
```

2. **Развертывание**:
```bash
vercel --prod
```

3. **Настройка переменных окружения** в панели Vercel

### Вариант 3: DigitalOcean/VPS

1. **Установка на сервере**:
```bash
# Установка Node.js и npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Клонирование проекта
git clone https://github.com/yourusername/pump-dex-mini-app.git
cd pump-dex-mini-app
npm install
```

2. **Настройка PM2 (опционально)**:
```bash
npm install -g pm2

# Создание ecosystem.config.js
pm2 ecosystem
# Отредактируйте файл для вашего проекта

# Запуск
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

3. **Настройка Nginx** (пример конфигурации):
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔧 Настройка Telegram Mini App

### 1. Регистрация Mini App через BotFather

1. Отправьте `/mybots` боту [@BotFather](https://t.me/BotFather)
2. Выберите вашего бота
3. Выберите "Bot Settings" → "Menu Button"
4. Выберите "Edit menu button URL"
5. Укажите URL вашего развернутого приложения: `https://your-domain.com`

### 2. Обновление конфигурации

После развертывания обновите `MINI_APP_URL` в переменных окружения:

```bash
# Для Heroku
heroku config:set MINI_APP_URL=https://your-app-name.herokuapp.com

# Для локальной разработки с ngrok
# ngrok http 3000
# Обновите MINI_APP_URL в .env
```

## 📊 API Документация

### Эндпоинты:

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/health` | Проверка состояния API и БД |
| GET | `/api/clusterbuy` | Кластерные покупки (10м) |
| GET | `/api/whalemoves` | Движения китов (30м) |
| GET | `/api/volumesurge` | Всплески объема (15м) |
| GET | `/api/cobuy` | Совместные покупки (20м) |
| GET | `/api/smartmoney` | Умные деньги (1ч) |
| GET | `/api/freshtokens` | Новые токены (5м) |
| GET | `/api/topgainers` | Топ по объему (1ч) |
| GET | `/api/token/:mint` | Детали токена (2ч) |

### Пример ответа API:

```json
{
  "success": true,
  "data": [
    {
      "token_mint": "So11111111111111111111111111111111111111112",
      "buyers": 5,
      "total_sol": 245.67
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🎨 Кастомизация

### Изменение временных интервалов:

Отредактируйте SQL запросы в `server.js`:

```javascript
// Например, для изменения интервала Cluster Buy с 10 до 15 минут:
WHERE side = 'BUY'
  AND ts > now() - interval '15 minutes'  // Изменено с '10 minutes'
```

### Настройка темы:

Измените CSS переменные в `public/style.css`:

```css
:root {
    --primary-color: #your-color;
    --success-color: #your-success-color;
    /* и т.д. */
}
```

### Добавление новых эндпоинтов:

1. Добавьте новый эндпоинт в `server.js`
2. Обновите `TAB_API_MAP` в `public/script.js`
3. Создайте функцию рендеринга
4. Добавьте вкладку в `public/index.html`

## 🐛 Устранение неполадок

### Общие проблемы:

**1. "Database connection failed"**
```bash
# Проверьте подключение к БД
psql -h your_host -U your_user -d your_database

# Проверьте переменные окружения
echo $DB_HOST $DB_USER $DB_NAME
```

**2. "BOT_TOKEN not found"**
```bash
# Убедитесь, что токен правильно установлен
echo $BOT_TOKEN

# Проверьте .env файл
cat .env | grep BOT_TOKEN
```

**3. "Mini App not loading in Telegram"**
- Убедитесь, что URL использует HTTPS
- Проверьте, что URL настроен в BotFather
- Убедитесь, что сервер доступен извне

**4. "Empty data in Mini App"**
- Проверьте, есть ли данные в таблице `events`
- Убедитесь, что временные интервалы содержат данные
- Проверьте логи сервера: `heroku logs --tail` или `pm2 logs`

### Логирование:

```bash
# Heroku
heroku logs --tail --app your-app-name

# PM2
pm2 logs

# Docker
docker logs container_name

# Локально
npm run dev  # Логи выводятся в консоль
```

## 📝 TODO / Планы развития

- [ ] Добавление уведомлений Push
- [ ] Интеграция с Webhook для реального времени
- [ ] Система фильтров и настроек пользователя
- [ ] Исторические данные и графики
- [ ] Поддержка множественных блокчейнов
- [ ] API для внешних интеграций
- [ ] Мобильная адаптация улучшения
- [ ] Темная/светлая тема переключатель
- [ ] Кеширование Redis для производительности
- [ ] Модульные тесты и CI/CD

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch: `git checkout -b feature/amazing-feature`
3. Commit изменения: `git commit -m 'Add amazing feature'`
4. Push в branch: `git push origin feature/amazing-feature`
5. Создайте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 👥 Поддержка

- **GitHub Issues**: [Создать issue](https://github.com/yourusername/pump-dex-mini-app/issues)
- **Telegram**: @your_support_username
- **Email**: your.email@example.com

## 🙏 Благодарности

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Express.js](https://expressjs.com/)
- [PostgreSQL](https://postgresql.org/)

---

**Создано с ❤️ для сообщества Solana и DeFi трейдеров**#   p u m p f u n  
 