# 📋 TODO - Следующая сессия (Фильтры + Кэширование)

## 🎯 Главные задачи на завтра

### P0 (КРИТИЧНО - Делаем в первую очередь)

#### 1. 🔍 Фильтры для Market вкладки
- [ ] **Volume Filter** - Low/Medium/High
  - Low: < 10 SOL
  - Medium: 10-100 SOL
  - High: > 100 SOL
  
- [ ] **Price Change Filter** - Gainers/Losers/Stable
  - Gainers: > +5%
  - Losers: < -5%
  - Stable: -5% to +5%
  
- [ ] **Time Period Filter** - 1h/6h/24h/7d
  - Уже есть частично, нужно улучшить
  
- [ ] **Market Cap Filter** - улучшить существующий
  - Low Caps: 0-99K (уже есть)
  - Mid Caps: 100K-999K (уже есть)
  - High Caps: 1M+ (уже есть)
  - Добавить: Micro Caps (< 10K), Mega Caps (> 10M)

#### 2. 💾 Сохранение настроек фильтров
- [ ] **LocalStorage для фильтров**
  - Сохранять выбранные фильтры
  - Восстанавливать при перезагрузке
  - Ключи: `market_volume_filter`, `market_price_filter`, etc.
  
- [ ] **User Preferences**
  - Сохранять тему (dark/light)
  - Сохранять последнюю открытую вкладку
  - Сохранять настройки уведомлений

#### 3. 🚀 Кэширование данных
- [ ] **LocalStorage для tokens metadata**
  - Кэшировать token info (name, symbol, image)
  - TTL: 1 час
  - Reduce API calls на 70%
  
- [ ] **Cache Strategy**
  ```javascript
  // Проверить кэш
  const cached = localStorage.getItem(`token_${mint}`);
  if (cached && !isExpired(cached)) {
    return JSON.parse(cached);
  }
  // Иначе загрузить с API
  ```
  
- [ ] **Cache Invalidation**
  - Очистка старых данных (> 24 часа)
  - Кнопка "Clear Cache" в админке
  - Auto-clear при переполнении (> 5MB)

---

## P1 (Важно для UX)

### 4. 🎨 UI улучшения для фильтров
- [ ] **Dropdown меню для фильтров**
  - Красивый dropdown с иконками
  - Checkbox для множественного выбора
  - Apply/Reset кнопки
  
- [ ] **Chips для активных фильтров**
  - Показывать выбранные фильтры как chips
  - Крестик для быстрого удаления
  - Badge с количеством активных фильтров
  
- [ ] **Filter animations**
  - Плавное появление результатов
  - Skeleton при фильтрации
  - Smooth transitions

### 5. 📊 Статистика фильтров
- [ ] **Показывать количество результатов**
  - "Showing 45 of 1,234 tokens"
  - Обновлять в реальном времени
  
- [ ] **Empty state для фильтров**
  - Красивая заглушка если нет результатов
  - Кнопка "Reset Filters"

---

## P2 (Nice to have)

### 6. ⚡ Оптимизация производительности
- [ ] **Debounce для фильтров**
  - 300ms задержка перед применением
  - Избежать лишних re-renders
  
- [ ] **Virtual scrolling**
  - Для длинных списков токенов
  - Render только видимые элементы
  
- [ ] **Memoization**
  - React.memo для компонентов
  - useMemo для тяжелых вычислений

### 7. 🔔 Расширенные фильтры
- [ ] **Trader Count Filter**
  - Single trader / 2-5 traders / 5+ traders
  
- [ ] **Age Filter**
  - New (< 1h) / Recent (1-24h) / Old (> 24h)
  
- [ ] **Social Filter**
  - Has Twitter / Has Telegram / Has Website

---

## 🛠 Технический план

### Архитектура фильтров
```javascript
// Filter State
const filterState = {
  volume: 'all', // 'low', 'medium', 'high'
  priceChange: 'all', // 'gainers', 'losers', 'stable'
  marketCap: 'low', // 'micro', 'low', 'mid', 'high', 'mega'
  timePeriod: '24h', // '1h', '6h', '24h', '7d'
  traderCount: 'all', // 'single', 'few', 'many'
  age: 'all' // 'new', 'recent', 'old'
};

// Apply Filters
function applyFilters(data, filters) {
  return data
    .filter(applyVolumeFilter)
    .filter(applyPriceChangeFilter)
    .filter(applyMarketCapFilter)
    // ...etc
}

// Save to LocalStorage
function saveFilterPreferences(filters) {
  localStorage.setItem('market_filters', JSON.stringify(filters));
}

// Load from LocalStorage
function loadFilterPreferences() {
  const saved = localStorage.getItem('market_filters');
  return saved ? JSON.parse(saved) : defaultFilters;
}
```

