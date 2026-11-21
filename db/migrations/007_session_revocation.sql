-- SkyView Platform: Session Revocation
-- Adds a cutoff timestamp; tokens issued before it are rejected.
-- Run via: node scripts/migrate.js

ALTER TABLE users ADD COLUMN IF NOT EXISTS sessions_valid_after TIMESTAMPTZ;