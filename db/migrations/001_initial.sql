-- SkyView Platform: Initial Schema
-- Compatible with Neon (PostgreSQL 16) and local PostgreSQL 15+
-- Run via: node scripts/migrate.js

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────
-- USERS  (clients, operators, admins share one table)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('client', 'operator', 'admin')),
  name          TEXT NOT NULL,
  phone         TEXT,
  email_verified  BOOLEAN DEFAULT false,
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_role_idx  ON users(role);

-- ─────────────────────────────────────────────────
-- OPERATOR PROFILES
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operator_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- Public profile
  bio                 TEXT,
  equipment           TEXT,
  service_types       TEXT[] DEFAULT '{}',  -- real_estate | cinematography | mapping | events | inspection

  -- Geographic coverage (center + radius)
  coverage_lat        DOUBLE PRECISION,
  coverage_lng        DOUBLE PRECISION,
  coverage_radius_mi  INT DEFAULT 50,

  -- Rates (stored in cents to avoid float issues)
  base_rate_cents     INT,
  hourly_rate_cents   INT,

  -- Phase 1: external booking link (Cal.com or own Calendly)
  booking_url         TEXT,

  -- FAA verification
  verification_status TEXT DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'under_review', 'verified', 'suspended', 'rejected')),
  rejection_reason    TEXT,
  faa_cert_number     TEXT,
  faa_cert_expires_at DATE,
  faa_cert_blob_key   TEXT,   -- Netlify Blobs storage key for uploaded cert doc
  verified_at         TIMESTAMPTZ,
  verified_by         UUID REFERENCES users(id),

  -- Stripe Connect
  stripe_account_id   TEXT,
  stripe_onboarded    BOOLEAN DEFAULT false,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS op_profiles_user_idx     ON operator_profiles(user_id);
CREATE INDEX IF NOT EXISTS op_profiles_status_idx   ON operator_profiles(verification_status);
CREATE INDEX IF NOT EXISTS op_profiles_location_idx ON operator_profiles(coverage_lat, coverage_lng);

-- ─────────────────────────────────────────────────
-- JOBS  (posted by clients)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            UUID REFERENCES users(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  service_type         TEXT NOT NULL,  -- real_estate | cinematography | mapping | events | inspection
  description          TEXT,
  location_address     TEXT,
  location_lat         DOUBLE PRECISION,
  location_lng         DOUBLE PRECISION,
  preferred_date       DATE,
  preferred_time       TEXT CHECK (preferred_time IN ('morning','afternoon','evening','flexible')),
  budget_cents         INT,
  status               TEXT DEFAULT 'open'
    CHECK (status IN ('open','matched','booked','in_progress','completed','cancelled')),
  assigned_operator_id UUID REFERENCES users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS jobs_client_idx   ON jobs(client_id);
CREATE INDEX IF NOT EXISTS jobs_status_idx   ON jobs(status);
CREATE INDEX IF NOT EXISTS jobs_service_idx  ON jobs(service_type);
CREATE INDEX IF NOT EXISTS jobs_location_idx ON jobs(location_lat, location_lng);

-- ─────────────────────────────────────────────────
-- BOOKINGS
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                   UUID REFERENCES jobs(id) ON DELETE CASCADE,
  client_id                UUID REFERENCES users(id),
  operator_id              UUID REFERENCES users(id),
  scheduled_at             TIMESTAMPTZ,
  duration_hours           NUMERIC(4,2),

  -- All money in cents
  total_cents              INT NOT NULL,
  platform_fee_cents       INT NOT NULL,   -- 15% of total
  operator_payout_cents    INT NOT NULL,   -- 85% of total

  status                   TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled','disputed')),

  -- Stripe (populated in Phase 2)
  stripe_payment_intent_id TEXT,
  stripe_transfer_id       TEXT,

  confirmed_at             TIMESTAMPTZ,
  completed_at             TIMESTAMPTZ,
  cancelled_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bookings_client_idx   ON bookings(client_id);
CREATE INDEX IF NOT EXISTS bookings_operator_idx ON bookings(operator_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx   ON bookings(status);
CREATE INDEX IF NOT EXISTS bookings_job_idx      ON bookings(job_id);

-- ─────────────────────────────────────────────────
-- DELIVERABLES  (files uploaded after job completion)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deliverables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID REFERENCES bookings(id) ON DELETE CASCADE,
  blob_key        TEXT NOT NULL,    -- Netlify Blobs key
  file_name       TEXT,
  file_type       TEXT,
  file_size_bytes BIGINT,
  uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS deliverables_booking_idx ON deliverables(booking_id);

-- ─────────────────────────────────────────────────
-- REVIEWS
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id),
  operator_id UUID REFERENCES users(id),
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reviews_operator_idx ON reviews(operator_id);

-- ─────────────────────────────────────────────────
-- EMAIL VERIFICATION TOKENS
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,  -- SHA-256 hex of the raw bearer token; never store plaintext
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────
-- AUTO-UPDATE updated_at TRIGGER
-- ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER op_profiles_updated_at
    BEFORE UPDATE ON operator_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER jobs_updated_at
    BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER bookings_updated_at
    BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