### Кэширование
```javascript
// Cache Manager
class CacheManager {
  constructor() {
    this.prefix = 'pump_dex_cache_';
    this.ttl = 3600000; // 1 hour
  }
  
  set(key, value) {
    const item = {
      value: value,
      timestamp: Date.now()
    };
    localStorage.setItem(this.prefix + key, JSON.stringify(item));
  }
  
  get(key) {
    const item = localStorage.getItem(this.prefix + key);
    if (!item) return null;
    
    const parsed = JSON.parse(item);
    if (Date.now() - parsed.timestamp > this.ttl) {
      this.remove(key);
      return null;
    }
    
    return parsed.value;
  }
  
  remove(key) {
    localStorage.removeItem(this.prefix + key);
  }
  
  clear() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}
```

---

## 📁 Файлы для изменения

### Создать новые:
- `public/js/filters.js` - Filter logic
- `public/js/cache-manager.js` - Cache management
- `public/css/filters.css` - Filter UI styles

### Изменить существующие:
- `public/script.js` - Интеграция фильтров
- `public/style-modern.css` - Стили для фильтров
- `public/index.html` - HTML для фильтров

---

## 🎯 Ожидаемый результат

### После реализации пользователь сможет:
1. ✅ Фильтровать токены по объему (Low/Medium/High)
2. ✅ Фильтровать по изменению цены (Gainers/Losers/Stable)
3. ✅ Видеть активные фильтры как chips
4. ✅ Сохранять настройки фильтров (автоматически)
5. ✅ Получать мгновенный доступ к кэшированным данным
6. ✅ Видеть количество результатов фильтрации
7. ✅ Быстро сбрасывать все фильтры

### Метрики производительности:
- 📉 Reduce API calls на 70% (благодаря кэшу)
- ⚡ Фильтрация < 100ms (для 1000 токенов)
- 💾 LocalStorage usage < 5MB
- 🚀 Instant filter application (благодаря debounce)

---

## 🧪 План тестирования

### Фильтры:
1. Применить Volume filter - проверить результаты
2. Применить Price Change filter - проверить результаты
3. Комбинация фильтров - проверить результаты
4. Сброс фильтров - все токены показываются
5. Перезагрузка страницы - фильтры восстанавливаются

### Кэш:
1. Загрузить токен первый раз - запрос к API
2. Загрузить токен второй раз - данные из кэша
3. Подождать 1 час - кэш истекает
4. Загрузить токен снова - новый запрос к API
5. Clear cache - все данные удаляются

### LocalStorage:
1. Выбрать фильтры - сохраняются автоматически
2. Перезагрузить страницу - фильтры восстанавливаются
3. Проверить размер LocalStorage - < 5MB
4. Переполнение - старые данные удаляются

---

## ⏱ Оценка времени

- **Фильтры Volume/Price**: 1-2 часа
- **Сохранение настроек**: 30 минут
- **Кэширование токенов**: 1 час
- **UI для фильтров**: 1-2 часа
- **Тестирование**: 30 минут
- **Документация**: 30 минут

**Итого: 4-6 часов работы**

---

## 📝 Заметки

### Приоритеты:
1. Сначала делаем базовые фильтры (Volume, Price Change)
2. Потом кэширование
3. Потом сохранение настроек
4. В конце - UI улучшения

### Возможные проблемы:
- LocalStorage может быть заполнен (проверить размер)
- Safari ограничения на LocalStorage
- Фильтры могут быть медленными для больших данных (оптимизировать)

### Будущие улучшения:
- IndexedDB вместо LocalStorage (для больших данных)
- Service Worker для offline режима
- Push notifications для важных изменений фильтров

---

## 🚀 Quick Start (завтра)

```bash
# 1. Создать файлы
touch public/js/filters.js
touch public/js/cache-manager.js
touch public/css/filters.css

# 2. Начать с фильтров
# Открыть public/js/filters.js
# Реализовать FilterManager class

# 3. Добавить кэширование
# Открыть public/js/cache-manager.js
# Реализовать CacheManager class

# 4. Интегрировать в main script
# Открыть public/script.js
# Импортировать и использовать

# 5. Тестировать
# Открыть в браузере
# Проверить фильтры + кэш
```

---

Готовы начать завтра! 🎯

