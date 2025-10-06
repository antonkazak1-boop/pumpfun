// Subscription System for Pump Dex Mini App
const { Pool } = require('pg');

// Database tables for subscription system
const SUBSCRIPTION_TABLES = {
    // Users table
    users: `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            telegram_user_id BIGINT UNIQUE,
            username VARCHAR(255),
            first_name VARCHAR(255),
            last_name VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            trial_started_at TIMESTAMP,
            trial_used BOOLEAN DEFAULT FALSE,
            subscription_type VARCHAR(50) DEFAULT 'trial',
            subscription_expires_at TIMESTAMP,
            total_spent_sol DECIMAL(20, 8) DEFAULT 0,
            kolscan_balance DECIMAL(20, 8) DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE
        )
    `,
    
    // Subscriptions table
    subscriptions: `
        CREATE TABLE IF NOT EXISTS subscriptions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            subscription_type VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'active',
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            price_sol DECIMAL(20, 8) NOT NULL,
            price_stars INTEGER,
            payment_method VARCHAR(50),
            transaction_hash VARCHAR(255),
            kolscan_discount_applied BOOLEAN DEFAULT FALSE,
            discount_percentage INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `,
    
    // Payment transactions table
    payments: `
        CREATE TABLE IF NOT EXISTS payments (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            subscription_id INTEGER,
            amount_sol DECIMAL(20, 8),
            amount_stars INTEGER,
            payment_method VARCHAR(50) NOT NULL,
            transaction_hash VARCHAR(255),
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            confirmed_at TIMESTAMP
        )
    `,
    
    // Subscription tiers table
    subscription_tiers: `
        CREATE TABLE IF NOT EXISTS subscription_tiers (
            id SERIAL PRIMARY KEY,
            tier_name VARCHAR(50) UNIQUE NOT NULL,
            price_sol DECIMAL(20, 8) NOT NULL,
            price_stars INTEGER NOT NULL,
            duration_days INTEGER NOT NULL,
            max_tabs INTEGER,
            features TEXT[],
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `,
    
    // KOLScan settings table
    kolscan_settings: `
        CREATE TABLE IF NOT EXISTS kolscan_settings (
            id SERIAL PRIMARY KEY,
            discount_percentage INTEGER DEFAULT 25,
            min_hold_amount DECIMAL(20, 8) DEFAULT 1000,
            token_address VARCHAR(255) DEFAULT '',
            is_active BOOLEAN DEFAULT TRUE,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `
};

// Subscription tiers configuration
const DEFAULT_TIERS = [
    {
        tier_name: 'free',
        price_sol: 0,
        price_stars: 0,
        duration_days: 5,
        max_tabs: 2,
        features: ['About', 'Analytics', '5-day trial']
    },
    {
        tier_name: 'basic',
        price_sol: 0.1,
        price_stars: 100,
        duration_days: 30,
        max_tabs: null, // unlimited
        features: ['All tabs', '50 notifications/day', 'Priority support']
    },
    {
        tier_name: 'pro',
        price_sol: 0.25,
        price_stars: 250,
        duration_days: 30,
        max_tabs: null, // unlimited
        features: ['All tabs', 'Unlimited notifications', 'Early access', 'Advanced analytics', 'Priority support']
    }
];

class SubscriptionSystem {
    constructor(pool) {
        this.pool = pool;
        this.TRIAL_DURATION_DAYS = 5;
        this.DEFAULT_TABS = ['about', 'analytics']; // Free tabs
    }

    // Initialize subscription system
    async initialize() {
        try {
            console.log('🔧 Initializing subscription system...');
            
            // Create tables with error handling
            for (const [tableName, query] of Object.entries(SUBSCRIPTION_TABLES)) {
                try {
                    await this.pool.query(query);
                    console.log(`✅ Created table: ${tableName}`);
                } catch (tableError) {
                    if (tableError.code === '42P07') {
                        console.log(`ℹ️ Table ${tableName} already exists`);
                    } else {
                        console.error(`❌ Error creating table ${tableName}:`, tableError.message);
                        throw tableError;
                    }
                }
            }
            
            // Insert default tiers
            await this.insertDefaultTiers();
            
            // Insert default KOLScan settings
            await this.insertDefaultKolscanSettings();
            
            console.log('✅ Subscription system initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize subscription system:', error.message);
            console.log('⚠️ Subscription system will work in fallback mode');
            return false;
        }
    }

    // Insert default subscription tiers
    async insertDefaultTiers() {
        try {
            for (const tier of DEFAULT_TIERS) {
                try {
                    const existing = await this.pool.query(
                        'SELECT id FROM subscription_tiers WHERE tier_name = $1',
                        [tier.tier_name]
                    );
                    
                    if (existing.rows.length === 0) {
                        await this.pool.query(`
                            INSERT INTO subscription_tiers (tier_name, price_sol, price_stars, duration_days, max_tabs, features)
                            VALUES ($1, $2, $3, $4, $5, $6)
                        `, [tier.tier_name, tier.price_sol, tier.price_stars, tier.duration_days, tier.max_tabs, tier.features]);
                    }
                } catch (tierError) {
                    console.error(`Error inserting tier ${tier.tier_name}:`, tierError.message);
                }
            }
            console.log('✅ Default subscription tiers processed');
        } catch (error) {
            console.error('Error processing default tiers:', error.message);
        }
    }

