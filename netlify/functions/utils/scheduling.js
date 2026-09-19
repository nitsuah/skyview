import { sql } from './db.js'

const DEFAULT_DURATION_HOURS = 2
// bookings.duration_hours is NUMERIC(4,2), so anything above 99.99 would fail at INSERT.
const MAX_DURATION_HOURS = 99.99

// Checks a proposed booking time against an operator's existing bookings and
// declared availability. Returns { ok: true } or { ok: false, reason }.
//
// - No scheduled_at proposed yet → nothing to check (booking can be scheduled later).
// - Overlap against the operator's own pending/confirmed bookings is always enforced.
// - Blocked dates are always enforced once declared.
// - Weekly windows are only enforced if the operator has declared at least one —
//   an operator who hasn't set up a calendar yet isn't falsely blocked.
// - Windows are treated as same-UTC-day only; a booking that would cross UTC
//   midnight is rejected rather than partially validated, which is fine for
//   typical multi-hour shoots.
// null/undefined means "not provided" (the default applies). Anything provided
// must be storable in bookings.duration_hours NUMERIC(4,2): finite, > 0,
// <= 99.99, and no finer than 2 decimals (Postgres would silently round 0.001
// to 0.00 rather than reject it).
export function validateDurationHours(durationHours) {
  if (durationHours == null) return { ok: true, hours: DEFAULT_DURATION_HOURS }
  const hours = typeof durationHours === 'number' ? durationHours : Number(String(durationHours).trim() || NaN)
  if (!Number.isFinite(hours) || hours <= 0 || hours > MAX_DURATION_HOURS)
    return { ok: false, reason: `duration_hours must be a positive number no greater than ${MAX_DURATION_HOURS}` }
  if (Math.abs(hours * 100 - Math.round(hours * 100)) > 1e-9)
    return { ok: false, reason: 'duration_hours can have at most 2 decimal places' }
  return { ok: true, hours }
}

export async function checkOperatorAvailability(operatorId, scheduledAt, durationHours, excludeBookingId = null) {
  // Validate the duration even when no time is proposed yet — it is stored
  // either way, and a bad value would otherwise fail at INSERT after the job
  // has already been marked booked.
  const duration = validateDurationHours(durationHours)
  if (!duration.ok) return duration

  if (!scheduledAt) return { ok: true }

  const start = new Date(scheduledAt)
  if (Number.isNaN(start.getTime())) return { ok: false, reason: 'scheduled_at is not a valid date' }

  const hours = duration.hours
  const end = new Date(start.getTime() + hours * 60 * 60 * 1000)
  if (Number.isNaN(end.getTime()))
    return { ok: false, reason: 'duration_hours produces an invalid booking end time' }

  // Two explicit branches — Neon's HTTP driver does not support conditionally
  // omitting a clause inside one template, and excludeBookingId is only
  // non-null on the re-check made from confirmBooking (see api-bookings.mjs),
  // which must not match the very booking it is re-validating.
  const [overlap] = excludeBookingId
    ? await sql`
        SELECT id FROM bookings
        WHERE operator_id = ${operatorId}
          AND id != ${excludeBookingId}
          AND status IN ('pending', 'confirmed')
          AND scheduled_at IS NOT NULL
          AND scheduled_at < ${end}
          AND (scheduled_at + COALESCE(duration_hours, ${DEFAULT_DURATION_HOURS}) * INTERVAL '1 hour') > ${start}
      `
    : await sql`
        SELECT id FROM bookings
        WHERE operator_id = ${operatorId}
          AND status IN ('pending', 'confirmed')
          AND scheduled_at IS NOT NULL
          AND scheduled_at < ${end}
          AND (scheduled_at + COALESCE(duration_hours, ${DEFAULT_DURATION_HOURS}) * INTERVAL '1 hour') > ${start}
      `
  if (overlap) return { ok: false, reason: 'This operator already has a booking that overlaps this time' }

  // Every UTC date the half-open interval [start, end) touches — a booking that
  // starts late on the 4th and runs into the 5th must respect a block on the 5th.
  const firstDate = start.toISOString().slice(0, 10)
  const lastDate = new Date(end.getTime() - 1).toISOString().slice(0, 10)
  const [blocked] = await sql`
    SELECT id FROM operator_blocked_dates
    WHERE operator_id = ${operatorId} AND blocked_date BETWEEN ${firstDate} AND ${lastDate}
  `
  if (blocked) return { ok: false, reason: 'This operator is unavailable on the requested date' }

  const weekly = await sql`
    SELECT day_of_week, start_time, end_time FROM operator_availability WHERE operator_id = ${operatorId}
  `
  if (weekly.length > 0) {
    const sameDay = end.getUTCDate() === start.getUTCDate() &&
      end.getUTCMonth() === start.getUTCMonth() && end.getUTCFullYear() === start.getUTCFullYear()
    const dow = start.getUTCDay()
    const startTime = start.toISOString().slice(11, 19)
    const endTime = end.toISOString().slice(11, 19)
    const fits = sameDay && weekly.some(w =>
      w.day_of_week === dow && startTime >= w.start_time && endTime <= w.end_time
    )
    if (!fits) return { ok: false, reason: "This time is outside the operator's declared availability" }
  }

  return { ok: true }
}
