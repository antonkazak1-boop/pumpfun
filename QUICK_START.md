# 🚀 Quick Start Guide

Этот документ поможет вам быстро развернуть Pump Dex Mini App за несколько минут.

## ⚡ Быстрая установка (5 минут)

### 1. Установка зависимостей
```bash
npm install
```

### 2. Настройка базы данных
```sql
-- Выполните в PostgreSQL:
CREATE DATABASE pump_dex_db;

\c pump_dex_db;

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    wallet VARCHAR(50) NOT NULL,
    token_mint VARCHAR(50) NOT NULL,
    sol_spent DECIMAL(20, 8) NOT NULL,
    side VARCHAR(10) NOT NULL,
    ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tx_signature VARCHAR(100) UNIQUE
);

-- Создание индексов
CREATE INDEX idx_events_ts ON events(ts);
CREATE INDEX idx_events_token_mint ON events(token_mint);
CREATE INDEX idx_events_wallet ON events(wallet);
CREATE INDEX idx_events_side ON events(side);
```

### 3. Создание Telegram бота
1. Откройте Telegram → [@BotFather](https://t.me/BotFather)
2. `/newbot` → введите имя и username
3. Скопируйте токен

### 4. Настройка окружения
```bash
# Скопируйте пример конфигурации
cp .env.example .env

# Отредактируйте .env файл своими значениями:
# - DB_* параметры для PostgreSQL
# - BOT_TOKEN из BotFather
# - MINI_APP_URL (для локальной разработки можно временно указать http://localhost:3000)
```

### 5. Добавление тестовых данных (опционально)
```sql
-- Вставьте несколько тестовых записей для проверки
INSERT INTO events (wallet, token_mint, sol_spent, side, ts) VALUES
('ABC123...DEF456', 'TOKEN123...456', 150.50, 'BUY', NOW() - INTERVAL '5 minutes'),
('GHI789...JKL012', 'TOKEN123...456', 200.25, 'BUY', NOW() - INTERVAL '3 minutes'),
('MNO345...PQR678', 'TOKEN123...456', 75.75, 'BUY', NOW() - INTERVAL '2 minutes'),
('STU901...VWX234', 'TOKEN789...012', 500.00, 'BUY', NOW() - INTERVAL '8 minutes');
```

### 6. Запуск приложения
```bash
# Терминал 1: Запуск API сервера
npm run dev

# Терминал 2: Запуск Telegram бота
npm run bot
```

### 7. Тестирование
1. **API**: Откройте `http://localhost:3000/api/health`
2. **Mini App**: Откройте `http://localhost:3000` 
3. **Telegram Bot**: Напишите `/start` вашему боту

## 🌐 Быстрое развертывание в продакшене

### Heroku (рекомендовано для новичков):
```bash
# 1. Установка Heroku CLI
# Скачайте с https://devcenter.heroku.com/articles/heroku-cli

# 2. Вход и создание приложения
heroku login
heroku create your-app-name

# 3. Настройка PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# 4. Настройка переменных
heroku config:set BOT_TOKEN=your_bot_token
heroku config:set MINI_APP_URL=https://your-app-name.herokuapp.com

# 5. Развертывание
git init
git add .
git commit -m "Initial commit"
heroku git:remote -a your-app-name
git push heroku main

# 6. Создание таблицы
heroku pg:psql
# Выполните SQL из шага 2
```

### Vercel (для статики + serverless):
```bash
npm install -g vercel
vercel --prod
# Следуйте инструкциям в интерфейсе
```

## ❗ Важные моменты

1. **HTTPS обязательно** для Telegram Mini App в продакшене
2. **Настройте Menu Button** в BotFather после развертывания:
   - `/mybots` → выберите бота → Bot Settings → Menu Button → укажите URL
3. **Проверьте подключение к БД** перед запуском
4. **Добавьте данные в таблицу** для тестирования функций

## 🐛 Если что-то не работает

**Сервер не запускается:**
```bash
# Проверьте порт
netstat -an | grep 3000

# Проверьте переменные окружения
cat .env
```

**БД не подключается:**
```bash
# Проверьте подключение
psql -h localhost -U postgres -d pump_dex_db

# Проверьте существование таблицы
\dt
```

**Бот не отвечает:**
```bash
# Проверьте токен
curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe
```

**Mini App не открывается в Telegram:**
- Убедитесь, что используете HTTPS URL
- Проверьте настройки Menu Button в BotFather
- Убедитесь, что сервер доступен извне

## 📞 Поддержка

- **Проблемы с кодом**: GitHub Issues
- **Общие вопросы**: README.md
- **Telegram**: @your_support_username

---

🎉 **Готово!** Теперь у вас работает полноценный Telegram Mini App для анализа торговли на Solana!