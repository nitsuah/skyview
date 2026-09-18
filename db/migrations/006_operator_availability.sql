-- SkyView Platform: native operator scheduling
-- Replaces the Calendly consultation widget with in-platform availability so
-- clients' requested dates can be checked against a pilot's calendar instead
-- of an external booking tool.
-- Run via: node scripts/migrate.js

-- Recurring weekly availability windows an operator has declared, e.g.
-- "Mondays 9am-5pm". An operator with zero rows here is treated as having
-- no declared restriction (backward compatible with existing profiles).
CREATE TABLE IF NOT EXISTS operator_availability (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday .. 6=Saturday (UTC)
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS operator_availability_operator_idx ON operator_availability(operator_id);

-- One-off dates an operator is unavailable despite their recurring schedule
-- (vacation, maintenance, etc).
CREATE TABLE IF NOT EXISTS operator_blocked_dates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  blocked_date  DATE NOT NULL,
  reason        TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (operator_id, blocked_date)
);

CREATE INDEX IF NOT EXISTS operator_blocked_dates_operator_idx ON operator_blocked_dates(operator_id);
