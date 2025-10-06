// Database Check Script
// Run this to check database status

const { Pool } = require('pg');

// Use the same connection as server.js
const pool = new Pool({
    user: 'postgres.gzwxdmoqntnninlqpmmw',
    host: 'aws-1-eu-north-1.pooler.supabase.com',
    database: 'postgres',
    password: 'FedorAnnaSemen123',
    port: 5432,
    ssl: false,
    max: 100
});

async function checkDatabase() {
    try {
        console.log('🔍 Checking database status...\n');
        
        // 1. Test connection
        const connectionTest = await pool.query('SELECT NOW() as current_time');
        console.log('✅ Database connection successful!');
        console.log(`⏰ Current time: ${connectionTest.rows[0].current_time}\n`);
        
        // 2. Check tables exist
        console.log('📋 Checking tables...');
        const tablesResult = await pool.query(`
            SELECT table_name, table_type
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('📊 Available tables:');
        tablesResult.rows.forEach(row => {
            console.log(`   - ${row.table_name} (${row.table_type})`);
        });
        console.log('');
        
        // 3. Check record counts
        console.log('📈 Record counts:');
        const counts = [
            { name: 'users', query: 'SELECT COUNT(*) as count FROM users' },
            { name: 'tokens', query: 'SELECT COUNT(*) as count FROM tokens' },
            { name: 'subscriptions', query: 'SELECT COUNT(*) as count FROM subscriptions' },
            { name: 'payments', query: 'SELECT COUNT(*) as count FROM payments' },
            { name: 'subscription_tiers', query: 'SELECT COUNT(*) as count FROM subscription_tiers' },
            { name: 'events', query: 'SELECT COUNT(*) as count FROM events' }
        ];
        
        for (const { name, query } of counts) {
            try {
                const result = await pool.query(query);
                console.log(`   - ${name}: ${result.rows[0].count} records`);
            } catch (error) {
                console.log(`   - ${name}: ❌ Error - ${error.message}`);
            }
        }
        console.log('');
        
        // 4. Check recent users
        console.log('👥 Recent users:');
        try {
            const usersResult = await pool.query(`
                SELECT 
                    id, telegram_user_id, username, first_name, 
                    subscription_type, trial_used, created_at
                FROM users 
                ORDER BY created_at DESC 
                LIMIT 5
            `);
            
            if (usersResult.rows.length > 0) {
                usersResult.rows.forEach(user => {
                    console.log(`   - ID: ${user.id}, TG: ${user.telegram_user_id}, Name: ${user.first_name || user.username}, Type: ${user.subscription_type}`);
                });
            } else {
                console.log('   - No users found');
            }
        } catch (error) {
            console.log(`   - ❌ Error: ${error.message}`);
        }
        console.log('');
        
        // 5. Check recent tokens
        console.log('🪙 Recent tokens:');
        try {
            const tokensResult = await pool.query(`
                SELECT address, symbol, name, source, last_updated
                FROM tokens 
                ORDER BY last_updated DESC 
                LIMIT 5
            `);
            
            if (tokensResult.rows.length > 0) {
                tokensResult.rows.forEach(token => {
                    console.log(`   - ${token.symbol || 'Unknown'} (${token.address.substring(0, 8)}...) - ${token.source}`);
                });
            } else {
                console.log('   - No tokens found');
            }
        } catch (error) {
            console.log(`   - ❌ Error: ${error.message}`);
        }
        console.log('');
        
        // 6. Check subscription tiers
        console.log('💎 Subscription tiers:');
        try {
            const tiersResult = await pool.query(`
                SELECT tier_name, price_sol, price_stars, duration_days, features
                FROM subscription_tiers 
                ORDER BY price_sol
            `);
            
            if (tiersResult.rows.length > 0) {
                tiersResult.rows.forEach(tier => {
                    console.log(`   - ${tier.tier_name}: ${tier.price_sol} SOL (${tier.price_stars} ⭐) - ${tier.duration_days} days`);
                });
            } else {
                console.log('   - No subscription tiers found');
            }
        } catch (error) {
            console.log(`   - ❌ Error: ${error.message}`);
        }
        
        console.log('\n✅ Database check completed!');
        
    } catch (error) {
        console.error('❌ Database check failed:', error.message);
    } finally {
        await pool.end();
    }
}

// Run the check
checkDatabase();