    // Insert default KOLScan settings
    async insertDefaultKolscanSettings() {
        try {
            const existing = await this.pool.query('SELECT id FROM kolscan_settings LIMIT 1');
            
            if (existing.rows.length === 0) {
                await this.pool.query(`
                    INSERT INTO kolscan_settings (discount_percentage, min_hold_amount, token_address)
                    VALUES ($1, $2, $3)
                `, [25, 1000, '']);
            }
            console.log('✅ Default KOLScan settings inserted');
        } catch (error) {
            console.error('Error inserting default KOLScan settings:', error.message);
        }
    }

    // Get or create user
    async getOrCreateUser(telegramData) {
        try {
            const { id, username, first_name, last_name } = telegramData;
            
            // Check if user exists
            const existing = await this.pool.query(
                'SELECT * FROM users WHERE telegram_user_id = $1',
                [id]
            );
            
            if (existing.rows.length > 0) {
                // Update last active
                await this.pool.query(
                    'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE telegram_user_id = $1',
                    [id]
                );
                return existing.rows[0];
            }
            
            // Create new user
            const result = await this.pool.query(`
                INSERT INTO users (telegram_user_id, username, first_name, last_name, trial_started_at)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                RETURNING *
            `, [id, username, first_name, last_name]);
            
            console.log(`✅ New user created: ${username || first_name}`);
            return result.rows[0];
        } catch (error) {
            console.error('Error getting/creating user:', error);
            throw error;
        }
    }

