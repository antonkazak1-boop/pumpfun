# 🚀 Render.com Setup Guide

## 🔍 Проверка текущих Environment Variables

**Зайди на https://dashboard.render.com и проверь:**

### **Обязательные переменные:**

| Variable | Статус | Значение |
|----------|--------|----------|
| `BOT_TOKEN` | ❓ Нужно проверить | `1234567890:ABCdef...` |
| `MINI_APP_URL` | ❓ Нужно проверить | `https://pumpfun-u7av.onrender.com` |
| `DATABASE_URL` | ❓ Нужно проверить | `postgresql://user:pass@host:5432/db` |

---

## 🤖 Настройка Telegram Bot

### **1. Создание бота (если еще нет):**

1. **Открой Telegram**
2. **Найди [@BotFather](https://t.me/BotFather)**
3. **Отправь команды:**
   ```
   /newbot
   ```
4. **Введи имя бота:**
   ```
   Pump Dex Bot
   ```
5. **Введи username (должен заканчиваться на _bot):**
   ```
   pumpdex_bot
   ```
6. **Скопируй токен** который даст BotFather:
   ```
   1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
   ```

### **2. Настройка Mini App:**

1. **Отправь BotFather:**
   ```
   /mybots
   ```
2. **Выбери своего бота**
3. **Выбери "Bot Settings" → "Menu Button"**
4. **Выбери "Edit menu button URL"**
5. **Укажи URL:**
   ```
   https://pumpfun-u7av.onrender.com
   ```

### **3. Настройка команд (опционально):**

1. **Отправь BotFather:**
   ```
   /setcommands
   ```
2. **Выбери своего бота**
3. **Вставь команды:**
   ```
   start - Launch the bot and access Mini App
   about - Learn about Pump Dex Bot
   help - Show help message
   ```

---

## 🔧 Настройка Environment Variables на Render

### **1. Зайди на Render Dashboard:**
- URL: https://dashboard.render.com
- Найди сервис `pumpfun`

### **2. Перейди в Environment:**
- Нажми на свой сервис
- Перейди в раздел "Environment"
- Нажми "Environment Variables"

### **3. Добавь переменные:**

#### **BOT_TOKEN:**
- **Name:** `BOT_TOKEN`
- **Value:** `твой_токен_от_BotFather`
- **Example:** `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`

#### **MINI_APP_URL:**
- **Name:** `MINI_APP_URL`
- **Value:** `https://pumpfun-u7av.onrender.com`

#### **DATABASE_URL (если еще нет):**
- **Name:** `DATABASE_URL`
- **Value:** `postgresql://user:pass@host:5432/db`

### **4. Сохрани изменения:**
- Нажми "Save Changes"
- Render автоматически перезапустит сервис

---

## 📊 Проверка работы

### **1. Проверь логи Render:**
После добавления переменных в логах должно быть:
```
🤖 Starting Telegram Bot...
👤 Бот запущен: @pumpdex_bot (Pump Dex Bot)
🆔 Bot ID: 1234567890
✅ Pump Dex Bot успешно запущен!
```

### **2. Проверь бота в Telegram:**
1. **Найди своего бота** по username
2. **Отправь `/start`**
3. **Должно появиться красивое приветствие** с кнопкой "Launch Mini App"

### **3. Проверь Mini App:**
1. **Нажми кнопку "Launch Mini App"**
2. **Должно открыться твое приложение**
3. **Проверь что все вкладки работают**

---

## 🐛 Troubleshooting

### **Проблема: "BOT_TOKEN не установлен"**
```
❌ Ошибка: BOT_TOKEN не установлен!
```
**Решение:**
- Проверь что добавил `BOT_TOKEN` в Environment Variables
- Убедись что токен правильный (без пробелов)
- Перезапусти сервис на Render

### **Проблема: "MINI_APP_URL не установлен"**
```
❌ Ошибка: MINI_APP_URL не установлен!
```
**Решение:**
- Добавь `MINI_APP_URL` в Environment Variables
- URL должен быть HTTPS
- Убедись что URL правильный

### **Проблема: "401 Unauthorized"**
```
❌ Ошибка при запуске бота: 401 Unauthorized
```
**Решение:**
- Проверь что `BOT_TOKEN` правильный
- Убедись что токен не истек
- Создай новый бот если нужно

### **Проблема: Бот не отвечает**
**Возможные причины:**
1. Бот не запущен (проверь логи)
2. Неправильный токен
3. Проблемы с сетью

**Решение:**
- Проверь логи Render
- Убедись что все Environment Variables установлены
- Перезапусти сервис

---

## 📱 Тестирование

### **1. Тест команд:**
```
/start - должен показать приветствие
/about - должен показать информацию о боте
/help - должен показать справку
```

### **2. Тест Mini App:**
- Кнопка "Launch Mini App" должна работать
- Все вкладки должны загружаться
- API эндпоинты должны отвечать

### **3. Тест API:**
```bash
# Проверь что сервер работает
curl https://pumpfun-u7av.onrender.com/api/health

# Проверь Pump.fun API
curl https://pumpfun-u7av.onrender.com/api/pump/latest?limit=5
```

---

## 🎯 Итоговый чеклист

- [ ] Создан бот через BotFather
- [ ] Получен BOT_TOKEN
- [ ] Настроен Menu Button URL
- [ ] Добавлен BOT_TOKEN в Environment Variables
- [ ] Добавлен MINI_APP_URL в Environment Variables
- [ ] Добавлен DATABASE_URL в Environment Variables
- [ ] Сервис перезапущен на Render
- [ ] Проверены логи (бот запустился)
- [ ] Протестирован бот в Telegram
- [ ] Протестирован Mini App

---

## 🚀 После настройки

**Ты получишь:**
- ✅ Работающий Telegram бот
- ✅ Красивое приветствие в стиле Ray Bot
- ✅ Кнопку для запуска Mini App
- ✅ Все команды (/start, /about, /help)
- ✅ Интеграцию с Pump.fun API
- ✅ Реальные имена токенов

**Готово к использованию!** 🎉
