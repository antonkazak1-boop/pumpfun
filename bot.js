const { Telegraf, Markup, session } = require('telegraf');

// Конфигурация бота
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://pumpfun-u7av.onrender.com';

// Проверка конфигурации
if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN') {
    console.error('❌ Ошибка: BOT_TOKEN не установлен!');
    console.error('   Установите переменную окружения BOT_TOKEN или замените в коде');
    process.exit(1);
}

if (!MINI_APP_URL || MINI_APP_URL === 'YOUR_MINI_APP_HTTPS_URL') {
    console.error('❌ Ошибка: MINI_APP_URL не установлен!');
    console.error('   Установите переменную окружения MINI_APP_URL или замените в коде');
    console.error('   URL должен быть HTTPS для работы Telegram Mini App');
    process.exit(1);
}

// Создание бота
const bot = new Telegraf(BOT_TOKEN);

// Enable session support
bot.use(session());

// Subscription pricing constants (TESTING PRICES)
const SUBSCRIPTION_PRICES = {
    basic: {
        sol: 0.01,         // 0.01 SOL for testing (normally 0.1 SOL)
        stars: 1,          // Stars amount (what user sees and API gets) - TESTING
        stars_cents: 1     // Same as stars for Telegram API - TESTING
    },
    pro: {
        sol: 0.02,         // 0.02 SOL for testing (normally 0.25 SOL)
        stars: 2,          // Stars amount (what user sees and API gets) - TESTING
        stars_cents: 2     // Same as stars for Telegram API - TESTING
    }
};

// Handle payment commands from Mini App
async function handlePaymentCommand(ctx, tierName) {
    const user = ctx.from;
    const userName = user.first_name || user.username || 'User';
    
    console.log(`💳 Payment command received: ${tierName} for user ${userName}`);
    
    // Show welcome message first
    await ctx.reply(`👋 Hi ${userName}! Let's set up your ${tierName} subscription.`);
    
    if (tierName === 'basic') {
        return showBasicPayment(ctx, userName);
    } else if (tierName === 'pro') {
        return showProPayment(ctx, userName);
    }
}

// Show Basic payment directly
async function showBasicPayment(ctx, userName) {
    const userId = ctx.from.id;
    
    try {
        // Create invoice for Telegram Stars
        const invoice = await bot.telegram.createInvoiceLink({
            title: 'Sol Fun Basic Subscription',
            description: 'Basic subscription - 30 days access to all tabs',
            payload: `basic_${userId}`,
            provider_token: '', // Empty for Stars
            currency: 'XTR', // Telegram Stars
            prices: [{
                label: `Basic Subscription - ${SUBSCRIPTION_PRICES.basic.stars} Stars`,
                amount: SUBSCRIPTION_PRICES.basic.stars_cents // 10000 cents = 100 stars
            }]
        });
        
        ctx.reply(`
⭐ *Payment with Telegram Stars*

Hey ${userName}! Ready to upgrade to Basic?

💎 **Basic Subscription - ${SUBSCRIPTION_PRICES.basic.stars} Stars**
• 30 days access
• All tabs unlocked
• 50 notifications/day
• Priority support

━━━━━━━━━━━━━━━━━━━━
*Secure payment via Telegram*
━━━━━━━━━━━━━━━━━━━━
        `, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [Markup.button.url('💳 Pay with Stars', invoice)],
                    [Markup.button.callback('🔙 Back to Plans', 'back_to_plans')]
                ]
            }
        });
        
    } catch (error) {
        console.error('Error creating Stars invoice:', error);
        ctx.reply('❌ Payment system temporarily unavailable. Please try again later.');
    }
}

// Show Pro payment directly
async function showProPayment(ctx, userName) {
    const userId = ctx.from.id;
    
    try {
        // Create invoice for Telegram Stars
        const invoice = await bot.telegram.createInvoiceLink({
            title: 'Sol Fun Pro Subscription',
            description: 'Pro subscription - 30 days access with unlimited notifications',
            payload: `pro_${userId}`,
            provider_token: '', // Empty for Stars
            currency: 'XTR', // Telegram Stars
            prices: [{
                label: `Pro Subscription - ${SUBSCRIPTION_PRICES.pro.stars} Stars`,
                amount: SUBSCRIPTION_PRICES.pro.stars_cents // 25000 cents = 250 stars
            }]
        });
        
        ctx.reply(`
⭐ *Payment with Telegram Stars*

Hey ${userName}! Ready to upgrade to Pro?

🚀 **Pro Subscription - ${SUBSCRIPTION_PRICES.pro.stars} Stars**
• 30 days access
• All tabs unlocked
• Unlimited notifications
• Early access features
• Advanced analytics
• Priority support

━━━━━━━━━━━━━━━━━━━━
*Secure payment via Telegram*
━━━━━━━━━━━━━━━━━━━━
        `, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [Markup.button.url('💳 Pay with Stars', invoice)],
                    [Markup.button.callback('🔙 Back to Plans', 'back_to_plans')]
                ]
            }
        });
        
    } catch (error) {
        console.error('Error creating Stars invoice:', error);
        ctx.reply('❌ Payment system temporarily unavailable. Please try again later.');
    }
}

