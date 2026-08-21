-- SkyView Platform: Stripe customer ID on users
-- Run via: node scripts/migrate.js

ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
