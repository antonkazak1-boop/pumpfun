# 📱 Руководство по тестированию Pump Dex Mini App

## 🧪 Тестирование системы подписок

### 1. **Тестирование с компьютера (веб-версия)**

#### Проблема с веб-версией:
- ❌ Нет интеграции с Telegram аккаунтом
- ❌ Не показывается плашка статуса подписки в header
- ❌ Нет автоматической авторизации через Telegram

#### Решение:
Для полноценного тестирования нужно использовать **Telegram Mini App** (мобильное приложение)

---

### 2. **Тестирование с телефона (рекомендуется)**

#### Шаг 1: Открыть мини-апп в Telegram
1. Открой Telegram на телефоне
2. Найди своего бота `@your_bot_name`
3. Отправь команду `/start`
4. Нажми на кнопку "Open Mini App" или используй inline кнопку

#### Шаг 2: Проверка триального периода
После первого запуска ты должен увидеть:
- **В header:** `⏰ TRIAL (Xd)` где X - количество дней
- **Все вкладки** должны быть доступны
- **Заблокированные вкладки** (если триал истек) будут:
  - Приглушенными (черно-белые)
  - С иконкой 🔒 в правом верхнем углу
  - С пунктирной красной рамкой

#### Шаг 3: Проверка FREE tier (после окончания триала)
1. Измени в базе данных `created_at` на дату > 5 дней назад:
   ```sql
   UPDATE users 
   SET created_at = NOW() - INTERVAL '6 days' 
   WHERE telegram_user_id = YOUR_ID;
   ```

2. Перезагрузи мини-апп
3. Должен отображаться: `🔒 FREE`
4. Доступны только: About, Dashboard, Analytics, Fresh Tokens, Coins

#### Шаг 4: Проверка PREMIUM tier
1. Оплати подписку через Stars или SOL
2. После успешной оплаты должно появиться: `👑 PRO` или `👑 BASIC`
3. Все вкладки разблокированы

---

### 3. **Тестирование различных сценариев**

#### Сценарий A: Новый пользователь
```
Действие: Первый запуск мини-аппа
Ожидается:
- ✅ TRIAL (5d) в header
- ✅ Все вкладки доступны
- ✅ Нет заблокированных вкладок
```

#### Сценарий B: Триал истек
```
Действие: created_at > 5 дней назад, нет оплат
Ожидается:
- ✅ FREE в header
- ✅ Заблокированы: Smart Money, Cluster Buy, Co-buy, Whale Moves, Volume Surge, Top Gainers, Recent Activity, Trending Meta, Portfolio, Wallet Stats
- ✅ Клик на заблокированную вкладку → Upgrade prompt
```

#### Сценарий C: Активная подписка
```
Действие: Есть активная подписка в БД
Ожидается:
- ✅ PREMIUM в header
- ✅ Все вкладки доступны
- ✅ Нет заблокированных вкладок
```

#### Сценарий D: Истекшая подписка
```
Действие: subscription.expires_at < NOW()
Ожидается:
- ✅ FREE в header (если не было других оплат)
- ✅ Заблокированы premium вкладки
```

---

### 4. **Проверка payments таблицы**

#### Текущая структура записи:
```json
{
  "id": 3,
  "user_id": 60718924,
  "subscription_id": 3,
  "amount_sol": "0.25000000",
  "amount_stars": 2,
  "payment_method": "telegram_stars",
  "transaction_hash": null,
  "status": "confirmed",
  "created_at": "2025-10-07 15:36:39.905444",
  "confirmed_at": null
}
```

#### Проблемы:
1. ✅ `transaction_hash` должен быть заполнен для Telegram Stars
2. ✅ `confirmed_at` должен быть установлен при подтверждении
3. ✅ Если `payment_method` = "telegram_stars", то `amount_sol` должен быть 0

#### SQL для проверки:
```sql
-- Проверить все оплаты пользователя
SELECT * FROM payments WHERE user_id = YOUR_ID ORDER BY created_at DESC;

-- Проверить активные подписки
SELECT s.*, u.username 
FROM subscriptions s
JOIN users u ON s.user_id = u.telegram_user_id
WHERE u.telegram_user_id = YOUR_ID
ORDER BY s.expires_at DESC;

-- Проверить триал статус
SELECT 
    telegram_user_id,
    username,
    created_at,
    AGE(NOW(), created_at) as account_age,
    CASE 
        WHEN AGE(NOW(), created_at) < INTERVAL '5 days' THEN 'TRIAL'
        ELSE 'FREE'
    END as tier
FROM users
WHERE telegram_user_id = YOUR_ID;
```