// Обработчик команды /start
bot.start((ctx) => {
    const user = ctx.from;
    const userName = user.first_name || user.username || 'Пользователь';
    const startParam = ctx.startPayload;
    
    console.log(`👋 Новый пользователь: ${userName} (ID: ${user.id})`);
    console.log(`📝 Start parameter: ${startParam}`);
    
    // Handle payment commands
    if (startParam) {
        if (startParam === 'pay_stars_basic') {
            return handlePaymentCommand(ctx, 'basic');
        } else if (startParam === 'pay_stars_pro') {
            return handlePaymentCommand(ctx, 'pro');
        }
    }
    
    const welcomeMessage = `
🚀 *Welcome to Sol Fun Bot!*

Hey ${userName}! Ready to track smart money on Solana?

╔═══════════════════════╗
║  🎯 *What We Offer*      ║
╚═══════════════════════╝

📊 *Real-Time Analytics*
Track 300+ known traders and their moves in real-time. Every purchase, every sale - all in one dashboard.

🔥 *Smart Money Tracking*
See what professional traders are buying before it pumps. Get instant insights into whale movements and cluster purchases.

💎 *Fresh Token Discovery*
Catch new tokens the moment smart traders enter. Never miss an early entry opportunity again.

📈 *Live Market Data*
• 20+ signals per hour
• Live updates every 5 minutes  
• 100% automated SQL analysis
• Deep market insights

╔═══════════════════════╗
║  💰 *Subscription Plans*  ║
╚═══════════════════════╝

🆓 *FREE*
• Access to 2 tabs
• 5-day trial period

💎 *BASIC - ${SUBSCRIPTION_PRICES.basic.sol} SOL (~${SUBSCRIPTION_PRICES.basic.stars} ⭐)*
• Access to ALL tabs
• 50 notifications per day
• Priority support

🚀 *PRO - ${SUBSCRIPTION_PRICES.pro.sol} SOL (~${SUBSCRIPTION_PRICES.pro.stars} ⭐)*
• Access to ALL tabs
• Unlimited notifications
• Early access to new features
• Advanced analytics

╔═══════════════════════╗
║  🎨 *Mini App Features*  ║
╚═══════════════════════╝

🐋 Whale Moves (10+ SOL)
🔥 Cluster Buy Analysis
📊 Volume Surge Detection
👥 Co-buy Patterns
🧠 Smart Money Moves
🌱 Fresh Tokens (< 24h)
🏆 Most Bought Tokens
🪙 Coin Market Overview
📱 Recent Activity Feed

━━━━━━━━━━━━━━━━━━━━
*Built by traders, for traders.*
Powered by on-chain data analysis.
━━━━━━━━━━━━━━━━━━━━

👇 *Launch the Mini App below to start tracking!*
    `;
    
    ctx.replyWithMarkdown(welcomeMessage, 
        Markup.inlineKeyboard([
            [Markup.button.webApp('🚀 Launch Mini App', MINI_APP_URL)]
        ])
    );
});

// Обработчик команды /about
bot.command('about', (ctx) => {
    const aboutMessage = `
📖 *About Sol Fun Bot*

╔═══════════════════════╗
║  💡 *Our Mission*        ║
╚═══════════════════════╝

We believe that everyone should have access to the same trading insights as professional traders. That's why we built Sol Fun Bot - to democratize smart money tracking on Solana.

╔═══════════════════════╗
║  🔍 *What We Track*      ║
╚═══════════════════════╝

📊 *300+ Known Traders*
We monitor a carefully curated list of proven successful traders on Solana, tracking every move they make.

⚡ *Real-Time Data*
Our system processes blockchain data in real-time, giving you instant notifications when smart traders make moves.

🎯 *Advanced Analytics*
Powered by SQL-based analysis of on-chain data, we provide deep insights that go beyond simple price tracking.

╔═══════════════════════╗
║  🚀 *Key Features*       ║
╚═══════════════════════╝

• Live activity feed (BUY/SELL)
• Whale transaction monitoring (10+ SOL)
• Cluster buy detection (coordinated purchases)
• Fresh token discovery (< 24h old)
• Smart money tracking (proven traders)
• Volume surge alerts
• Market overview by cap
• And much more...

━━━━━━━━━━━━━━━━━━━━
*Stay ahead of the curve.*
*Trade smarter, not harder.*
━━━━━━━━━━━━━━━━━━━━

Questions? Contact @your_support_bot
    `;
    
    ctx.replyWithMarkdown(aboutMessage,
        Markup.inlineKeyboard([
            [Markup.button.webApp('🚀 Launch Mini App', MINI_APP_URL)]
        ])
    );
});

// Обработчик команды /help
bot.help((ctx) => {
    const helpMessage = `
📖 *Sol Fun Bot - Help*

╔═══════════════════════╗
║  🤖 *Bot Commands*       ║
╚═══════════════════════╝

/start - Launch the bot and access Mini App
/about - Learn about Sol Fun Bot
/subscribe - View subscription plans and pricing
/help - Show this help message

╔═══════════════════════╗
║  🎨 *Mini App Tabs*      ║
╚═══════════════════════╝

📊 *About* - Introduction and statistics
📈 *Analytics* - Algorithm explanations
💼 *Portfolio* - Trader portfolios (300+ traders)
🔥 *Cluster Buy* - Coordinated purchases (24h)
🐋 *Whale Moves* - Large transactions (10+ SOL, 2h)
📊 *Volume Surge* - High volume tokens (10+ SOL, 2h)
👥 *Co-buy* - Simultaneous purchases (24h)
🧠 *Smart Money* - Pro trader activity (24h)
🌱 *Fresh Tokens* - New tokens (< 24h)
🏆 *Most Bought* - Top tokens by buyers (24h)
🪙 *Coins* - Market overview with filters
📱 *Recent Activity* - Live BUY/SELL feed

╔═══════════════════════╗
║  💡 *Pro Tips*           ║
╚═══════════════════════╝

• Watch for cluster buys - often signals coordinated entries
• Follow whale moves - they often know something you don't
• Check fresh tokens early - catch gems before they pump
• Monitor smart money - learn from proven traders

━━━━━━━━━━━━━━━━━━━━
Need support? Contact @your_support_bot
━━━━━━━━━━━━━━━━━━━━
    `;
    
    ctx.replyWithMarkdown(helpMessage,
        Markup.inlineKeyboard([
            [Markup.button.webApp('🚀 Launch Mini App', MINI_APP_URL)],
            [Markup.button.callback('📊 About Bot', 'about')]
        ])
    );
});

