# 📝 Changelog - Pump Dex Mini App

> **Для AI/Cursor**: История всех изменений проекта в хронологическом порядке. Используй для понимания эволюции проекта.

---

## [1.3.2] - 2025-10-09 (Most Bought Improvements & Silent Refresh)

### 🏆 Most Bought Tab - Complete Update
#### Added
- ✅ **Period Filters**: 1 Hour, 6 Hours, 24 Hours (настраиваемый период)
- ✅ **SQL Improvements**: Исправлены поля `total_buyers`, добавлен `largest_buy`
- ✅ **Better Sorting**: ORDER BY total_volume DESC (сортировка по объему покупок)
- ✅ **Buyers Modal**: Клик на "Buyers" → Early Buyers модалка с токеном и именем
- ✅ **Token Counter**: "Showing X tokens" с динамическим обновлением
- ✅ **Better Description**: Подробное описание вкладки

#### Fixed
- ✅ **Buyers Count**: Теперь показывает реальное количество покупателей (было 0)
- ✅ **Period Accuracy**: SQL использует правильный интервал (1h/6h/24h)

### ⚡ Silent Auto-Refresh (Anti-Flicker)
#### Changed
- ✅ **No More Flickering**: Auto-refresh больше НЕ показывает skeleton loader
- ✅ **Silent Update**: Данные обновляются в фоне без визуальных артефактов
- ✅ **Scroll Preserved**: Позиция скролла сохраняется при обновлении
- ✅ **Better UX**: Нет раздражающих миганий каждые 60 секунд

#### Technical Details
```javascript
// БЫЛО: loadTabData() → skeleton loader → мигание
// СТАЛО: fetchData() + renderFunction() → тихое обновление

if (endpoint && renderFunction) {
  const data = await fetchData(endpoint);
  renderFunction(data); // No skeleton, no loading overlay!
}
```

### 👥 Early Buyers Modal Improvements
#### Changed
- ✅ **Removed Swipe Gestures**: Убраны жесты вверх/вниз (мешали скроллу)
- ✅ **Click Outside to Close**: Тап мимо модалки → закрывает
- ✅ **Better Scrolling**: Скролл внутри модалки работает без багов
- ✅ **Shows Token Name**: "Early Buyers: $TICKER - Token Name" вместо контракта

### 🎨 Pump.fun Button - Final Fix
#### Changed
- ✅ **Darker Green**: `#10b981 → #059669` (спокойный зелёный, не кислотный)
- ✅ **Nuclear CSS Selector**: `a[href*="pump.fun"]` применяется ко ВСЕМ Pump.fun кнопкам
- ✅ **White Text**: Белый текст на зелёном фоне (лучше читается)

---

## [1.3.1] - 2025-10-09 (Critical Fixes & Early Buyers Modal)

### 🐛 Critical Bug Fixes
#### Fixed
- ✅ **КРИТИЧНО: Sell Volume Calculation**: Исправлен расчет объема продаж - теперь использует `sol_received` вместо `sol_spent`
  ```javascript
  // БЫЛО (неправильно):
  const totalSellVolume = sellTrades.reduce((sum, trade) => 
    sum + parseFloat(trade.sol_spent || 0), 0);
  // sol_spent = 0 для SELL → всегда показывало 0 SOL!
  
  // СТАЛО (правильно):
  const totalSellVolume = sellTrades.reduce((sum, trade) => 
    sum + parseFloat(trade.sol_received || 0), 0);
  // sol_received = X для SELL → показывает реальный объем!
  ```
- ✅ **Default Filter Fix**: Базовый фильтр Fresh Tokens теперь 24h (вместо 1h)
- ✅ **Age Filter Logic**: Фильтр возраста теперь всегда применяется корректно
- ✅ **Pump.fun Button Color**: ОКОНЧАТЕЛЬНО исправлен цвет (добавлен `:not(.pump-button)` в селектор)