    // Check user access to specific tab
    async checkTabAccess(userId, tabName) {
        try {
            // Free tabs - always allow
            if (this.DEFAULT_TABS.includes(tabName)) {
                return true;
            }
            
            // If subscription system is not available, allow access (fallback mode)
            if (!this.pool) {
                console.log('⚠️ Subscription system not available - allowing access');
                return true;
            }
            
            const user = await this.getUserById(userId);
            if (!user) return true; // Allow access if user not found
            
            // Check subscription status
            const hasActiveSubscription = await this.hasActiveSubscription(userId);
            if (!hasActiveSubscription) {
                // Check if trial is still valid
                if (!user.trial_used && user.trial_started_at) {
                    const trialEnd = new Date(user.trial_started_at);
                    trialEnd.setDate(trialEnd.getDate() + this.TRIAL_DURATION_DAYS);
                    
                    if (new Date() < trialEnd) {
                        return true; // Trial is still active
                    }
                }
                return false;
            }
            
            // Check tier restrictions
            const subscription = await this.getActiveSubscription(userId);
            if (subscription) {
                const tier = await this.getSubscriptionTier(subscription.subscription_type);
                if (tier && tier.max_tabs) {
                    // TODO: Implement tab counting logic
                    return true; // For now, allow all tabs for paid users
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error checking tab access:', error.message);
            return true; // Allow access on error (fallback mode)
        }
    }

    // Get user by ID (auto-create if not exists)
    async getUserById(userId) {
        try {
            if (!this.pool) return null;
            
            const result = await this.pool.query(
                'SELECT * FROM users WHERE id = $1 OR telegram_user_id = $1',
                [userId]
            );
            
            if (result.rows.length > 0) {
                return result.rows[0];
            }
            
            // Auto-create user if not exists (for Telegram users)
            console.log(`🆕 Auto-creating user ${userId}`);
            const createResult = await this.pool.query(`
                INSERT INTO users (telegram_user_id, trial_started_at, subscription_type, created_at, last_active)
                VALUES ($1, CURRENT_TIMESTAMP, 'trial', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING *
            `, [userId]);
            
            console.log(`✅ Auto-created user ${userId}`);
            return createResult.rows[0];
        } catch (error) {
            console.error('Error getting/creating user by ID:', error.message);
            return null;
        }
    }

    // Check if user has active subscription
    async hasActiveSubscription(userId) {
        try {
            if (!this.pool) return false;
            
            const result = await this.pool.query(`
                SELECT s.* FROM subscriptions s
                JOIN users u ON s.user_id = u.telegram_user_id
                WHERE u.telegram_user_id = $1
                AND s.status = 'active'
                AND s.expires_at > CURRENT_TIMESTAMP
                ORDER BY s.expires_at DESC
                LIMIT 1
            `, [userId]);
            
            return result.rows.length > 0;
        } catch (error) {
            console.error('Error checking active subscription:', error.message);
            return false;
        }
    }

    // Get active subscription
    async getActiveSubscription(userId) {
        try {
            const result = await this.pool.query(`
                SELECT s.*, st.tier_name, st.price_sol, st.price_stars, st.duration_days, st.features
                FROM subscriptions s
                JOIN users u ON s.user_id = u.telegram_user_id
                JOIN subscription_tiers st ON s.subscription_type = st.tier_name
                WHERE u.telegram_user_id = $1
                AND s.status = 'active'
                AND s.expires_at > CURRENT_TIMESTAMP
                ORDER BY s.expires_at DESC
                LIMIT 1
            `, [userId]);
            
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error getting active subscription:', error);
            return null;
        }
    }

    // Get subscription tier
    async getSubscriptionTier(tierName) {
        try {
            const result = await this.pool.query(
                'SELECT * FROM subscription_tiers WHERE tier_name = $1 AND is_active = true',
                [tierName]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error getting subscription tier:', error);
            return null;
        }
    }

    // Get all subscription tiers
    async getAllSubscriptionTiers() {
        try {
            if (!this.pool) {
                // Return default tiers if database not available
                return DEFAULT_TIERS;
            }
            
            const result = await this.pool.query(
                'SELECT * FROM subscription_tiers WHERE is_active = true ORDER BY price_sol ASC'
            );
            return result.rows.length > 0 ? result.rows : DEFAULT_TIERS;
        } catch (error) {
            console.error('Error getting subscription tiers:', error.message);
            return DEFAULT_TIERS; // Return default tiers on error
        }
    }

    // Get KOLScan settings
    async getKolscanSettings() {
        try {
            const result = await this.pool.query(
                'SELECT * FROM kolscan_settings ORDER BY id DESC LIMIT 1'
            );
            return result.rows[0] || { discount_percentage: 25, min_hold_amount: 1000, token_address: '' };
        } catch (error) {
            console.error('Error getting KOLScan settings:', error);
            return { discount_percentage: 25, min_hold_amount: 1000, token_address: '' };
        }
    }

    // Update KOLScan settings
    async updateKolscanSettings(discountPercentage, minHoldAmount) {
        try {
            await this.pool.query(`
                UPDATE kolscan_settings 
                SET discount_percentage = $1, min_hold_amount = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = (SELECT id FROM kolscan_settings ORDER BY id DESC LIMIT 1)
            `, [discountPercentage, minHoldAmount]);
            
            console.log(`✅ KOLScan settings updated: ${discountPercentage}% discount, min ${minHoldAmount} tokens`);
            return true;
        } catch (error) {
            console.error('Error updating KOLScan settings:', error);
            return false;
        }
    }

    // Get admin statistics
    async getAdminStats() {
        try {
            if (!this.pool) {
                return { total_users: 0, active_subscriptions: 0, trial_users: 0, total_revenue: 0 };
            }
            
            const stats = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN subscription_type != 'trial' THEN 1 END) as active_subscriptions,
                    COUNT(CASE WHEN trial_used = false AND trial_started_at IS NOT NULL THEN 1 END) as trial_users,
                    COALESCE(SUM(total_spent_sol), 0) as total_revenue
                FROM users
                WHERE is_active = true
            `);
            
            return stats.rows[0];
        } catch (error) {
            console.error('Error getting admin stats:', error.message);
            return { total_users: 0, active_subscriptions: 0, trial_users: 0, total_revenue: 0 };
        }
    }

    // Create subscription
    async createSubscription(userId, tierName, paymentMethod, transactionHash, kolscanDiscount = false) {
        try {
            const tier = await this.getSubscriptionTier(tierName);
            if (!tier) {
                throw new Error(`Tier ${tierName} not found`);
            }
            
            const user = await this.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }
            
            // Calculate price with KOLScan discount
            let finalPrice = tier.price_sol;
            let discountPercentage = 0;
            
            if (kolscanDiscount && user.kolscan_balance >= 1000) { // Default min hold
                const settings = await this.getKolscanSettings();
                discountPercentage = settings.discount_percentage;
                finalPrice = tier.price_sol * (1 - discountPercentage / 100);
            }
            
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + tier.duration_days);
            
            // Create subscription
            const subscriptionResult = await this.pool.query(`
                INSERT INTO subscriptions (
                    user_id, subscription_type, expires_at, price_sol, 
                    payment_method, transaction_hash, kolscan_discount_applied, discount_percentage
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [user.telegram_user_id, tierName, expiresAt, finalPrice, paymentMethod, transactionHash, kolscanDiscount, discountPercentage]);
            
            // Update user
            await this.pool.query(`
                UPDATE users 
                SET subscription_type = $1, subscription_expires_at = $2, total_spent_sol = total_spent_sol + $3
                WHERE telegram_user_id = $4
            `, [tierName, expiresAt, finalPrice, user.telegram_user_id]);
            
            // Create payment record
            await this.pool.query(`
                INSERT INTO payments (
                    user_id, subscription_id, amount_sol, payment_method, transaction_hash, status
                ) VALUES ($1, $2, $3, $4, $5, 'confirmed')
            `, [user.telegram_user_id, subscriptionResult.rows[0].id, finalPrice, paymentMethod, transactionHash]);
            
            console.log(`✅ Subscription created for user ${user.username || user.first_name}: ${tierName}`);
            return subscriptionResult.rows[0];
        } catch (error) {
            console.error('Error creating subscription:', error);
            throw error;
        }
    }
}

module.exports = SubscriptionSystem;

