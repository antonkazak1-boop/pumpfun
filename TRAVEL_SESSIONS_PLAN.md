# 🚗 PLAN НА 2 СЕССИИ В ПОЕЗДКЕ

> **Цель**: Довести приложение до 100% готовности к запуску  
> **Время**: 2 сессии по 2 часа = 4 часа  
> **Приоритет**: Критичные фичи для стрима + маркет кап tracking

---

## 📅 **СЕССИЯ 1 - DAY 1 (2 часа)**

### **🎯 ЦЕЛЬ:** Критичные features для лучшего UX

---

### **1. 📊 Market Cap Tracking** (45 мин) - **P0**

#### **Зачем:**
Правильный расчет ROI/PnL/Win Rate на основе market cap (не SOL amounts)

#### **Что делать:**
```sql
-- Добавить колонки в events:
ALTER TABLE events 
ADD COLUMN entry_market_cap NUMERIC,
ADD COLUMN exit_market_cap NUMERIC,
ADD COLUMN entry_price NUMERIC,
ADD COLUMN exit_price NUMERIC;

-- Обновить webhook парсинг:
// В webhook handler добавить:
const marketCap = await getTokenMarketCap(tokenMint);
entry_market_cap: side === 'BUY' ? marketCap : null,
exit_market_cap: side === 'SELL' ? marketCap : null
```

#### **Новые расчеты:**
```sql
-- Правильный ROI:
ROI = ((exit_market_cap - entry_market_cap) / entry_market_cap) * 100

-- Win Rate:
winning_tokens = COUNT(DISTINCT CASE WHEN exit_mc > entry_mc THEN token_mint END)
```

#### **Файлы:**
- `server.js` - webhook handler
- `database_tables.sql` - ALTER TABLE
- `materialized_views.sql` - обновить расчеты

---

### **2. 🔥 Signals Merge** (45 мин) - **P0**

#### **Зачем:**
Упростить навигацию, объединить 4 вкладки в одну

#### **Current tabs:**
- Cluster Buy
- Volume Surge
- Co-Buy
- Whale Moves

#### **NEW: Live Signals tab**
```html
<div id="liveSignals" class="tab-content">
    <div class="signal-tabs">
        <button class="signal-tab active" data-signal="all">All</button>
        <button class="signal-tab" data-signal="cluster">Cluster</button>
        <button class="signal-tab" data-signal="volume">Volume</button>
        <button class="signal-tab" data-signal="whale">Whale</button>
    </div>
    
    <div id="signalsData"></div>
</div>
```

#### **Signal Strength Badges:**
```javascript
🔥 Hot (3+ signals)
⚡ Strong (2 signals)
💡 Medium (1 signal)
```

#### **Файлы:**
- `public/index.html` - merge tabs
- `public/script.js` - unified render function
- `public/style-modern.css` - signal tabs styles

---

### **3. 🔍 Quick Wins** (30 мин) - **P1**

#### **A) Token Metadata Caching**
```javascript
// Активировать функции (уже есть!)
function getCachedTokenMetadata(mint) {
    const cached = localStorage.getItem(`token_${mint}`);
    if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < 3600000) {
            return data.metadata;
        }
    }
    return null;
}
```

#### **B) Filter Preferences Save**
```javascript
// Уже работает для Fresh Tokens!
// Добавить для Coin Market:
localStorage.setItem('coinMarketFilters', JSON.stringify(filters));
```

#### **C) Update Description**
- About page
- Bot messages
- README

---

## 📅 **СЕССИЯ 2 - DAY 2 (2 часа)**

### **🎯 ЦЕЛЬ:** Polish + Referral System + Final Testing

---

### **1. 🎁 Referral System** (1 час) - **P0**

#### **Database Schema:**
```sql
CREATE TABLE referrals (
    id SERIAL PRIMARY KEY,
    referrer_user_id BIGINT NOT NULL,
    referred_user_id BIGINT NOT NULL,
    referral_code VARCHAR(20) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending',
    commission_earned DECIMAL(10, 2) DEFAULT 0
);

CREATE TABLE referral_rewards (
    id SERIAL PRIMARY KEY,
    referral_id INTEGER REFERENCES referrals(id),
    subscription_id INTEGER REFERENCES subscriptions(id),
    amount DECIMAL(10, 2),
    paid_at TIMESTAMP
);
```

#### **Backend Endpoints:**
```javascript
// Generate referral code
app.post('/api/referral/generate', async (req, res) => {
    const { userId } = req.body;
    const code = `ref_${userId}_${randomString(6)}`;
    // Save to DB
});

// Track referral
app.post('/api/referral/track', async (req, res) => {
    const { code, newUserId } = req.body;
    // Find referrer, save referral
});

// Get referral stats
app.get('/api/referral/stats/:userId', async (req, res) => {
    // Total referrals, earned commission
});
```

