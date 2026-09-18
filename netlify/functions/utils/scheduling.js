import { sql } from './db.js'

const DEFAULT_DURATION_HOURS = 2

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
export async function checkOperatorAvailability(operatorId, scheduledAt, durationHours, excludeBookingId = null) {
  if (!scheduledAt) return { ok: true }

  const start = new Date(scheduledAt)
  if (Number.isNaN(start.getTime())) return { ok: false, reason: 'scheduled_at is not a valid date' }

  const hours = durationHours != null ? Number(durationHours) : DEFAULT_DURATION_HOURS
  if (!(hours > 0)) return { ok: false, reason: 'duration_hours must be a positive number' }
  const end = new Date(start.getTime() + hours * 60 * 60 * 1000)

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

  const dateStr = start.toISOString().slice(0, 10)
  const [blocked] = await sql`
    SELECT id FROM operator_blocked_dates WHERE operator_id = ${operatorId} AND blocked_date = ${dateStr}
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
