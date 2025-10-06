const { Telegraf, Markup } = require('telegraf');

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

// Обработчик команды /start
bot.start((ctx) => {
    const user = ctx.from;
    const userName = user.first_name || user.username || 'Пользователь';
    
    console.log(`👋 Новый пользователь: ${userName} (ID: ${user.id})`);
    
    const welcomeMessage = `
🚀 *Welcome to Pump Dex Bot!*

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

💎 *BASIC - 0.1 SOL (~100 ⭐)*
• Access to ALL tabs
• 50 notifications per day
• Priority support

🚀 *PRO - 0.25 SOL (~250 ⭐)*
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
            [Markup.button.webApp('🚀 Launch Mini App', MINI_APP_URL)],
            [Markup.button.url('📊 View Web Version', MINI_APP_URL)]
        ])
    );
});

// Обработчик команды /about
bot.command('about', (ctx) => {
    const aboutMessage = `
📖 *About Pump Dex Bot*

╔═══════════════════════╗
║  💡 *Our Mission*        ║
╚═══════════════════════╝

We believe that everyone should have access to the same trading insights as professional traders. That's why we built Pump Dex Bot - to democratize smart money tracking on Solana.

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
📖 *Pump Dex Bot - Help*

╔═══════════════════════╗
║  🤖 *Bot Commands*       ║
╚═══════════════════════╝

/start - Launch the bot and access Mini App
/about - Learn about Pump Dex Bot
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
💎 *Pump Dex Premium Subscription*

╔═══════════════════════╗
║  💰 *Choose Your Plan*  ║
╚═══════════════════════╝

🆓 *FREE Trial*
• Access to 2 tabs (About, Analytics)
• 5-day trial period
• Basic features

💎 *BASIC - 0.1 SOL (~100 ⭐)*
• Access to ALL tabs
• 50 notifications per day
• Priority support
• Monthly subscription

🚀 *PRO - 0.25 SOL (~250 ⭐)*
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
            [Markup.button.url('💎 View Pricing', `${MINI_APP_URL}#pricing`)]
        ])
    );
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
ℹ️ *О Pump Dex Bot*

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
bot.on('text', (ctx) => {
    const message = ctx.message.text;
    
    if (message.startsWith('/')) {
        ctx.reply('❓ Неизвестная команда. Используйте /help для получения списка доступных команд.');
        return;
    }
    
    // Обработка обычных сообщений
    ctx.replyWithMarkdown(
        `Привет! Я бот для анализа торговли на Solana.\n\nДля работы используйте Mini App:`,
        Markup.inlineKeyboard([
            [Markup.button.webApp('🚀 Открыть Mini App', MINI_APP_URL)]
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
            title: '🚀 Pump Dex Bot Mini App',
            description: 'Анализ торговли токенами на Solana',
            input_message_content: {
                message_text: `🤖 *Pump Dex Bot*\n\nАнализ торговли токенами на Solana в режиме реального времени!\n\n🔥 Cluster Buy | 🐋 Whale Moves | 📈 Volume Surge`,
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

// Запуск бота
async function startBot() {
    try {
        console.log('🤖 Запуск Pump Dex Bot...');
        console.log(`🔗 Mini App URL: ${MINI_APP_URL}`);
        
        // Получаем информацию о боте
        const botInfo = await bot.telegram.getMe();
        console.log(`👤 Бот запущен: @${botInfo.username} (${botInfo.first_name})`);
        console.log(`🆔 Bot ID: ${botInfo.id}`);
        
        // Запускаем бота
        await bot.launch();
        
        console.log('✅ Pump Dex Bot успешно запущен!');
        console.log('📱 Пользователи могут использовать команду /start для доступа к Mini App');
        
    } catch (error) {
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