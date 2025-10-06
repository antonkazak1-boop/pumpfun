# 🤖 Update Bot Token to Test Bot

## Current Issue
- Bot is using production token
- Need to switch to test bot: @BetAIAGENT_BOT

## Steps to Update

### 1. Get Test Bot Token
- Go to @BotFather
- Create new bot or use existing @BetAIAGENT_BOT
- Get the token

### 2. Update Render Environment Variables
1. Go to Render Dashboard
2. Select your service
3. Go to Environment tab
4. Update `BOT_TOKEN` with new test bot token
5. Save and redeploy

### 3. Update Mini App URL in Bot
- In BotFather, set Mini App URL to: `https://pumpfun-u7av.onrender.com`

### 4. Test Payment Flow
- Basic: 100 ⭐ (0.1 SOL)
- Pro: 250 ⭐ (0.25 SOL)

## Who Receives Stars?
- Stars go to the bot owner (whoever created the bot)
- In this case: the test bot owner
- Stars are automatically credited to bot's balance

## Current Bot Commands
- `/start` - Welcome message with subscription plans
- `/subscribe` - Show subscription options
- `/help` - Help information
- Payment callbacks: `pay_stars_basic`, `pay_stars_pro`

## Payment Flow
1. User clicks "Pay with Stars" in Mini App
2. Opens bot chat with payment link
3. Bot creates invoice for correct amount
4. User pays with Stars
5. Bot receives payment and activates subscription