// Обработчик команды /subscribe
bot.command('subscribe', (ctx) => {
    const subscriptionMessage = `
💎 *Sol Fun Premium Subscription*

╔═══════════════════════╗
║  💰 *Choose Your Plan*  ║
╚═══════════════════════╝

🆓 *FREE Trial*
• Access to 2 tabs (About, Analytics)
• 5-day trial period
• Basic features

💎 *BASIC - ${SUBSCRIPTION_PRICES.basic.sol} SOL (~${SUBSCRIPTION_PRICES.basic.stars} ⭐)*
• Access to ALL tabs
• 50 notifications per day
• Priority support
• Monthly subscription

🚀 *PRO - ${SUBSCRIPTION_PRICES.pro.sol} SOL (~${SUBSCRIPTION_PRICES.pro.stars} ⭐)*
• Access to ALL tabs
• Unlimited notifications
• Early access to new features
• Advanced analytics
• Priority customer support

╔═══════════════════════╗
║  🎯 *Payment Methods*   ║
╚═══════════════════════╝

⭐ *Telegram Stars* (Recommended)
• Instant payment
• No blockchain fees
• Secure and fast

☀️ *Solana (SOL)*
• Direct blockchain payment
• 25% discount with $KOLScan tokens
• Minimum 1000 $KOLScan required

╔═══════════════════════╗
║  🚀 *How to Subscribe*  ║
╚═══════════════════════╝

1️⃣ Launch Mini App below
2️⃣ Choose your preferred plan
3️⃣ Select payment method (Stars or SOL)
4️⃣ Complete payment
5️⃣ Enjoy premium features!

━━━━━━━━━━━━━━━━━━━━
*Start your 5-day FREE trial now!*
━━━━━━━━━━━━━━━━━━━━
    `;
    
    ctx.replyWithMarkdown(subscriptionMessage,
        Markup.inlineKeyboard([
            [Markup.button.webApp('🚀 Launch Mini App', MINI_APP_URL)],
            [Markup.button.callback('💎 Basic - 0.1 SOL', 'subscribe_basic')],
            [Markup.button.callback('🚀 Pro - 0.25 SOL', 'subscribe_pro')],
            [Markup.button.url('💎 View Pricing', `${MINI_APP_URL}#pricing`)]
        ])
    );
});

// Обработчики кнопок подписки
bot.action('subscribe_basic', async (ctx) => {
    const userId = ctx.from.id;
    const userName = ctx.from.first_name || ctx.from.username || 'User';
    
    const paymentMessage = `
💎 *Basic Subscription - 0.1 SOL (~100 ⭐)*

Hey ${userName}! Ready to upgrade to Basic?

╔═══════════════════════╗
║  🎯 *What You Get*      ║
╚═══════════════════════╝

✅ Access to ALL tabs
✅ 50 notifications per day
✅ Priority support
✅ 30 days access

╔═══════════════════════╗
║  💳 *Payment Methods*   ║
╚═══════════════════════╝

⭐ *Telegram Stars* (Recommended)
• Instant payment
• No blockchain fees
• Secure and fast

☀️ *Solana (SOL)*
• Direct blockchain payment
• 25% discount with $KOLScan tokens

━━━━━━━━━━━━━━━━━━━━
*Choose your payment method below:*
━━━━━━━━━━━━━━━━━━━━
    `;
    
    ctx.editMessageText(paymentMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [Markup.button.callback(`⭐ Pay with Stars (${SUBSCRIPTION_PRICES.basic.stars} ⭐)`, 'pay_stars_basic')],
                [Markup.button.callback(`☀️ Pay with SOL (${SUBSCRIPTION_PRICES.basic.sol} SOL)`, 'pay_sol_basic')],
                [Markup.button.callback('🔙 Back to Plans', 'back_to_plans')]
            ]
        }
    });
});

bot.action('subscribe_pro', async (ctx) => {
    const userId = ctx.from.id;
    const userName = ctx.from.first_name || ctx.from.username || 'User';
    
    const paymentMessage = `
🚀 *Pro Subscription - 0.25 SOL (~250 ⭐)*

Hey ${userName}! Ready to upgrade to Pro?

╔═══════════════════════╗
║  🎯 *What You Get*      ║
╚═══════════════════════╝

✅ Access to ALL tabs
✅ Unlimited notifications
✅ Early access to new features
✅ Advanced analytics
✅ Priority customer support
✅ 30 days access

╔═══════════════════════╗
║  💳 *Payment Methods*   ║
╚═══════════════════════╝

⭐ *Telegram Stars* (Recommended)
• Instant payment
• No blockchain fees
• Secure and fast

☀️ *Solana (SOL)*
• Direct blockchain payment
• 25% discount with $KOLScan tokens

━━━━━━━━━━━━━━━━━━━━
*Choose your payment method below:*
━━━━━━━━━━━━━━━━━━━━
    `;
    
    ctx.editMessageText(paymentMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [Markup.button.callback(`⭐ Pay with Stars (${SUBSCRIPTION_PRICES.pro.stars} ⭐)`, 'pay_stars_pro')],
                [Markup.button.callback(`☀️ Pay with SOL (${SUBSCRIPTION_PRICES.pro.sol} SOL)`, 'pay_sol_pro')],
                [Markup.button.callback('🔙 Back to Plans', 'back_to_plans')]
            ]
        }
    });
});

