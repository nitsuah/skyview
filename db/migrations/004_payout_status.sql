-- SkyView Platform: persisted payout lifecycle status on bookings
-- Run via: node scripts/migrate.js

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'not_required'
    CHECK (payout_status IN ('not_required', 'pending', 'completed', 'failed'));