### 👥 Early Buyers Modal
#### Added
- ✅ **Clickable Early Buyers Stat**: Клик на "Early Buyers" → открывает модалку со списком покупателей
- ✅ **Buyer Ranking**: Покупатели отсортированы по общей потраченной сумме (#1, #2, #3...)
- ✅ **Swipe Gestures**: Swipe вверх/вниз → закрывает модалку
- ✅ **Tap-to-Copy Wallets**: Кошельки покупателей копируются по тапу
- ✅ **Detailed Stats**: Для каждого покупателя: Total Spent, TX Count, First Buy Time

#### UI/UX
```css
/* Clickable Stats */
.stat-clickable { cursor: pointer; transition: all 0.2s ease; }
.stat-clickable:hover { background: rgba(102, 126, 234, 0.1); transform: scale(1.05); }

/* Buyers List */
.buyer-item { display: flex; gap: 12px; padding: 12px; }
.buyer-rank { color: var(--accent-primary); font-weight: bold; }
.buyer-spent { color: var(--success); } // Зеленый
.buyer-txs { color: var(--info); } // Синий
```

### 🎨 UI Improvements
#### Added
- ✅ **Compact Filters**: Фильтры Fresh Tokens более компактные (padding 6px вместо 12px)
- ✅ **2-Column Mobile Grid**: Fresh Tokens на мобильных теперь в 2 колонки (вместо 1)
- ✅ **Smaller Mobile Cards**: Padding 10px, font-size уменьшены (13px/10px/12px)

### 🌐 Translations
#### Fixed
- ✅ **Token Details Modal**: Полностью переведена на английский
- ✅ **Top Gainers Tab**: Переведен на английский (Buyers, Total Volume, Avg Buy, Largest Buy)

---

## [1.3.0] - 2025-10-09 (Fresh Tokens & About Page Update)

### ✨ About Page Enhancements
#### Added
- ✅ **Premium CTA Button**: Золотая кнопка "Upgrade to Premium" с пульсирующим свечением и shine эффектом
- ✅ **Number Animation**: Плавная анимация счета цифр (300+, 10418+, 50+, 77%) от 0 до целевого значения
- ✅ **Perfect Alignment**: Идеальное выравнивание header, navigation и content по центру

#### Fixed
- ✅ **Mobile Number Animation**: Теперь работает на touch-устройствах
- ✅ **Container Alignment**: `box-sizing: border-box` для всех layout элементов
- ✅ **Mobile Padding**: Уменьшен с 16px до 12px для лучшего использования пространства

#### Technical Details
```javascript
// Анимация цифр
animateAboutNumbers() // Запускается при переключении на About
// Длительность: 1.5 секунды, 50 шагов
// Поддержка обычных чисел и процентов

// Premium Button
.premium-cta-button {
  background: linear-gradient(135deg, #ffd700, #ffed4e, #ffd700);
  animation: premium-glow 2s infinite; // Пульсация
  animation: premium-shine 3s infinite; // Блеск
}
```

### 🌱 Fresh Tokens Tab - Complete Overhaul
#### Added
- ✅ **Sorting**: Age ↓, Market Cap ↓, Volume ↓
- ✅ **Token Badges**: 🆕 New (<10min), 🔥 Hot (>50 SOL), 📈 Trending (>20 buyers)
- ✅ **Token Counter**: "Showing X tokens" (динамическое обновление)
- ✅ **Tap-to-Copy Contracts**: Клик/тап → копирует полный адрес с визуальной обратной связью
- ✅ **Market Cap Display**: Добавлен в карточки токенов
- ✅ **TX Count**: Количество транзакций для каждого токена
- ✅ **Enhanced Age Display**: "2h 15m ago" вместо просто минут

#### Fixed
- ✅ **SQL Query Expanded**: С 5 минут → 24 часа (фильтры 6h/24h теперь работают!)
- ✅ **Pump.fun Button**: Перекрашена в фирменный градиент (убран фиолетовый)
- ✅ **Mobile Compactness**: Padding уменьшен (14px вместо 20px), gap 12px вместо 24px
- ✅ **More Tokens on Screen**: Больше данных без скролла на мобильных

#### Database Changes
```sql
-- Fresh Tokens Query
- Expanded: interval '5 minutes' → '24 hours'
- Added: COUNT(*) AS tx_count
- Increased: LIMIT 100 → 200
```

#### UI/UX Improvements
```css
/* Token Badges */
.badge-new { background: linear-gradient(#10b981, #059669); }
.badge-hot { background: linear-gradient(#f59e0b, #dc2626); }
.badge-trending { background: linear-gradient(#667eea, #764ba2); }

/* Tap-to-Copy */
.contract-address { cursor: pointer; font-family: 'Courier New'; }
.contract-address:hover { transform: scale(1.05); }

/* Mobile Compact */
@media (max-width: 768px) {
  .data-item { padding: 14px 16px; } // Was 20px
  .data-list { gap: 12px; } // Was 24px
}
```

### 🔧 Performance & Stability
#### Fixed
- ✅ **Database Connection Errors**: Добавлен error handler для pg-pool
- ✅ **Refresh Interval**: Увеличен с 30s → 60s (меньше нагрузка на БД)
- ✅ **API Timeout**: Увеличен с 10s → 15s (больше времени на ответ)
- ✅ **Smart Refresh**: Сохраняет scroll position при auto-refresh

### 📱 Mobile Optimizations
- Компактные карточки токенов (14px padding вместо 20px)
- Меньше gap между элементами (12px вместо 24px)
- Badges адаптивны и читаемы на маленьких экранах
- Tap-to-copy работает без задержек на touch-устройствах

---

## [1.2.0] - 2025-10-08 (UX/UI Improvements Update)

### ✨ UI/UX Enhancements
#### Fixed
- ✅ **Админка**: Убрана шестеренка из header, оставлена кнопка в footer
- ✅ **Модальное окно**: Исправлена прокрутка (верхняя часть больше не обрезана)
- ✅ **Modal header**: Теперь sticky, остается видимым при прокрутке
- ✅ **Кнопка Copy**: Яркий градиентный дизайн с анимацией hover
- ✅ **Swipe жесты**: Универсальная функция для всех модальных окон
- ✅ **Skeleton loaders**: Добавлены для всех вкладок с API данными
- ✅ **Плавные переходы**: Fade-in/out анимации между вкладками
- ✅ **Lazy loading**: Данные загружаются только при первом открытии вкладки

#### Added - Skeleton Loaders
- Shimmer анимация для skeleton элементов
- Автоматическое отображение перед загрузкой данных
- Плавное исчезновение после загрузки
- Staggered delays для волнового эффекта

#### Added - Smooth Transitions
- CSS transitions для всех tab-content
- Staggered animations для карточек (поочередное появление)
- Fade in + slide up эффекты
- Animation delays: 0.05s, 0.1s, 0.15s, 0.2s, 0.25s

#### Added - Swipe Gestures
- Touch events для свайпа модальных окон вниз
- Динамическое изменение opacity фона при свайпе
- Автоматическое закрытие при свайпе > 100px
- Поддержка для: tokenModal, subscriptionModal, solanaPaymentModal
- Работает только на мобильных устройствах (< 768px)

#### Added - Lazy Loading
- `loadedTabs` Set для отслеживания загруженных вкладок
- Данные загружаются только при первом открытии
- Кнопка Refresh сбрасывает кеш и перезагружает данные
- Значительное улучшение производительности

#### Technical Details
```javascript
// Skeleton Loader
showSkeletonLoader(containerId) // Показать skeleton
loadTabData(tabName) // Загрузить с skeleton

// Swipe Gestures
initModalSwipe() // Инициализация для всех модалов
touchstart -> touchmove -> touchend

// Lazy Loading
loadedTabs.has(tabName) // Проверка загрузки
loadedTabs.add(tabName) // Отметить как загруженное
loadedTabs.delete(tabName) // Сброс для refresh
```

#### CSS Classes Added
```css
.skeleton-container
.skeleton-card
.skeleton-avatar, .skeleton-title, .skeleton-subtitle, .skeleton-stat
.modal.closing
.tab-content.active (с transitions)
.data-item (с animation-delay)
.copy-button (яркая кнопка)
.modal-header (sticky)
```

#### Files Modified
- `public/style-modern.css` - Skeleton styles, Modal animations, Copy button
- `public/script.js` - Lazy loading, Swipe gestures, Skeleton integration
- `public/index.html` - Admin button repositioned to footer
- `TESTING_UX_IMPROVEMENTS.md` - Новая документация для тестирования

---

## [1.1.0] - 2025-10-07 (Evening Update)

### 💎 Solana Payment System
#### Added
- ✅ Полная интеграция Solana Pay
- ✅ QR код модальное окно для оплаты
- ✅ KOLScan токен холдер скидка (25%)
- ✅ Верификация транзакций on-chain
- ✅ Автоматическая активация подписки
- ✅ API endpoints: `/api/payment/solana`, `/api/payment/verify-solana`, `/api/kolscan/balance/:wallet`
- ✅ Документация: `SOLANA_PAYMENT_GUIDE.md`
- ✅ Поддержка deep links для Phantom/Solflare
- ✅ Copy/paste payment URL
- ✅ Красивая анимация модального окна

#### Payment Flow
1. Пользователь нажимает "Pay with SOL"
2. (Опционально) вводит wallet для KOLScan скидки
3. Видит QR код и payment URL
4. Оплачивает через wallet
5. Вводит transaction signature
6. Система верифицирует on-chain
7. Подписка активируется автоматически

#### Environment Variables Required
```env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
MERCHANT_WALLET=YOUR_WALLET_HERE
KOLSCAN_TOKEN_ADDRESS=YOUR_TOKEN_HERE
```

#### Technical Details
- Solana Web3.js integration
- Transaction verification with tolerance (0.001 SOL)
- Merchant wallet recipient check
- Blockchain confirmation validation
- Database subscription auto-creation

---

## [1.0.0] - 2025-10-07

### 🎨 Design System
#### Added
- ✅ Lovable дизайн интегрирован (гибридный подход)
- ✅ Три темы: Light, Dark, Lovable
- ✅ Theme switcher с циклическим переключением
- ✅ Glass morphism эффекты
- ✅ Neon glow анимации
- ✅ Gradient backgrounds
- ✅ Responsive design для всех устройств

#### Changed
- ✅ About страница: полная копия Lovable home screen
- ✅ Analytics страница: чистый Lovable дизайн
- ✅ Dashboard: улучшенный layout с категориями
- ✅ Кнопки Pump.fun: оригинальные цвета (#ff6b35, #f7931e)
- ✅ Убраны рамки контента для полноэкранного отображения

#### Fixed
- ✅ "Smart Money" заголовок теперь зеленый (#00ff88)
- ✅ Текст не "плывет" на мобильных
- ✅ Правильный line-height и letter-spacing

---

### 🔐 Subscription System
#### Added
- ✅ 4 уровня доступа: Free, Trial, Basic, Pro
- ✅ 5-дневный триальный период с автоматическим отсчетом
- ✅ Разграничение доступа к вкладкам по подписке
- ✅ Блокировка вкладок для Free пользователей
- ✅ UI индикаторы статуса (FREE, TRIAL 5d, PREMIUM)
- ✅ Upgrade prompts при попытке доступа к locked контенту
- ✅ Метод `hasHadPaidSubscription()` для проверки истории оплат

#### Changed
- ✅ Locked tabs: приглушены, grayscale, красный замок
- ✅ Subscription indicator показывает дни триала
- ✅ Access rules для каждого tier

#### Fixed
- ✅ Payment amounts: SOL=0 для Stars, Stars=0 для SOL
- ✅ `confirmed_at` заполняется при подтверждении
- ✅ Триал не продлевается после оплаты
- ✅ Цена SOL в меню зеленая (#00ff88)

---

### 🧭 Navigation
#### Added
- ✅ Dashboard вкладка с обзором всех категорий
- ✅ Info группа: About, Analytics, Dashboard
- ✅ Wallet Stats перенесен в Smart Money
- ✅ Whale Moves перенесен в Market

#### Changed
- ✅ Layout: About+Analytics в ряд, Dashboard широкая под ними
- ✅ Группировка вкладок по категориям

---

### 🎭 UI/UX Improvements
#### Added
- ✅ Анимированные счетчики на главной (отключены - багованные)
- ✅ Красивые закругленные блоки для тегов в Analytics
- ✅ Hover эффекты на Dashboard карточках
- ✅ Arrow иконки с transition анимацией

#### Fixed
- ✅ Дублирующая функция `switchTab()` удалена
- ✅ Приложение не зависает при переключении вкладок

---

### 🐛 Bug Fixes
#### Fixed
- ✅ Database connection errors (ENETUNREACH)
- ✅ Subscription menu layout на iPhone
- ✅ Recent Activity: показываются имена и тикеры токенов
- ✅ Coin Market: работают фильтры, показываются изображения
- ✅ Portfolio: реальные данные вместо mock
- ✅ Cluster Buy: аватарки токенов вместо огонька
- ✅ SOL токен удален из всех топов
- ✅ Telegram Stars: правильная цена (100 вместо 10000)

---

### 📚 Documentation
#### Added
- ✅ `DEVELOPMENT_ROADMAP.md` - план развития (162 строки)
- ✅ `TESTING_GUIDE.md` - руководство по тестированию (284 строки)
- ✅ `DEVELOPMENT_BEST_PRACTICES.md` - лучшие практики (759 строк)
- ✅ `API_DOCUMENTATION.md` - документация API
- ✅ `CHANGELOG.md` - история изменений (этот файл)
- ✅ `DESIGN_VERSIONS.md` - система версий дизайна

---

## [0.9.0] - 2025-10-06

### Initial Release
- ✅ Базовая структура проекта
- ✅ Telegram Mini App интеграция
- ✅ PostgreSQL база данных
- ✅ Helius webhooks
- ✅ Pump.fun API интеграция
- ✅ Базовые вкладки (Fresh Tokens, Cluster Buy, Whale Moves, etc.)
- ✅ Система подписок (Telegram Stars + Solana)
- ✅ Admin панель

---

## 🔮 Upcoming Changes (Roadmap)

### [1.1.0] - Planned
- 🔄 Фильтры для Market вкладки
- 🔄 Фильтры для Signals вкладок
- 🔄 Swipe-жесты для мобильных
- 🔄 Кэширование данных
- 🔄 Quick search в Dashboard

### [1.2.0] - Planned
- 📅 Push-уведомления
- 📅 Настраиваемые алерты
- 📅 Mini-графики в карточках
- 📅 Favorites система
- 📅 Skeleton loaders

### [2.0.0] - Future
- 💭 Wallet Connect интеграция
- 💭 AI-powered рекомендации
- 💭 Автоматическое копирование сделок
- 💭 Multi-chain support

---

## 📊 Statistics

### Код:
- **Total lines**: ~15,000+
- **Files**: 20+
- **API endpoints**: 25+
- **Database tables**: 12

### Фичи:
- **Tabs**: 15
- **Themes**: 3
- **Subscription tiers**: 4
- **Payment methods**: 2

---

## 🔗 Related Documents
- [Development Roadmap](DEVELOPMENT_ROADMAP.md)
- [Testing Guide](TESTING_GUIDE.md)
- [Best Practices](DEVELOPMENT_BEST_PRACTICES.md)
- [API Documentation](API_DOCUMENTATION.md)

---

**Maintained by:** AI Assistant + Developer  
**Format:** Keep Adding to the Changelog (KATACL)  
**Last Updated:** 2025-10-07

