-- SkyView Platform: Google OAuth support
-- Run via: node scripts/migrate.js

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;

-- Partial unique index is more efficient than an inline UNIQUE constraint for nullable columns:
-- it excludes NULL rows from the index entirely, preventing false "duplicate null" conflicts.
DROP INDEX IF EXISTS users_google_id_idx;
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique ON users(google_id) WHERE google_id IS NOT NULL;