// Обработчики платежей
bot.action('pay_stars_basic', async (ctx) => {
    const userId = ctx.from.id;
    
    try {
        // Send invoice directly in chat (MODAL)
        await ctx.replyWithInvoice({
            title: 'Sol Fun Basic',
            description: 'Basic subscription - 30 days access to all premium features',
            payload: JSON.stringify({ userId, tier: 'basic', timestamp: Date.now() }),
            provider_token: '', // Empty for Stars
            currency: 'XTR', // Telegram Stars
            prices: [{
                label: 'Basic Subscription',
                amount: SUBSCRIPTION_PRICES.basic.stars_cents // 10000 cents = 100 stars
            }],
            need_name: false,
            need_phone_number: false,
            need_email: false,
            need_shipping_address: false,
            is_flexible: false
        });
        
        ctx.answerCbQuery('💳 Invoice sent! Check the message below.');
    } catch (error) {
        console.error('Error sending Stars invoice:', error);
        ctx.answerCbQuery('❌ Payment system temporarily unavailable. Please try again later.');
    }
});

bot.action('pay_stars_pro', async (ctx) => {
    const userId = ctx.from.id;
    
    try {
        // Send invoice directly in chat (MODAL)
        await ctx.replyWithInvoice({
            title: 'Sol Fun Pro',
            description: 'Pro subscription - 30 days access with unlimited features & priority support',
            payload: JSON.stringify({ userId, tier: 'pro', timestamp: Date.now() }),
            provider_token: '', // Empty for Stars
            currency: 'XTR', // Telegram Stars
            prices: [{
                label: 'Pro Subscription',
                amount: SUBSCRIPTION_PRICES.pro.stars_cents // 25000 cents = 250 stars
            }],
            need_name: false,
            need_phone_number: false,
            need_email: false,
            need_shipping_address: false,
            is_flexible: false
        });
        
        ctx.answerCbQuery('💳 Invoice sent! Check the message below.');
    } catch (error) {
        console.error('Error sending Stars invoice:', error);
        ctx.answerCbQuery('❌ Payment system temporarily unavailable. Please try again later.');
    }
});

bot.action('pay_sol_basic', async (ctx) => {
    const userId = ctx.from.id;
    const userName = ctx.from.first_name || ctx.from.username || 'User';
    
    // Ask for wallet address for discount check
    ctx.editMessageText(`
☀️ *Payment with Solana (SOL)*

**Basic Subscription - ${SUBSCRIPTION_PRICES.basic.sol} SOL**

💡 **Get 25% discount with $KOLScan tokens!**

To check for discount, send me your Solana wallet address:
(or click "Skip" to pay full price)

━━━━━━━━━━━━━━━━━━━━
Example: \`BAr5cs...nopQ8f9\`
━━━━━━━━━━━━━━━━━━━━
    `, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [Markup.button.callback('⏩ Skip (No Discount)', 'sol_basic_no_discount')],
                [Markup.button.callback('🔙 Back to Plans', 'back_to_plans')]
            ]
        }
    });
    
    // Store state for next message
    ctx.session = ctx.session || {};
    ctx.session.awaitingWallet = 'basic';
});

bot.action('pay_sol_pro', async (ctx) => {
    const userId = ctx.from.id;
    const userName = ctx.from.first_name || ctx.from.username || 'User';
    
    // Ask for wallet address for discount check
    ctx.editMessageText(`
☀️ *Payment with Solana (SOL)*

**Pro Subscription - ${SUBSCRIPTION_PRICES.pro.sol} SOL**

💡 **Get 25% discount with $KOLScan tokens!**

To check for discount, send me your Solana wallet address:
(or click "Skip" to pay full price)

━━━━━━━━━━━━━━━━━━━━
Example: \`BAr5cs...nopQ8f9\`
━━━━━━━━━━━━━━━━━━━━
    `, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [Markup.button.callback('⏩ Skip (No Discount)', 'sol_pro_no_discount')],
                [Markup.button.callback('🔙 Back to Plans', 'back_to_plans')]
            ]
        }
    });
    
    // Store state for next message
    ctx.session = ctx.session || {};
    ctx.session.awaitingWallet = 'pro';
});

// Handle "Skip Discount" actions
bot.action('sol_basic_no_discount', async (ctx) => {
    await showSolanaPaymentInstructions(ctx, 'basic', null);
});

bot.action('sol_pro_no_discount', async (ctx) => {
    await showSolanaPaymentInstructions(ctx, 'pro', null);
});

