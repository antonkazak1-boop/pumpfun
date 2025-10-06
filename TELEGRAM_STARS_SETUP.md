# Telegram Stars Payment Setup Guide

## 🚀 How to Accept Telegram Stars Payments

### 1. **BotFather Configuration**

First, you need to configure your bot with BotFather to accept payments:

1. **Open BotFather** in Telegram: [@BotFather](https://t.me/BotFather)

2. **Send command**: `/mybots`

3. **Select your bot** from the list

4. **Click "Bot Settings"**

5. **Click "Payments"**

6. **Click "Connect Stripe"** (for Stars payments)

### 2. **Stripe Setup (Required for Stars)**

Telegram Stars payments require Stripe integration:

1. **Create Stripe Account**: [stripe.com](https://stripe.com)
2. **Get API Keys** from Stripe Dashboard
3. **Connect to BotFather** using Stripe keys

### 3. **Alternative: Direct Invoice Links**

If you don't want to use Stripe, you can use direct invoice links (as implemented in the bot):

```javascript
const invoice = await bot.telegram.createInvoiceLink({
    title: 'Pump Dex Basic Subscription',
    description: 'Basic subscription - 30 days access',
    payload: `basic_${userId}`,
    provider_token: '', // Empty for Stars
    currency: 'XTR', // Telegram Stars
    prices: [{
        label: 'Basic Subscription',
        amount: 10000 // 100 stars in cents
    }]
});
```

### 4. **Webhook Configuration**

Add webhook for payment notifications:

```javascript
// In your server.js or bot.js
app.post('/webhook/payment', (req, res) => {
    const update = req.body;
    
    if (update.pre_checkout_query) {
        // Handle pre-checkout
        bot.telegram.answerPreCheckoutQuery(update.pre_checkout_query.id, true);
    }
    
    if (update.message && update.message.successful_payment) {
        // Handle successful payment
        console.log('Payment successful:', update.message.successful_payment);
    }
    
    res.status(200).send('OK');
});
```

### 5. **Environment Variables**

Add to your `.env` file:

```env
# Telegram Bot
BOT_TOKEN=your_bot_token_here
MINI_APP_URL=https://your-app-url.com

# Stripe (if using Stripe integration)
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 6. **Testing Payments**

1. **Use Test Mode**: Set up test payments first
2. **Test with Small Amounts**: Start with 1-10 stars
3. **Check Logs**: Monitor payment events in console

### 7. **Production Setup**

1. **Switch to Live Mode** in Stripe
2. **Update API Keys** to live keys
3. **Set up Webhooks** for production
4. **Test with Real Payments**

## 💡 **Current Implementation**

The bot is already configured with:

✅ **Invoice Creation** - Creates payment links for Stars
✅ **Payment Handlers** - Handles successful payments
✅ **User Interface** - Beautiful payment flow
✅ **Error Handling** - Graceful error management

## 🔧 **What You Need to Do**

1. **Configure BotFather** with Stripe (optional)
2. **Test the payment flow** with small amounts
3. **Monitor payment logs** in console
4. **Set up production webhooks** when ready

## 📱 **User Experience**

1. User clicks "Pay with Stars"
2. Bot creates invoice link
3. User clicks payment link
4. Telegram opens payment interface
5. User completes payment
6. Bot receives confirmation
7. User gets subscription access

## 🚨 **Important Notes**

- **Stars are in cents**: 100 stars = 10000 cents
- **Currency code**: Use 'XTR' for Telegram Stars
- **Provider token**: Leave empty for Stars payments
- **Webhook required**: For production payments
- **Test first**: Always test with small amounts

## 🎯 **Next Steps**

1. Test the current implementation
2. Set up Stripe if needed
3. Configure webhooks
4. Test with real payments
5. Deploy to production

The bot is ready to accept Stars payments! 🚀
