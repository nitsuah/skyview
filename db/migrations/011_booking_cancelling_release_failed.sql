-- Interim state for cancellation so a concurrent completion cannot claim the row.
-- Release-failed state so a failed Stripe cancel can be retried.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled','disputed','capture_failed','cancelling','release_failed'));