// Function to show Solana payment instructions
async function showSolanaPaymentInstructions(ctx, tier, walletAddress, discountedPrice = null) {
    const userId = ctx.from.id;
    const price = SUBSCRIPTION_PRICES[tier].sol;
    
    // Use discounted price if provided, otherwise full price
    const finalPrice = discountedPrice || price;
    const hasDiscount = discountedPrice !== null && discountedPrice < price;
    
    const merchantWallet = 'G1baEgxW9rFLbPr8M6SmAxEbpeLw5Z5j4xyYwt8emTha';
    
    // Create payment intent
    let intentId = null;
    try {
        const response = await fetch(`${process.env.BACKEND_URL || 'https://pump-dex-mini-app.onrender.com'}/api/payment/create-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                subscriptionType: tier,
                expectedAmount: finalPrice, // ✅ ПРАВИЛЬНАЯ ЦЕНА С УЧЁТОМ СКИДКИ!
                fromWallet: walletAddress
            })
        });
        
        const data = await response.json();
        if (data.success) {
            intentId = data.intentId;
            console.log(`✅ Payment intent created: ${intentId} for ${finalPrice} SOL`);
        }
    } catch (error) {
        console.error('Error creating payment intent:', error);
    }
    
    const message = `
💎 *Solana Payment Instructions*

**${tier.toUpperCase()} Subscription**
${hasDiscount ? `~~${price} SOL~~ → **${finalPrice} SOL** (25% discount!)` : `**${finalPrice} SOL**`}

━━━━━━━━━━━━━━━━━━━━
📍 *Send exactly ${finalPrice} SOL to:*

\`${merchantWallet}\`

👆 *Tap to copy address*
━━━━━━━━━━━━━━━━━━━━

📱 *Payment Steps:*
1. Open your Solana wallet (Phantom, Solflare, etc.)
2. Tap the address above to copy
3. Send exactly **${finalPrice} SOL**
4. Wait 30-60 seconds for confirmation
5. Click "Check Payment" button below

⏱ *We'll auto-detect your payment!*

━━━━━━━━━━━━━━━━━━━━
⚠️ Make sure to send the exact amount!
━━━━━━━━━━━━━━━━━━━━
    `;
    
    // Store intent ID in session
    ctx.session = ctx.session || {};
    ctx.session.paymentIntentId = intentId;
    ctx.session.paymentTier = tier;
    
    ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [Markup.button.callback(`✅ Check Payment Status`, `check_payment_${tier}`)],
                [Markup.button.callback('🔙 Back to Plans', 'back_to_plans')]
            ]
        }
    });
}

// Handle payment status check
bot.action(/check_payment_(.+)/, async (ctx) => {
    const tier = ctx.match[1];
    
    ctx.answerCbQuery('⏳ Checking payment status...');
    
    // Get intent ID from session
    const intentId = ctx.session?.paymentIntentId;
    
    if (!intentId) {
        ctx.reply('❌ No payment intent found. Please try again from /subscribe');
        return;
    }
    
    try {
        // Check payment intent status
        const response = await fetch(`${process.env.BACKEND_URL || 'https://pump-dex-mini-app.onrender.com'}/api/payment/check-intent/${intentId}`);
        const data = await response.json();
        
        if (!data.success) {
            ctx.reply('❌ Error checking payment status. Please try again in 1 minute.');
            return;
        }
        
        if (data.status === 'paid') {
            // Payment confirmed!
            ctx.replyWithMarkdown(`
✅ *Payment Confirmed!*

Your *${tier.toUpperCase()}* subscription is now active!

💰 Transaction: \`${data.txSignature}\`
🎉 *Welcome to Premium!*
• Access all tabs
• ${tier === 'pro' ? 'Unlimited' : '50'} notifications
• Priority support
• 30 days access

Launch the Mini App:
            `, Markup.inlineKeyboard([
                [Markup.button.webApp('🚀 Launch Sol Fun', MINI_APP_URL)]
            ]));
            
            // Clear session
            delete ctx.session.paymentIntentId;
            delete ctx.session.paymentTier;
        } else {
            // Still pending
            ctx.replyWithMarkdown(`
⏳ *Payment Not Detected Yet*

Status: ${data.status}

💡 Please make sure:
• You sent the exact amount (${SUBSCRIPTION_PRICES[tier].sol} SOL)
• Transaction is confirmed (wait 30-60 seconds)
• You sent to the correct address

Try checking again in 1 minute...
            `, Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Check Again', `check_payment_${tier}`)],
                [Markup.button.callback('🔙 Back', 'back_to_plans')]
            ]));
        }
    } catch (error) {
        console.error('Error checking payment:', error);
        ctx.reply('❌ Error checking payment. Please try again or contact support.');
    }
});

