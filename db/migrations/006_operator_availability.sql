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
  operator_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
  operator_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_date  DATE NOT NULL,
  reason        TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (operator_id, blocked_date)
);

CREATE INDEX IF NOT EXISTS operator_blocked_dates_operator_idx ON operator_blocked_dates(operator_id);

-- Database-level double-booking guard: no operator may hold two active
-- (pending/confirmed) bookings whose time ranges overlap. checkOperatorAvailability()
-- gives friendly errors up front, but two concurrent requests can both pass
-- that check; this constraint makes the second INSERT fail (SQLSTATE 23P01),
-- which api-bookings.mjs turns into a 409. Index expressions must be
-- IMMUTABLE and timestamptz + interval is only STABLE (it can depend on the
-- session timezone for day/month intervals), so booking_end_at() wraps a
-- seconds-only interval, which is timezone-independent and therefore safe to
-- declare IMMUTABLE. A NULL duration counts as 2 hours, matching scheduling.js.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE OR REPLACE FUNCTION booking_end_at(start_at TIMESTAMPTZ, hours NUMERIC)
RETURNS TIMESTAMPTZ LANGUAGE sql IMMUTABLE AS $$
  SELECT start_at + make_interval(secs => (COALESCE(hours, 2) * 3600)::double precision)
$$;

DO $$ BEGIN
  ALTER TABLE bookings ADD CONSTRAINT bookings_no_operator_overlap
    EXCLUDE USING gist (
      operator_id WITH =,
      tstzrange(scheduled_at, booking_end_at(scheduled_at, duration_hours)) WITH &&
    ) WHERE (status IN ('pending', 'confirmed') AND scheduled_at IS NOT NULL);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
