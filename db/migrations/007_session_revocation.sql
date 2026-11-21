-- SkyView Platform: Session Revocation
-- Each token carries the user's session_version (claim "sv"). Revoking sessions
-- increments it, so every earlier token stops matching. An atomic increment
-- cannot move backward under concurrent writers and needs no clock.
-- Apply BEFORE deploying the functions that read it: node scripts/migrate.js

ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
