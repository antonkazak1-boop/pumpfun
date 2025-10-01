const { Telegraf, Markup } = require('telegraf');

// Конфигурация бота
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const MINI_APP_URL = process.env.MINI_APP_URL || 'YOUR_MINI_APP_HTTPS_URL';

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
🤖 *Добро пожаловать в Pump Dex Bot!*

Привет, ${userName}! 

Этот бот предоставляет вам доступ к мощному Mini App для анализа торговли токенами на Solana:

🔥 *Cluster Buy* - токены с групповыми покупками
🐋 *Whale Moves* - крупные движения китов
📈 *Volume Surge* - всплески торгового объема  
👥 *Co-buy Analysis* - анализ совместных покупок
🧠 *Smart Money* - активность опытных трейдеров
🌱 *Fresh Tokens* - новые токены с активностью
🏆 *Top Gainers* - лидеры по объему торгов

Нажмите кнопку ниже, чтобы запустить приложение! 👇
    `;
    
    ctx.replyWithMarkdown(welcomeMessage, 
        Markup.inlineKeyboard([
            [Markup.button.webApp('🚀 Запустить Mini App', MINI_APP_URL)]
        ])
    );
});

// Обработчик команды /help
bot.help((ctx) => {
    const helpMessage = `
📖 *Помощь - Pump Dex Bot*

*Команды бота:*
• /start - запустить бота и получить доступ к Mini App
• /help - показать эту справку
• /status - проверить статус Mini App
• /about - информация о боте

*О Mini App:*
Pump Dex Bot Mini App - это современное веб-приложение для анализа торговли токенами на блокчейне Solana. Приложение предоставляет:

🔍 *Реальное время* - данные обновляются каждые 30 секунд
📊 *7 типов анализа* - от кластерных покупок до движений китов
🎯 *Точные фильтры* - настраиваемые временные интервалы
🔗 *Интеграция* - прямые ссылки на Pump.fun и DexScreener

*Поддержка:* @your_support_username
    `;
    
    ctx.replyWithMarkdown(helpMessage);
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