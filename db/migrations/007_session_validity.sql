-- Sessions issued before this timestamp are rejected (set on credential changes).
ALTER TABLE users ADD COLUMN IF NOT EXISTS sessions_valid_after TIMESTAMPTZ;
