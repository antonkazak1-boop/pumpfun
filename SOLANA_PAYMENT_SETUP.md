# 🪙 Solana Payment Setup & Testing Guide

> **Complete guide** для настройки и тестирования Solana оплаты в Sol Fun Mini App

---

## 📋 **TABLE OF CONTENTS**

1. [Helius Webhook Setup](#helius-webhook-setup)
2. [Environment Variables](#environment-variables)
3. [Testing KOLScan Balance](#testing-kolscan-balance)
4. [Payment Flow Testing](#payment-flow-testing)
5. [Common Issues & Solutions](#common-issues--solutions)

---

## 🔧 **HELIUS WEBHOOK SETUP**

### **Step 1: Create Helius Account**
1. Go to https://helius.dev
2. Sign up / Log in
3. Create new project: "Sol Fun Payments"

### **Step 2: Get API Key**
1. Navigate to **Dashboard** → **API Keys**
2. Copy your API key: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
3. Add to `.env`:
   ```bash
   HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY_HERE
   SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY_HERE
   ```

### **Step 3: Create Webhook**
1. Navigate to **Webhooks** → **Create Webhook**
2. **Webhook Type**: `Enhanced Transactions`
3. **Webhook URL**: 
   ```
   https://your-render-app.onrender.com/webhook/payments
   ```
   
   **Local Testing (ngrok):**
   ```bash
   # Install ngrok
   npm install -g ngrok
   
   # Start tunnel
   ngrok http 3000
   
   # Use the HTTPS URL:
   https://xxxx-xx-xxx-xxx-xxx.ngrok-free.app/webhook/payments
   ```

4. **Transaction Types**: Select `Native Transfer` (SOL transfers)
5. **Account Addresses**: Add your merchant wallet
   ```
   G1baEgxW9rFLbPr8M6SmAxEbpeLw5Z5j4xyYwt8emTha
   ```
   
6. **Auth Header** (optional but recommended):
   ```
   Header Name: x-webhook-auth
   Header Value: your-secret-key-here-abc123
   ```
   
   Then update `server.js` webhook handler:
   ```javascript
   app.post('/webhook/payments', async (req, res) => {
       // Verify auth header
       const authHeader = req.headers['x-webhook-auth'];
       if (authHeader !== process.env.WEBHOOK_AUTH_SECRET) {
           return res.status(401).json({ error: 'Unauthorized' });
       }
       
       // ... rest of code
   ```

7. **Webhook Settings**:
   - ✅ Enable webhook
   - ✅ Send test event to verify
   - ✅ Check logs for successful delivery

### **Step 4: Test Webhook**
1. Send **Test Event** from Helius dashboard
2. Check your server logs for:
   ```
   💰 Payment webhook received: { ... }
   ```
3. If successful → ✅ Webhook is working!

---

## 🔑 **ENVIRONMENT VARIABLES**

Add to `.env` file:

```bash
# ==============================
# SOLANA PAYMENT CONFIG
# ==============================

# Helius RPC (required for webhook + transaction verification)
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY_HERE
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY_HERE

# Merchant wallet (receives payments)
MERCHANT_WALLET=G1baEgxW9rFLbPr8M6SmAxEbpeLw5Z5j4xyYwt8emTha

# KOLScan token for discounts
KOLSCAN_TOKEN_ADDRESS=Db8vz7nh1jbjxVBatBRgQWafqB5iDaW7A1VNh6DmraxP

# Webhook authentication (optional)
WEBHOOK_AUTH_SECRET=your-secret-key-here-abc123

# Subscription prices (SOL)
BASIC_PRICE=0.01   # 0.01 SOL for testing (0.1 SOL production)
PRO_PRICE=0.02     # 0.02 SOL for testing (0.25 SOL production)

# Discount settings
KOLSCAN_MIN_HOLD=1000     # Minimum tokens for discount
KOLSCAN_DISCOUNT=25       # 25% discount
```

---

## 🧪 **TESTING KOLSCAN BALANCE**

### **Test Endpoint:**
```bash
GET /api/kolscan/balance/:walletAddress
```

### **Example Request:**
```bash
# Test wallet with KOLScan tokens
curl https://your-app.onrender.com/api/kolscan/balance/FzDzVN9y7PJgRn21gGRtMQVmo9NzS1V2VzWxpRRHMsE4

# Response (has tokens):
{
  "success": true,
  "balance": 5000,
  "hasMinimumHold": true,
  "tokenAddress": "Db8vz7nh1jbjxVBatBRgQWafqB5iDaW7A1VNh6DmraxP"
}

# Response (no tokens):
{
  "success": true,
  "balance": 0,
  "hasMinimumHold": false,
  "tokenAddress": "Db8vz7nh1jbjxVBatBRgQWafqB5iDaW7A1VNh6DmraxP"
}
```

### **Verify Discount Logic:**
```javascript
// Check pricing with discount
const pricing = await solanaPayment.getSubscriptionPricing('pro', walletAddress);

// Example output:
{
  success: true,
  basePrice: 0.02,        // 0.02 SOL
  discount: 25,           // 25% discount
  finalPrice: 0.015,      // 0.015 SOL (25% off)
  hasKolscanDiscount: true,
  currency: 'SOL',
  subscriptionType: 'pro'
}
```

---

## 🚀 **PAYMENT FLOW TESTING**

### **Complete E2E Flow:**

#### **1. User Initiates Payment**
Bot command: `/subscribe`
- User selects `Pro (0.02 SOL)`
- Bot asks: "Do you hold KOLScan tokens for discount?"
  - ✅ Yes → Ask for wallet address
  - ❌ No → Skip discount check

#### **2. Check KOLScan Balance (if applicable)**
```javascript
// Bot code
const balanceCheck = await fetch(
    `${SERVER_URL}/api/kolscan/balance/${walletAddress}`
);
const result = await balanceCheck.json();

if (result.hasMinimumHold) {
    ctx.reply('✅ You qualify for 25% discount! (1000+ tokens found)');
    discount = 25;
} else {
    ctx.reply('❌ Insufficient tokens for discount (need 1000+)');
}
```

#### **3. Create Payment Intent**
```javascript
// Bot → Server
const intentResponse = await fetch(`${SERVER_URL}/api/payment/create-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        userId: ctx.from.id,
        subscriptionType: 'pro',
        amount: 0.015,  // With discount
        fromWallet: walletAddress  // Optional for discount verification
    })
});

const { intentId, paymentAddress, amount } = await intentResponse.json();
```

#### **4. Show Payment Instructions**
```javascript
ctx.reply(
    `💳 **Send exactly ${amount} SOL** to:\n\n` +
    `\`${paymentAddress}\`\n\n` +
    `⏰ Payment expires in 15 minutes\n` +
    `🔍 Checking for payment...`,
    {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[
                { text: '✅ I sent payment', callback_data: `check_${intentId}` }
            ]]
        }
    }
);
```

#### **5. Auto-Detection via Webhook**
When user sends SOL → Helius webhook fires:

```javascript
// server.js - /webhook/payments
// ✅ Payment received: 0.015 SOL from FzDz...
// ✅ Matched payment intent: pro_1697xxxxxx
// ✅ Subscription auto-activated for user 123456789
```

Bot polls for status:
```javascript
// Check payment intent every 5 seconds
const checkIntent = async () => {
    const response = await fetch(`${SERVER_URL}/api/payment/check-intent/${intentId}`);
    const { status, paidAt } = await response.json();
    
    if (status === 'paid') {
        ctx.reply('✅ Payment confirmed! Your Pro subscription is now active! 🎉');
        return true;
    }
    return false;
};

