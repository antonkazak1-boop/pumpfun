// Telegram Payment Integration for Pump Dex Mini App
const axios = require('axios');

class TelegramPayment {
    constructor() {
        this.BOT_TOKEN = process.env.BOT_TOKEN;
        this.API_BASE = 'https://api.telegram.org/bot';
    }

    // Initialize Telegram Web App
    initTelegramWebApp() {
        if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            
            // Expand the app
            tg.expand();
            
            // Enable closing confirmation
            tg.enableClosingConfirmation();
            
            // Get user data
            const user = tg.initDataUnsafe?.user;
            if (user) {
                console.log('Telegram user data:', user);
                return {
                    user: user,
                    themeParams: tg.themeParams,
                    platform: tg.platform,
                    version: tg.version
                };
            }
        }
        
        // Fallback for testing
        return {
            user: {
                id: 123456789,
                username: 'testuser',
                first_name: 'Test',
                last_name: 'User'
            },
            themeParams: {},
            platform: 'unknown',
            version: '6.0'
        };
    }

    // Create Telegram Stars payment invoice
    async createStarsInvoice(userId, amount, description, payload = '') {
        try {
            const response = await axios.post(`${this.API_BASE}${this.BOT_TOKEN}/createInvoiceLink`, {
                title: 'Pump Dex Premium Subscription',
                description: description,
                payload: payload,
                provider_token: '', // Empty for Stars
                currency: 'XTR', // Telegram Stars currency
                prices: [{
                    label: 'Premium Subscription',
                    amount: amount * 100 // Amount in cents
                }],
                max_tip_amount: 0,
                suggested_tip_amounts: [],
                provider_data: JSON.stringify({
                    user_id: userId,
                    subscription_type: payload
                }),
                photo_url: '',
                photo_size: 0,
                photo_width: 0,
                photo_height: 0,
                need_name: false,
                need_phone_number: false,
                need_email: false,
                need_shipping_address: false,
                send_phone_number_to_provider: false,
                send_email_to_provider: false,
                is_flexible: false
            });

            if (response.data.ok) {
                return {
                    success: true,
                    invoice_url: response.data.result
                };
            } else {
                throw new Error(response.data.description || 'Failed to create invoice');
            }
        } catch (error) {
            console.error('Error creating Stars invoice:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Send invoice to user
    async sendInvoiceToUser(userId, invoiceUrl, subscriptionType) {
        try {
            const message = this.getSubscriptionMessage(subscriptionType);
            
            const response = await axios.post(`${this.API_BASE}${this.BOT_TOKEN}/sendMessage`, {
                chat_id: userId,
                text: message,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: '💎 Subscribe Now',
                            url: invoiceUrl
                        }
                    ]]
                }
            });

            return response.data.ok;
        } catch (error) {
            console.error('Error sending invoice to user:', error);
            return false;
        }
    }

    // Get subscription message based on type
    getSubscriptionMessage(subscriptionType) {
        const messages = {
            basic: `🎯 **Basic Subscription** - 0.5 SOL (500 ⭐)
            
✅ **Features:**
• Fresh Tokens (5m)
• Most Bought Tokens (1h)
• 30 days access

🔥 Get 25% off with $KOLScan tokens!`,
            
            pro: `🚀 **Pro Subscription** - 1.0 SOL (1000 ⭐)
            
✅ **Features:**
• All tabs access
• Priority support
• Advanced analytics
• 30 days access

🔥 Get 25% off with $KOLScan tokens!`,
            
            premium: `💎 **Premium Subscription** - 2.0 SOL (2000 ⭐)
            
✅ **Features:**
• All tabs access
• Priority support
• Advanced analytics
• Early access to new features
• Exclusive whale alerts
• 30 days access

🔥 Get 25% off with $KOLScan tokens!`
        };

        return messages[subscriptionType] || messages.pro;
    }

    // Handle successful payment
    async handleSuccessfulPayment(paymentData) {
        try {
            console.log('Payment successful:', paymentData);
            
            // Extract data from payment
            const { 
                telegram_payment_charge_id, 
                provider_payment_charge_id, 
                currency, 
                total_amount, 
                invoice_payload 
            } = paymentData;
            
            // Parse payload to get subscription type
            const subscriptionType = invoice_payload || 'pro';
            
            return {
                success: true,
                subscriptionType: subscriptionType,
                amount: total_amount,
                currency: currency,
                transactionId: telegram_payment_charge_id,
                providerTransactionId: provider_payment_charge_id
            };
        } catch (error) {
            console.error('Error handling successful payment:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Check user's KOLScan token balance
    async checkKolscanBalance(walletAddress) {
        try {
            // TODO: Implement actual Solana RPC call to check token balance
            // For now, return mock data
            const mockBalance = Math.random() * 5000; // Random balance for testing
            
            return {
                success: true,
                balance: mockBalance,
                hasMinimumHold: mockBalance >= 1000,
                tokenAddress: 'KOLScan_Token_Address_Here' // Replace with actual token address
            };
        } catch (error) {
            console.error('Error checking KOLScan balance:', error);
            return {
                success: false,
                balance: 0,
                hasMinimumHold: false,
                error: error.message
            };
        }
    }

    // Send subscription confirmation message
    async sendSubscriptionConfirmation(userId, subscriptionType, expiresAt) {
        try {
            const message = `🎉 **Subscription Activated!**

✅ **Plan:** ${subscriptionType.charAt(0).toUpperCase() + subscriptionType.slice(1)}
📅 **Expires:** ${new Date(expiresAt).toLocaleDateString()}

🚀 You now have full access to all Pump Dex features!

Thank you for subscribing! 💎`;

            const response = await axios.post(`${this.API_BASE}${this.BOT_TOKEN}/sendMessage`, {
                chat_id: userId,
                text: message,
                parse_mode: 'Markdown'
            });

            return response.data.ok;
        } catch (error) {
            console.error('Error sending subscription confirmation:', error);
            return false;
        }
    }

    // Send trial expiration warning
    async sendTrialExpirationWarning(userId, daysLeft) {
        try {
            const message = `⚠️ **Trial Ending Soon**

Your 5-day free trial expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}.

🔥 **Upgrade now and get 25% off with $KOLScan tokens!**

Choose your plan:
• Basic - 0.5 SOL (500 ⭐)
• Pro - 1.0 SOL (1000 ⭐) 
• Premium - 2.0 SOL (2000 ⭐)`;

            const response = await axios.post(`${this.API_BASE}${this.BOT_TOKEN}/sendMessage`, {
                chat_id: userId,
                text: message,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: '💎 Upgrade Now',
                            callback_data: 'upgrade_subscription'
                        }
                    ]]
                }
            });

            return response.data.ok;
        } catch (error) {
            console.error('Error sending trial expiration warning:', error);
            return false;
        }
    }

    // Get payment methods available
    getAvailablePaymentMethods() {
        return [
            {
                id: 'telegram_stars',
                name: 'Telegram Stars',
                icon: '⭐',
                description: 'Pay with Telegram Stars',
                enabled: true
            },
            {
                id: 'solana',
                name: 'Solana (SOL)',
                icon: '☀️',
                description: 'Pay with SOL tokens',
                enabled: true
            },
            {
                id: 'usdc',
                name: 'USDC',
                icon: '💵',
                description: 'Pay with USDC tokens',
                enabled: true
            }
        ];
    }
}

module.exports = TelegramPayment;