#### **Frontend:**
```javascript
// Share button
<button onclick="shareReferral()">
    <i class="fas fa-share"></i> Invite Friends & Earn
</button>

function shareReferral() {
    const refCode = getUserReferralCode();
    const url = `https://t.me/your_bot?start=${refCode}`;
    
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.openTelegramLink(url);
    }
}
```

#### **Rewards:**
- Referrer: 10% от каждой оплаты реферала
- Referred: 5% discount на первую подписку
- После 10 рефералов: Free Pro tier на месяц

---

### **2. 📸 Share to Telegram Stories** (30 мин) - **P1**

#### **Implementation:**
```javascript
// Share trading stats to Story
async function shareToStory() {
    const canvas = await generateStatsImage(); // Create image
    const blob = await canvas.toBlob();
    
    if (window.Telegram?.WebApp?.shareToStory) {
        window.Telegram.WebApp.shareToStory(blob, {
            text: "My trading stats on Sol Fun! 🚀",
            widget_link: {
                url: "https://t.me/your_bot/solfun",
                name: "Open Sol Fun"
            }
        });
    }
}
```

#### **What to share:**
- Daily top gainers
- Smart Money leaderboard
- User's subscription status
- Referral achievements

---

### **3. 🧪 Final Testing & Polish** (30 мин) - **P0**

#### **Testing Checklist:**
- [ ] All tabs load correctly
- [ ] Filters work on all tabs
- [ ] Subscription system (Stars + Solana)
- [ ] Mobile responsive on iPhone/Android
- [ ] Full-screen mode
- [ ] Home screen shortcut
- [ ] Payment verification
- [ ] Referral tracking
- [ ] Share to Stories

#### **Polish:**
- [ ] Fix any visual bugs
- [ ] Improve loading states
- [ ] Better error messages
- [ ] Update all descriptions
- [ ] Final CHANGELOG update

---

## 📋 **QUICK REFERENCE**

### **Priority Matrix:**

| Feature | Time | Priority | Impact | Effort |
|---------|------|----------|--------|--------|
| Market Cap Tracking | 45m | P0 | 🔥🔥🔥 | Medium |
| Signals Merge | 45m | P0 | 🔥🔥🔥 | Medium |
| Coin Market Filters | 30m | P1 | 🔥🔥 | Low |
| Referral System | 60m | P0 | 🔥🔥🔥 | Medium |
| Share to Stories | 30m | P1 | 🔥🔥 | Low |
| Token Caching | 15m | P1 | 🔥 | Low |
| Final Testing | 30m | P0 | 🔥🔥🔥 | Low |

### **Time Allocation:**

**Session 1 (2h):**
- Market Cap: 45m
- Signals Merge: 45m
- Quick Wins: 30m

**Session 2 (2h):**
- Referral: 60m
- Stories: 30m
- Testing: 30m

---

## 🚀 **POST-LAUNCH ROADMAP**

### **Week 1-2:**
- Monitor performance
- Fix bugs
- Community support
- Feature requests

### **Week 3-4:**
- AI trading signals
- Copy-trading
- Portfolio sync
- Advanced analytics

### **Month 2+:**
- Mobile native app
- Desktop app
- API для developers
- Partnerships

---

## 💡 **TOKEN LAUNCH TIPS**

### **Optimal Launch Time:**
- **Best**: 2-4 PM UTC (active US/EU traders)
- **Avoid**: Weekends, late night
- **Duration**: 2-4 hours stream

### **Chat Engagement:**
```
- Pin bot link every 5 minutes
- Answer questions actively
- Show features live
- Celebrate milestones together
- Engage with top holders
```

### **Marketing During Stream:**
```
- Tweet every milestone
- Post in Telegram groups
- Tag influencers
- Use trending hashtags
- Create viral moments
```

---

## ✅ **FINAL CHECKLIST BEFORE LAUNCH**

### **Technical:**
- [ ] All features working
- [ ] No critical bugs
- [ ] Mobile tested
- [ ] Payment tested
- [ ] Database stable
- [ ] API responsive

### **Content:**
- [ ] Twitter account created
- [ ] Bot description updated
- [ ] Announcement prepared
- [ ] Stream script ready
- [ ] Graphics prepared

### **Backup Plans:**
- [ ] Server backup ready
- [ ] Database backup done
- [ ] Emergency contact list
- [ ] Fallback stream platform

---

**Поехали! 🚀 Проверь Smart Money и готовься к запуску!**

