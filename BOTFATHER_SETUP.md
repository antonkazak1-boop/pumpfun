# 🤖 BotFather Setup Guide - Sol Fun

## 📋 **Настройка Mini App через @BotFather**

### **1. Создать Mini App**

Отправь @BotFather команду:
```
/newapp
```

**Параметры:**
- **Bot**: @your_bot
- **Title**: Sol Fun
- **Short Name**: solfun (для ссылки t.me/your_bot/solfun)
- **Description**: Track smart money on Solana. Real-time analytics for traders, tokens, and market signals.
- **Photo/GIF**: Upload screenshot или demo видео (до 10MB)
- **Web App URL**: https://pump-dex-mini-app.onrender.com
- **Short Description**: Smart Money Analytics for Solana

### **2. Настроить Menu Button**

```
/setmenubutton
```

**Параметры:**
- **Bot**: @your_bot
- **Button Type**: `web_app`
- **Button Text**: 🚀 Open Sol Fun
- **Web App URL**: https://pump-dex-mini-app.onrender.com

### **3. Установить Commands**

```
/setcommands
```

**Команды:**
```
start - 🚀 Launch Sol Fun Mini App
subscribe - 💎 View subscription plans & pricing
help - ❓ Get help and support
about - ℹ️ About Sol Fun - Smart Money tracker
```

### **4. Настроить Bot Info**

#### **Description** (что бот умеет)
```
/setdescription
```

```
🚀 Sol Fun - Smart Money Analytics for Solana

Track 300+ professional traders in real-time:
📊 Fresh Tokens - Discover new opportunities
🔥 Live Signals - Cluster buys, volume surges, whale moves
💰 Most Bought - Top tokens by smart money
🧠 Smart Money - Follow the best traders
📈 Coin Market - Full token analytics

Get insights before the pumps! 🚀
```

#### **About Text** (краткое описание)
```
/setabouttext
```

```
Smart Money Analytics for Solana. Track 300+ traders, discover fresh tokens, and get real-time signals. Follow the money! 💰📈
```

#### **Profile Picture**
```
/setuserpic
```

Upload файл `public/icons/icon-512x512.png` (нужно создать из SVG)

#### **Profile Video** (optional)
Через профиль бота → Edit Bot → Set Profile Video

### **5. Настроить Inline Mode** (optional)

```
/setinline
```

Enable inline mode для быстрого доступа из любого чата

### **6. Настроить Settings**

```
/setjoingroups
```
**Выбрать**: Enable (бот может быть добавлен в группы)

```
/setprivacy
```
**Выбрать**: Disabled (бот получает все сообщения в группах)

---

## 🏠 **Home Screen Shortcuts**

После настройки пользователи смогут:

1. Открыть Mini App через Menu Button (кнопка меню рядом с полем ввода)
2. Открыть через команду `/start`
3. Открыть через инлайн: `@your_bot` в любом чате
4. **Добавить на домашний экран**: 
   - Открыть Mini App
   - Нажать троеточие (⋮) в правом верхнем углу
   - Выбрать "Add to Home Screen"
   - Иконка Sol Fun появится на домашнем экране!

---

## 📱 **Fullscreen Mode**

В Mini App есть кнопка fullscreen (📱):
- **Expand icon** - войти в полноэкранный режим
- **Compress icon** - выйти из полноэкранного режима

Работает на Telegram 8.0+ (iOS/Android/Desktop)

---

## 🔗 **Полезные ссылки:**

- **Mini App URL**: https://pump-dex-mini-app.onrender.com
- **Bot Link**: t.me/your_bot
- **Direct Mini App**: t.me/your_bot/solfun
- **Start with referral**: t.me/your_bot?start=ref_123

---

## ✅ **Checklist:**

- [ ] Mini App создан через `/newapp`
- [ ] Menu Button настроен (`web_app` тип)
- [ ] Commands установлены
- [ ] Description и About Text заполнены
- [ ] Profile picture загружен
- [ ] Inline mode включен (optional)
- [ ] Настройки groups/privacy установлены
- [ ] Протестирован Home Screen Shortcut

---

## 🆘 **Troubleshooting:**

### Mini App не открывается:
- Проверь Web App URL (должен быть HTTPS)
- Проверь что сервер отвечает на запросы
- Проверь CORS настройки сервера

### Fullscreen не работает:
- Обнови Telegram до версии 8.0+
- Проверь что `window.Telegram.WebApp.requestFullscreen` доступен
- Проверь в логах консоли

### Home Screen Shortcut не появляется:
- Функция доступна только в Telegram 9.6+ (апрель 2023)
- На iOS может требоваться разрешение
- На Android проверь версию Telegram

---

**Документация Telegram:**
- [Bot Features](https://core.telegram.org/bots/features)
- [Mini Apps](https://core.telegram.org/bots/webapps)
- [Home Screen Shortcuts](https://core.telegram.org/bots/features#home-screen-shortcuts)