bot.action('back_to_plans', async (ctx) => {
    // Go back to subscription plans
    ctx.answerCbQuery('Back to subscription plans');
    
    // Show subscription plans again
    const subscriptionMessage = `
💎 *Sol Fun Premium Subscription*

╔═══════════════════════╗
║  💰 *Choose Your Plan*  ║
╚═══════════════════════╝

🆓 *FREE Trial*
• Access to 2 tabs (About, Analytics)
• 5-day trial period
• Basic features

💎 *BASIC - ${SUBSCRIPTION_PRICES.basic.sol} SOL (~${SUBSCRIPTION_PRICES.basic.stars} ⭐)*
• Access to ALL tabs
• 50 notifications per day
• Priority support
• Monthly subscription

🚀 *PRO - ${SUBSCRIPTION_PRICES.pro.sol} SOL (~${SUBSCRIPTION_PRICES.pro.stars} ⭐)*
• Access to ALL tabs
• Unlimited notifications
• Early access to new features
• Advanced analytics
• Priority customer support

╔═══════════════════════╗
║  🎯 *Payment Methods*   ║
╚═══════════════════════╝

⭐ *Telegram Stars* (Recommended)
• Instant payment
• No blockchain fees
• Secure and fast

☀️ *Solana (SOL)*
• Direct blockchain payment
• 25% discount with $KOLScan tokens
• Minimum 1000 $KOLScan required

╔═══════════════════════╗
║  🚀 *How to Subscribe*  ║
╚═══════════════════════╝

1️⃣ Launch Mini App below
2️⃣ Choose your preferred plan
3️⃣ Select payment method (Stars or SOL)
4️⃣ Complete payment
5️⃣ Enjoy premium features!

━━━━━━━━━━━━━━━━━━━━
*Start your 5-day FREE trial now!*
━━━━━━━━━━━━━━━━━━━━
    `;
    
    ctx.editMessageText(subscriptionMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [Markup.button.webApp('🚀 Launch Mini App', MINI_APP_URL)],
                [Markup.button.callback('💎 Basic - 0.1 SOL', 'subscribe_basic')],
                [Markup.button.callback('🚀 Pro - 0.25 SOL', 'subscribe_pro')],
                [Markup.button.url('💎 View Pricing', `${MINI_APP_URL}#pricing`)]
            ]
        }
    });
});

// Обработчик команды /status
bot.command('status', async (ctx) => {
    try {
        // Проверяем доступность Mini App
        const fetch = require('node-fetch');
        const response = await fetch(`${MINI_APP_URL}/api/health`, { timeout: 5000 });
        
        if (response.ok) {
            ctx.replyWithMarkdown(`
✅ *Статус системы - Все работает!*

🌐 Mini App: Онлайн
🔗 API: Доступен
⚡ Последнее обновление: ${new Date().toLocaleString('ru-RU')}

*Быстрый доступ:*
            `, 
            Markup.inlineKeyboard([
                [Markup.button.webApp('🚀 Открыть Mini App', MINI_APP_URL)]
            ]));
        } else {
            throw new Error('API недоступен');
        }
    } catch (error) {
        console.error('Ошибка проверки статуса:', error);
        ctx.replyWithMarkdown(`
⚠️ *Статус системы - Проблемы*

🌐 Mini App: Проверяется...
🔗 API: Недоступен
❗ Ошибка: ${error.message}

Попробуйте позже или обратитесь в поддержку.
        `);
    }
});

// Обработчик команды /about
bot.command('about', (ctx) => {
    const aboutMessage = `
ℹ️ *О Sol Fun Bot*

*Версия:* 1.0.0
*Тип:* Telegram Mini App
*Платформа:* Solana

*Возможности:*
• 🔥 Анализ кластерных покупок
• 🐋 Отслеживание движений китов  
• 📈 Мониторинг всплесков объема
• 👥 Анализ совместных покупок
• 🧠 Трекинг умных денег
• 🌱 Обнаружение новых токенов
• 🏆 Рейтинг лидеров

*Технологии:*
• Node.js + Express (Backend)
• PostgreSQL (База данных)
• Telegram Mini App API
• Vanilla JavaScript (Frontend)

*Создано для трейдеров Solana* 🚀

GitHub: github.com/your-repo
    `;
    
    ctx.replyWithMarkdown(aboutMessage,
        Markup.inlineKeyboard([
            [Markup.button.webApp('🚀 Запустить Mini App', MINI_APP_URL)]
        ])
    );
});

// Обработчик неизвестных команд
bot.on('text', async (ctx) => {
    const message = ctx.message.text;
    const userId = ctx.from.id;
    
    if (message.startsWith('/')) {
        ctx.reply('❓ Неизвестная команда. Используйте /help для получения списка доступных команд.');
        return;
    }
    
    
    // Check if waiting for wallet address
    if (ctx.session && ctx.session.awaitingWallet) {
        const tier = ctx.session.awaitingWallet;
        const walletAddress = message.trim();
        
        // Validate wallet address format (basic check)
        if (walletAddress.length < 32 || walletAddress.length > 44) {
            ctx.reply('❌ Invalid Solana wallet address. Please try again or skip discount.');
            return;
        }
        
        ctx.reply('⏳ Checking KOLScan balance...');
        
        try {
            // Check KOLScan balance
            const response = await fetch(`${process.env.BACKEND_URL || 'https://pump-dex-mini-app.onrender.com'}/api/kolscan/balance/${walletAddress}`);
            const data = await response.json();
            
            if (data.success && data.hasMinimumHold) {
                // Has discount!
                const price = SUBSCRIPTION_PRICES[tier].sol;
                const discountedPrice = parseFloat((price * 0.75).toFixed(4));
                
                ctx.reply(`🎉 Discount applied! You hold ${data.balance} $KOLScan tokens.\n\nYour price: ${discountedPrice} SOL (25% off!)`);
                
                await showSolanaPaymentInstructions(ctx, tier, walletAddress, discountedPrice);
            } else {
                ctx.reply(`ℹ️ No discount available. You need at least 1000 $KOLScan tokens.\n\nContinuing with regular price...`);
                
                await showSolanaPaymentInstructions(ctx, tier, null, null);
            }
            
            // Clear session
            delete ctx.session.awaitingWallet;
        } catch (error) {
            console.error('Error checking KOLScan balance:', error);
            ctx.reply('❌ Error checking balance. Continuing with regular price...');
            
            await showSolanaPaymentInstructions(ctx, tier, null);
            delete ctx.session.awaitingWallet;
        }
        
        return;
    }
    
    // Default response
    ctx.replyWithMarkdown(
        `👋 Hi! I'm Sol Fun - your Smart Money tracker for Solana.\n\n🚀 Open the Mini App to start:`,
        Markup.inlineKeyboard([
            [Markup.button.webApp('🚀 Open Mini App', MINI_APP_URL)]
        ])
    );
});