---

### 5. **Как протестировать с мобильного**

#### Вариант 1: Через ngrok (локальная разработка)
1. Установи ngrok: https://ngrok.com/
2. Запусти сервер: `node server.js`
3. В другом терминале: `ngrok http 3000`
4. Получишь HTTPS URL: `https://abc123.ngrok.io`
5. Обнови Telegram Mini App URL в BotFather
6. Открой бота в Telegram на телефоне

#### Вариант 2: Через Render (production)
1. Твой деплой уже на Render: `https://your-app.onrender.com`
2. Открой бота в Telegram
3. Мини-апп должен открыться автоматически

#### Вариант 3: Через Telegram Web (частично)
1. Открой https://web.telegram.org/
2. Найди бота
3. Открой мини-апп
4. ⚠️ Некоторые фичи могут не работать (камера, haptics)

---

### 6. **Debugging в Telegram Mini App**

#### На Android:
1. Включи USB Debugging на телефоне
2. Подключи к компьютеру
3. Открой `chrome://inspect` в Chrome
4. Найди Telegram WebView
5. Открой DevTools

#### На iOS:
1. Включи Web Inspector в Safari (Настройки → Safari → Advanced)
2. Подключи iPhone к Mac
3. Открой Safari → Develop → [Твой iPhone] → Telegram
4. Выбери Mini App WebView

#### Telegram Desktop (для быстрого тестирования):
1. Открой Telegram Desktop
2. Найди бота
3. Открой мини-апп
4. `Ctrl+Shift+I` (DevTools)
5. Проверь Console на ошибки

---

### 7. **Тестовые SQL команды**

#### Сбросить триал:
```sql
UPDATE users 
SET created_at = NOW() - INTERVAL '6 days'
WHERE telegram_user_id = YOUR_ID;
```

#### Активировать триал:
```sql
UPDATE users 
SET created_at = NOW()
WHERE telegram_user_id = YOUR_ID;
```

#### Дать активную подписку:
```sql
INSERT INTO subscriptions (user_id, subscription_type, status, expires_at, price_sol, price_stars, payment_method)
VALUES (
    YOUR_ID,
    'pro',
    'active',
    NOW() + INTERVAL '30 days',
    0.25,
    250,
    'telegram_stars'
);
```

#### Удалить все подписки:
```sql
DELETE FROM subscriptions WHERE user_id = YOUR_ID;
DELETE FROM payments WHERE user_id = YOUR_ID;
```

---

### 8. **Ожидаемое поведение locked tabs**

#### Визуально заблокированная вкладка должна:
- ✅ Быть приглушенной (opacity 0.4)
- ✅ Быть черно-белой (grayscale фильтр)
- ✅ Иметь 🔒 эмодзи в правом верхнем углу
- ✅ Иметь пунктирную красную рамку
- ✅ Пульсировать иконка замка
- ✅ При hover: opacity увеличивается до 0.6
- ✅ При клике: показывать upgrade prompt

---

### 9. **Checklist для полного тестирования**

#### Подписки:
- [ ] Новый пользователь → TRIAL (5d)
- [ ] Триал истек → FREE
- [ ] Оплата Basic → BASIC в header
- [ ] Оплата Pro → PRO в header
- [ ] Подписка истекла → FREE

#### Доступ к вкладкам:
- [ ] FREE: 5 вкладок доступны
- [ ] TRIAL: все вкладки доступны
- [ ] PREMIUM: все вкладки доступны
- [ ] Locked tabs визуально отличаются
- [ ] Клик на locked tab → upgrade prompt

#### Оплата:
- [ ] Telegram Stars: цена правильная
- [ ] Solana: цена зеленым цветом
- [ ] Payment записывается в БД
- [ ] Subscription создается после оплаты
- [ ] Status обновляется корректно

---

### 10. **Known Issues**

#### Веб-версия:
- ❌ Нет Telegram авторизации
- ❌ Не показывается subscription indicator
- ❌ Можно протестировать только locked tabs через манипуляцию с subscriptionStatus в console

#### Mobile:
- ✅ Все работает корректно
- ✅ Авторизация через Telegram
- ✅ Показывается subscription status
- ✅ Оплата работает

---

**Последнее обновление:** 7 октября 2025  
**Версия:** 1.0 (Lovable Hybrid + Subscriptions)

