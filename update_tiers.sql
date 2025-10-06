-- Update subscription tiers to match current pricing
UPDATE subscription_tiers SET 
    price_sol = 0,
    price_stars = 0,
    duration_days = 5,
    max_tabs = 2,
    features = ARRAY['About', 'Analytics', '5-day trial'],
    updated_at = CURRENT_TIMESTAMP
WHERE tier_name = 'free';

UPDATE subscription_tiers SET 
    price_sol = 0.1,
    price_stars = 100,
    duration_days = 30,
    max_tabs = NULL,
    features = ARRAY['All tabs', '50 notifications/day', 'Priority support'],
    updated_at = CURRENT_TIMESTAMP
WHERE tier_name = 'basic';

UPDATE subscription_tiers SET 
    price_sol = 0.25,
    price_stars = 250,
    duration_days = 30,
    max_tabs = NULL,
    features = ARRAY['All tabs', 'Unlimited notifications', 'Early access', 'Advanced analytics', 'Priority support'],
    updated_at = CURRENT_TIMESTAMP
WHERE tier_name = 'pro';

-- Verify the updates
SELECT tier_name, price_sol, price_stars, duration_days, features 
FROM subscription_tiers 
ORDER BY price_sol;