// Poll for 15 minutes
const interval = setInterval(async () => {
    const paid = await checkIntent();
    if (paid) clearInterval(interval);
}, 5000);
```

#### **6. Fallback: Manual Activation**
If webhook fails, user can provide wallet address:

```javascript
// Bot asks for wallet
ctx.reply('Please send your Solana wallet address:');

bot.on('text', async (ctx) => {
    const walletAddress = ctx.message.text;
    
    // Server checks blockchain for payment
    const response = await fetch(`${SERVER_URL}/api/payment/activate-pending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: ctx.from.id,
            fromWallet: walletAddress
        })
    });
    
    const result = await response.json();
    if (result.success) {
        ctx.reply('✅ Payment found and activated!');
    } else {
        ctx.reply('❌ No payment found from this wallet. Please wait 1-2 minutes.');
    }
});
```

---

## 🐛 **COMMON ISSUES & SOLUTIONS**

### **Issue 1: Webhook not receiving events**
**Symptoms:**
- Payments sent but not detected
- No logs in server: `💰 Payment webhook received`

**Solutions:**
1. Check Helius webhook status (should be ✅ Active)
2. Verify webhook URL is correct (HTTPS required!)
3. Check Helius logs for delivery failures
4. Test with "Send Test Event" in Helius dashboard
5. Verify merchant wallet address is correct in webhook config

---

### **Issue 2: "Not Found" error on transaction verification**
**Symptoms:**
```
Error verifying payment: SyntaxError: Unexpected token 'N', "Not Found" is not valid JSON
```

**Solutions:**
1. ✅ Already fixed! Multi-RPC fallback in `solanaPayment.js`
2. Ensure `HELIUS_RPC_URL` is set correctly
3. Wait 30-60 seconds after payment for blockchain confirmation
4. Check transaction on Solscan: `https://solscan.io/tx/{signature}`

---

### **Issue 3: KOLScan balance always returns 0**
**Symptoms:**
- User has tokens but `balance: 0`
- `hasMinimumHold: false`

**Solutions:**
1. Verify token address is correct:
   ```bash
   KOLSCAN_TOKEN_ADDRESS=Db8vz7nh1jbjxVBatBRgQWafqB5iDaW7A1VNh6DmraxP
   ```
2. Check wallet has tokens on Solscan:
   ```
   https://solscan.io/account/{walletAddress}
   ```
3. Test with known wallet that has tokens
4. Check RPC connection in logs:
   ```
   🔗 Solana RPC: https://mainnet.helius-rpc.com/?api-key=...
   ```

---

### **Issue 4: Payment intent expires before user pays**
**Symptoms:**
- User pays after 15 minutes
- Payment not matched to intent

**Solutions:**
1. Increase expiry time in `/api/payment/create-intent`:
   ```javascript
   expires_at: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
   ```
2. Fallback to `pending_payments` (already implemented!)
3. User can manually activate via wallet address

---

### **Issue 5: Discount not applied**
**Symptoms:**
- User has 1000+ tokens
- Still charged full price

**Solutions:**
1. Check payment intent includes `fromWallet`:
   ```javascript
   {
       userId: 123456789,
       subscriptionType: 'pro',
       amount: 0.015,  // ← Should be discounted!
       fromWallet: 'FzDz...'  // ← Required for discount
   }
   ```
2. Verify KOLScan balance check runs BEFORE creating intent
3. Log pricing calculation:
   ```javascript
   const pricing = await solanaPayment.getSubscriptionPricing('pro', wallet);
   console.log('Pricing:', pricing);
   ```

---

## 📊 **MONITORING & DEBUGGING**

### **Server Logs to Watch:**
```bash
# Successful payment flow:
🔍 Checking KOLScan balance for: FzDz...
✅ KOLScan balance result: { balance: 5000, hasMinimumHold: true }
💰 Payment webhook received: { ... }
✅ Payment received: 0.015 SOL from FzDz...
🎯 Matched payment intent: pro_1697xxxxxx
✅ Subscription auto-activated for user 123456789
```

### **Database Queries for Debugging:**
```sql
-- Check payment intents
SELECT * FROM payment_intents 
WHERE telegram_user_id = 123456789 
ORDER BY created_at DESC 
LIMIT 5;

-- Check pending payments
SELECT * FROM pending_payments 
WHERE from_wallet = 'FzDz...' 
ORDER BY created_at DESC;

-- Check active subscriptions
SELECT * FROM subscriptions 
WHERE telegram_user_id = 123456789;
```

---

## ✅ **TESTING CHECKLIST**

Before going live, test:

- [ ] ✅ Helius webhook receives test events
- [ ] ✅ KOLScan balance check works (with tokens)
- [ ] ✅ KOLScan balance check works (without tokens)
- [ ] ✅ Discount calculation (25% off for 1000+ tokens)
- [ ] ✅ Payment intent creation
- [ ] ✅ Payment detection via webhook (auto-activation)
- [ ] ✅ Payment intent polling (bot checks status)
- [ ] ✅ Manual activation (fallback if webhook fails)
- [ ] ✅ Expired intent handling
- [ ] ✅ Duplicate payment prevention
- [ ] ✅ Transaction verification (multi-RPC)
- [ ] ✅ Subscription activation
- [ ] ✅ User notification (payment confirmed)

---

## 🚀 **DEPLOYMENT**

### **Render.com Setup:**
1. Go to **Dashboard** → **Environment** → **Environment Variables**
2. Add all variables from `.env` section above
3. **Deploy** latest version
4. Update Helius webhook URL to production URL
5. Test with small amount (0.01 SOL)

### **Production Pricing:**
Update `solanaPayment.js`:
```javascript
const basePrices = {
    basic: 0.1,   // 0.1 SOL (~$15 at $150/SOL)
    pro: 0.25     // 0.25 SOL (~$37.50)
};
```

---

## 📞 **SUPPORT**

If issues persist:
1. Check Helius dashboard logs
2. Review server logs on Render
3. Query database for payment/intent records
4. Test with Solscan transaction explorer
5. Contact Helius support (24/7 for paid plans)

---

**Last Updated:** October 16, 2025  
**Version:** 1.0  
**Author:** Sol Fun Team  