// Обработчик inline-запросов (если нужно)
bot.on('inline_query', (ctx) => {
    const query = ctx.inlineQuery.query;
    
    const results = [
        {
            type: 'article',
            id: '1',
            title: '🚀 Sol Fun Bot Mini App',
            description: 'Анализ торговли токенами на Solana',
            input_message_content: {
                message_text: `🤖 *Sol Fun Bot*\n\nАнализ торговли токенами на Solana в режиме реального времени!\n\n🔥 Cluster Buy | 🐋 Whale Moves | 📈 Volume Surge`,
                parse_mode: 'Markdown'
            },
            reply_markup: {
                inline_keyboard: [[
                    { text: '🚀 Запустить Mini App', web_app: { url: MINI_APP_URL } }
                ]]
            }
        }
    ];
    
    ctx.answerInlineQuery(results);
});

// Обработчик успешных платежей
bot.on('pre_checkout_query', async (ctx) => {
    console.log('💰 Pre-checkout query received:', ctx.preCheckoutQuery);
    
    // Always approve the payment
    await ctx.answerPreCheckoutQuery(true);
});

// Handle all messages to catch successful payments
bot.on('message', async (ctx) => {
    if (ctx.message.successful_payment) {
        console.log('🎉 MESSAGE WITH SUCCESSFUL PAYMENT DETECTED!');
        return handleSuccessfulPayment(ctx);
    }
});

// Handle successful payment
async function handleSuccessfulPayment(ctx) {
    console.log('🎉 SUCCESSFUL PAYMENT WEBHOOK TRIGGERED!');
    const payment = ctx.message.successful_payment;
    const user = ctx.from;
    
    console.log('✅ Successful payment received:', {
        userId: user.id,
        username: user.username,
        amount: payment.total_amount,
        currency: payment.currency,
        payload: payment.invoice_payload
    });
    
    // Parse subscription type from payload (JSON or legacy string)
    let subscriptionType = 'basic';
    let payloadData = null;
    
    try {
        // Try to parse JSON payload
        payloadData = JSON.parse(payment.invoice_payload);
        subscriptionType = payloadData.tier || 'basic';
        console.log('📦 Parsed JSON payload:', payloadData);
    } catch (e) {
        // Legacy string payload format
        const payload = payment.invoice_payload;
        if (payload.includes('pro_')) {
            subscriptionType = 'pro';
        } else if (payload.includes('basic_')) {
            subscriptionType = 'basic';
        }
        console.log('📦 Legacy payload format:', payload);
    }
    
    // Send confirmation message
    const confirmationMessage = `
🎉 *Payment Successful!*

✅ **Subscription Activated: ${subscriptionType.toUpperCase()}**

╔═══════════════════════╗
║  🎯 *What's Next*       ║
╚═══════════════════════╝

🚀 Launch Mini App to access all features
📱 You now have full access to all tabs
🔔 Notifications are now active
⏰ Subscription expires in 30 days

━━━━━━━━━━━━━━━━━━━━
*Thank you for subscribing!*
━━━━━━━━━━━━━━━━━━━━
    `;
    
    ctx.replyWithMarkdown(confirmationMessage, 
        Markup.inlineKeyboard([
            [Markup.button.webApp('🚀 Launch Mini App', MINI_APP_URL)],
            [Markup.button.callback('📊 Check Status', 'check_subscription_status')]
        ])
    );
    
    // Update user subscription in database
    console.log('🔄 Starting database update...');
    try {
        if (globalPool) {
            console.log('📊 Using global database connection from server...');
            
            console.log('🔧 Initializing subscription system...');
            const SubscriptionSystem = require('./subscriptionSystem.js');
            const subscriptionSystem = new SubscriptionSystem(globalPool);
            
            // Create subscription record with fallback tier
            console.log('💾 Creating subscription record...');
            const subscription = await subscriptionSystem.createSubscription(
                user.id,           // userId
                subscriptionType,  // tierName
                'telegram_stars',  // paymentMethod
                null,              // transactionHash
                false,             // kolscanDiscount
                payment.total_amount // starsAmount
            );
            
            console.log(`✅ User ${user.id} subscribed to ${subscriptionType} plan - DB updated successfully!`);
            console.log('📋 Subscription record:', subscription);
        } else {
            console.log('⚠️ No global pool available, using fallback...');
            throw new Error('No global pool available');
        }
    } catch (error) {
        console.error('❌ Error updating subscription in database:', error);
        console.error('❌ Error details:', error.message);
        console.error('❌ Error stack:', error.stack);
        
        // Fallback: try to update user table directly
        console.log('🔄 Trying fallback database update...');
        try {
            const { Pool } = require('pg');
            const fallbackPool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
                max: 1,
                idleTimeoutMillis: 10000,
                connectionTimeoutMillis: 5000
            });
            
            // Direct update to users table
            await fallbackPool.query(`
                UPDATE users 
                SET subscription_type = $1, subscription_expires_at = NOW() + INTERVAL '30 days'
                WHERE telegram_user_id = $2
            `, [subscriptionType, user.id]);
            
            console.log(`✅ Fallback: User ${user.id} updated to ${subscriptionType} plan`);
            await fallbackPool.end();
        } catch (fallbackError) {
            console.error('❌ Fallback update also failed:', fallbackError.message);
        }
    }
}

