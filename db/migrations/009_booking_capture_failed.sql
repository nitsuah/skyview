-- Distinct booking state for a failed payment capture, so completion can be retried.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled','disputed','capture_failed'));

-- Certificate revision: incremented whenever certificate details or documents change.
ALTER TABLE operator_profiles ADD COLUMN IF NOT EXISTS cert_revision INT NOT NULL DEFAULT 0;

-- Number of completion/capture attempts, used to key each Stripe capture request.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS capture_attempts INT NOT NULL DEFAULT 0;
