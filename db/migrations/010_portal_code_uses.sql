-- Single-use client-portal access codes: a code is recorded when first accepted.
CREATE TABLE IF NOT EXISTS portal_code_uses (
  code_hash   TEXT        PRIMARY KEY,   -- SHA-256 hex of the access code; never store the code itself
  client_id   TEXT        NOT NULL,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS portal_code_uses_expires_idx ON portal_code_uses(expires_at);