// Keep the old handler as backup
bot.on('successful_payment', handleSuccessfulPayment);

// Обработчик проверки статуса подписки
bot.action('check_subscription_status', async (ctx) => {
    const userId = ctx.from.id;
    const userName = ctx.from.first_name || ctx.from.username || 'User';
    
    const statusMessage = `
📊 *Subscription Status*

👤 **User:** ${userName}
🆔 **ID:** ${userId}

╔═══════════════════════╗
║  📈 *Current Status*    ║
╚═══════════════════════╝

✅ **Active Subscription**
🚀 **Plan:** PRO
⏰ **Expires:** 30 days from now
🔔 **Notifications:** Unlimited
📱 **Access:** All tabs unlocked

╔═══════════════════════╗
║  🎯 *Quick Actions*     ║
╚═══════════════════════╝

🚀 Launch Mini App
📊 View Analytics
🔔 Manage Notifications

━━━━━━━━━━━━━━━━━━━━
*Need help? Contact support*
━━━━━━━━━━━━━━━━━━━━
    `;
    
    ctx.editMessageText(statusMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [Markup.button.webApp('🚀 Launch Mini App', MINI_APP_URL)],
                [Markup.button.callback('📊 View Analytics', 'view_analytics')],
                [Markup.button.callback('🔙 Back to Plans', 'back_to_plans')]
            ]
        }
    });
});

// Обработчик просмотра аналитики
bot.action('view_analytics', async (ctx) => {
    ctx.answerCbQuery('Opening analytics...');
    
    const analyticsMessage = `
📊 *Analytics Dashboard*

╔═══════════════════════╗
║  📈 *Your Performance*  ║
╚═══════════════════════╝

🎯 **Trades Tracked:** 1,247
📈 **Success Rate:** 73.2%
💰 **Total Volume:** $45,230
🏆 **Best Trade:** +$2,340
📱 **Active Alerts:** 12

╔═══════════════════════╗
║  🔔 *Recent Activity*   ║
╚═══════════════════════╝

• 🟢 BOUGHT $PEPE - 2.3 SOL
• 🔴 SOLD $DOGE - 1.8 SOL  
• 🟢 BOUGHT $SHIB - 0.9 SOL
• 🔴 SOLD $BONK - 3.1 SOL

━━━━━━━━━━━━━━━━━━━━
*Launch Mini App for detailed analytics*
━━━━━━━━━━━━━━━━━━━━
    `;
    
    ctx.editMessageText(analyticsMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [Markup.button.webApp('🚀 Launch Mini App', MINI_APP_URL)],
                [Markup.button.callback('🔙 Back to Status', 'check_subscription_status')]
            ]
        }
    });
});

// Обработчик ошибок
bot.catch((err, ctx) => {
    console.error('❌ Ошибка бота:', err);
    
    if (ctx && ctx.reply) {
        ctx.reply('😔 Произошла ошибка. Попробуйте позже или обратитесь в поддержку.');
    }
});

// Обработка graceful shutdown
process.once('SIGINT', () => {
    console.log('\n🛑 Получен сигнал SIGINT, завершение работы бота...');
    bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
    console.log('\n🛑 Получен сигнал SIGTERM, завершение работы бота...');
    bot.stop('SIGTERM');
});

// Global pool variable
let globalPool = null;

// Запуск бота
async function startBot(pool = null) {
    try {
        console.log('🤖 Запуск Sol Fun Bot...');
        console.log(`🔗 Mini App URL: ${MINI_APP_URL}`);
        
        // Store pool globally for use in payment handlers
        globalPool = pool;
        if (pool) {
            console.log('📊 Database pool connected to bot');
        }
        
        // Set bot commands
        await bot.telegram.setMyCommands([
            { command: 'start', description: '🚀 Launch Sol Fun Mini App' },
            { command: 'subscribe', description: '💎 View subscription plans & pricing' },
            { command: 'help', description: '❓ Get help and support' },
            { command: 'about', description: 'ℹ️ About Sol Fun - Smart Money tracker' }
        ]);
        console.log('✅ Bot commands set');
        
        // Получаем информацию о боте
        const botInfo = await bot.telegram.getMe();
        console.log(`👤 Бот запущен: @${botInfo.username} (${botInfo.first_name})`);
        console.log(`🆔 Bot ID: ${botInfo.id}`);
        
        // Запускаем бота
        await bot.launch();
        
        console.log('✅ Sol Fun Bot успешно запущен!');
        console.log('📱 Пользователи могут использовать команду /start для доступа к Mini App');
        
    } catch (error) {
        if (error.message.includes('409') || error.message.includes('Conflict')) {
            console.log('⚠️ Telegram Bot already running on another instance');
            console.log('   This is normal for multiple deployments');
            return; // Don't exit for conflict
        }
        
        console.error('❌ Ошибка при запуске бота:', error.message);
        
        if (error.code === 401) {
            console.error('   Проверьте корректность BOT_TOKEN');
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            console.error('   Проверьте подключение к интернету');
        }
        
        process.exit(1);
    }
}

// Экспорт для использования в других файлах (опционально)
module.exports = { bot, startBot };

// Запуск бота, если файл запускается напрямую
if (require.main === module) {
    startBot();
}