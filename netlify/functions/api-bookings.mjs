import { sql } from './utils/db.js'
import { requireAuth } from './utils/auth.js'
import { json, error, cors, unauthorized, forbidden, notFound } from './utils/response.js'
import { sendBookingConfirmedEmail, sendBookingDeclinedEmail, sendBookingCompletedEmail } from './utils/email.js'
import { checkOperatorAvailability } from './utils/scheduling.js'
import {
  MIN_CHARGE_CENTS, paymentsEnabled, splitTotal, priceBooking,
  authorizePayment, releasePayment, capturePayment, retrievePayment, payoutAndInvoice,
} from './utils/booking-billing.js'

export const config = { path: '/api/bookings*' }

// Booking states from which completion may start. 'pending' is deliberately
// absent: the operator must have accepted first. 'capture_failed' is the retry
// path after a payment capture did not go through.
export const COMPLETABLE_STATUSES = ['confirmed', 'in_progress', 'capture_failed']

// Statuses that can be cancelled (exit path for client/admin when payment failed)
export const CANCELLABLE_STATUSES = ['capture_failed', 'release_failed']

// A 'cancelling' claim older than this is treated as abandoned (the function
// stopped mid-cancellation) and may be re-claimed by a retry.
export const STALE_CANCEL_CLAIM = '2 minutes'

export default async (req, context) => {
  if (req.method === 'OPTIONS') return cors()

  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  const id     = parts[2] || null
  const action = parts[3] || null

  if (!id) {
    if (req.method === 'GET')  return listBookings(req)
    if (req.method === 'POST') return createBooking(req)
  } else if (action === 'confirm') {
    if (req.method === 'POST') return confirmBooking(req, id)
  } else if (action === 'decline') {
    if (req.method === 'POST') return declineBooking(req, id)
  } else if (action === 'complete') {
    if (req.method === 'POST') return completeBooking(req, id)
  } else if (action === 'cancel') {
    if (req.method === 'POST') return cancelBooking(req, id)
  } else {
    if (req.method === 'GET') return getBooking(req, id)
  }

  return error('Not found', 404)
}

async function listBookings(req) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()

  if (user.role === 'client') {
    const rows = await sql`
      SELECT b.*, j.title, j.service_type, j.location_address, u.name AS operator_name
      FROM bookings b
      JOIN jobs j ON b.job_id = j.id
      JOIN users u ON b.operator_id = u.id
      WHERE b.client_id = ${user.id}
      ORDER BY b.created_at DESC
    `
    return json(rows)
  }

  if (user.role === 'operator') {
    const rows = await sql`
      SELECT b.*, j.title, j.service_type, j.location_address, u.name AS client_name
      FROM bookings b
      JOIN jobs j ON b.job_id = j.id
      JOIN users u ON b.client_id = u.id
      WHERE b.operator_id = ${user.id}
      ORDER BY b.created_at DESC
    `
    return json(rows)
  }

  if (user.role === 'admin') {
    const rows = await sql`
      SELECT b.*, j.title, cu.name AS client_name, ou.name AS operator_name
      FROM bookings b
      JOIN jobs j ON b.job_id = j.id
      JOIN users cu ON b.client_id = cu.id
      JOIN users ou ON b.operator_id = ou.id
      ORDER BY b.created_at DESC
      LIMIT 100
    `
    return json(rows)
  }

  return unauthorized()
}

async function createBooking(req) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()
  if (user.role !== 'client') return forbidden()

  const body = await req.json().catch(() => null)
  if (!body) return error('Invalid JSON')

  const { job_id, operator_id } = body
  // Blank strings mean "not provided": normalize once so the availability check
  // and the INSERT always see the same values (an empty scheduled_at would
  // otherwise skip the check and then fail as an invalid timestamp at INSERT).
  const scheduled_at   = body.scheduled_at === '' ? null : (body.scheduled_at ?? null)
  const rawDuration    = body.duration_hours === '' ? null : (body.duration_hours ?? null)
  // Coerce to a finite number (two decimals, as stored) before it is priced or stored.
  const duration_hours = rawDuration === null ? null : Math.round(Number(rawDuration) * 100) / 100
  if (!job_id || !operator_id)
    return error('job_id and operator_id are required')
  if (duration_hours !== null && !(Number.isFinite(duration_hours) && duration_hours > 0 && duration_hours < 100))
    return error('duration_hours must be a positive number under 100')

  // Validate operator is verified before creating booking
  const [opProfile] = await sql`
    SELECT id, hourly_rate_cents, base_rate_cents
    FROM operator_profiles WHERE user_id = ${operator_id} AND verification_status = 'verified'
  `
  if (!opProfile) return error('Operator is not available', 409)

  // The total is always computed here; any client-supplied total_cents is ignored.
  // Prices come only from the operator's rates, never from the job budget.
  if (opProfile.hourly_rate_cents > 0 && duration_hours === null)
    return error('duration_hours is required for this operator', 400)
  const total_cents = priceBooking(opProfile, duration_hours)
  if (!Number.isInteger(total_cents) || total_cents <= 0 || total_cents > 2_147_483_647)
    return error('This operator has not set a rate, so the booking cannot be priced', 422)
  if (paymentsEnabled() && total_cents < MIN_CHARGE_CENTS)
    return error(`total_cents must be at least ${MIN_CHARGE_CENTS} cents when payments are enabled`, 422)

  const availability = await checkOperatorAvailability(operator_id, scheduled_at, duration_hours)
  if (!availability.ok) return error(availability.reason, 409)

  const { fee, payout } = splitTotal(total_cents)

  // Atomic gate: UPDATE jobs WHERE status='open' prevents double-booking race
  const [jobUpdate] = await sql`
    UPDATE jobs SET status = 'booked', assigned_operator_id = ${operator_id}
    WHERE id = ${job_id} AND client_id = ${user.id} AND status = 'open'
    RETURNING *
  `
  if (!jobUpdate) return error('This job is no longer available', 409)

  let booking
  try {
    ;[booking] = await sql`
      INSERT INTO bookings
        (job_id, client_id, operator_id, scheduled_at, duration_hours, total_cents, platform_fee_cents, operator_payout_cents)
      VALUES
        (${job_id}, ${user.id}, ${operator_id}, ${scheduled_at ?? null}, ${duration_hours ?? null},
         ${total_cents}, ${fee}, ${payout})
      RETURNING *
    `
  } catch (err) {
    // 23P01 = bookings_no_operator_overlap (migration 006): a concurrent request
    // took this operator's slot after checkOperatorAvailability() ran.
    await sql`UPDATE jobs SET status = 'open', assigned_operator_id = NULL WHERE id = ${job_id}`
    if (err?.code === '23P01') return error('This operator already has a booking that overlaps this time', 409)
    throw err
  }

  let stripe_client_secret
  try {
    stripe_client_secret = await authorizePayment(booking)
  } catch (err) {
    console.error('Stripe PaymentIntent creation failed:', err.message)
    await sql`DELETE FROM bookings WHERE id = ${booking.id}`
    await sql`UPDATE jobs SET status = 'open', assigned_operator_id = NULL WHERE id = ${job_id}`
    return error('Payment setup failed — please try again', 502)
  }

  return json({ ...booking, stripe_client_secret }, 201)
}

async function getBooking(req, id) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()

  const [booking] = await sql`SELECT * FROM bookings WHERE id = ${id}`
  if (!booking) return notFound()

  const isParty = booking.client_id === user.id || booking.operator_id === user.id
  if (!isParty && user.role !== 'admin') return forbidden()

  return json(booking)
}

async function confirmBooking(req, id) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()
  if (user.role !== 'operator') return forbidden()

  const [booking] = await sql`SELECT * FROM bookings WHERE id = ${id}`
  if (!booking) return notFound()
  if (booking.operator_id !== user.id) return forbidden()

  // Payment setup must have finished before the operator can accept.
  if (paymentsEnabled() && !booking.stripe_payment_intent_id)
    return error('Payment setup for this booking has not finished', 409)

  // Re-check for a conflict with another booking this operator already confirmed
  // since this one was created — two pending requests can overlap; only one
  // may be accepted. checkOperatorAvailability only compares against
  // OTHER bookings, so this one (still 'pending' at this point) never
  // conflicts with itself.
  const availability = await checkOperatorAvailability(booking.operator_id, booking.scheduled_at, booking.duration_hours, booking.id)
  if (!availability.ok) return error(availability.reason, 409)

  const [updated] = await sql`
    UPDATE bookings SET status = 'confirmed', confirmed_at = NOW()
    WHERE id = ${id} AND status = 'pending'
    RETURNING *
  `
  if (!updated) return error('Booking is not in a confirmable state', 409)

  const [clientRow] = await sql`SELECT email FROM users WHERE id = ${updated.client_id}`
  const [jobRow]    = await sql`SELECT title FROM jobs WHERE id = ${updated.job_id}`
  if (clientRow && jobRow) {
    await sendBookingConfirmedEmail(clientRow.email, jobRow, user.name)
      .catch(err => console.error('sendBookingConfirmedEmail failed:', err.message))
  }

  return json(updated)
}

async function declineBooking(req, id) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()
  if (user.role !== 'operator') return forbidden()

  const [booking] = await sql`SELECT * FROM bookings WHERE id = ${id}`
  if (!booking) return notFound()
  if (booking.operator_id !== user.id) return forbidden()

  const [updated] = await sql`
    UPDATE bookings SET status = 'cancelled', cancelled_at = NOW()
    WHERE id = ${id} AND status = 'pending'
    RETURNING *
  `
  if (!updated) return error('Booking is not in a declinable state', 409)

  // Return job to open so client can book another operator
  await sql`
    UPDATE jobs SET status = 'open', assigned_operator_id = NULL
    WHERE id = ${booking.job_id} AND status = 'booked'
  `

  const [clientRow] = await sql`SELECT email FROM users WHERE id = ${updated.client_id}`
  const [jobRow]    = await sql`SELECT title FROM jobs WHERE id = ${updated.job_id}`
  if (clientRow && jobRow) {
    await sendBookingDeclinedEmail(clientRow.email, jobRow)
      .catch(err => console.error('sendBookingDeclinedEmail failed:', err.message))
  }

  // Release the payment authorization (non-fatal on failure)
  await releasePayment(booking)

  return json(updated)
}

// Exit from capture_failed / release_failed: the client or an admin abandons the
// booking, which releases the payment hold and reopens the job.
//
// Order matters. The row is claimed as 'cancelling' first (committed, so a
// concurrent completion retry cannot claim it: 'cancelling' is not completable),
// and only then is the payment checked. A capture that landed earlier, even one
// whose response was lost, is therefore always seen, and the booking reconciles
// to completed instead of being cancelled.
async function cancelBooking(req, id) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()

  const [booking] = await sql`SELECT * FROM bookings WHERE id = ${id}`
  if (!booking) return notFound()
  if (booking.client_id !== user.id && user.role !== 'admin') return forbidden()

  const reclaiming = booking.status === 'cancelling'
  if (!CANCELLABLE_STATUSES.includes(booking.status) && !reclaiming)
    return error('Booking is not in a cancellable state', 409)

  // A row left in 'cancelling' by an attempt that stopped part-way can be
  // re-claimed once the claim is stale; the steps below are all retry-safe
  // because the payment is checked before anything is released or reopened.
  const prevStatus = booking.status
  const [claimed] = await sql`
    UPDATE bookings SET status = 'cancelling'
    WHERE id = ${id} AND status = ${prevStatus}
      AND (status <> 'cancelling' OR updated_at IS NULL
           OR updated_at < NOW() - ${STALE_CANCEL_CLAIM}::interval)
    RETURNING *
  `
  if (!claimed) {
    return reclaiming
      ? error('Cancellation is already in progress; try again in a few minutes', 409)
      : error('Booking is not in a cancellable state', 409)
  }
  // A re-claimed row has no earlier failure state to return to; release_failed
  // is the cancellable state whose retry re-checks the payment first.
  const restoreTo = reclaiming ? 'release_failed' : prevStatus
  const restore = () => sql`
    UPDATE bookings SET status = ${restoreTo}
    WHERE id = ${id} AND status = 'cancelling'
  `

  // Never release a hold (or reopen the job) without first checking the funds
  // were not in fact captured. If Stripe cannot be reached, change nothing.
  let intent
  try {
    intent = await retrievePayment(booking)
  } catch (err) {
    console.error('Stripe retrieve failed for booking', booking.id, err.message)
    await restore()
    return error('Could not verify the payment status; please try again', 503)
  }
  if (intent?.status === 'succeeded') {
    // Funds were captured after all: reconcile to completed instead of cancelling.
    const [reconciled] = await sql`
      UPDATE bookings SET status = 'completed', completed_at = NOW()
      WHERE id = ${id} AND status = 'cancelling'
      RETURNING *
    `
    if (!reconciled) return error('Booking is not in a cancellable state', 409)
    return finishCompletion(reconciled, intent)
  }

  // A hold already released by an earlier attempt is not released again.
  if (intent?.status !== 'canceled') {
    const released = await releasePayment(booking)
    if (!released) {
      const [failed] = await sql`
        UPDATE bookings SET status = 'release_failed'
        WHERE id = ${id} AND status = 'cancelling'
        RETURNING *
      `
      return json({ error: 'Releasing the payment hold failed; cancellation can be retried', booking: failed }, 402)
    }
  }

  // Cancel the booking and reopen the job together, or neither.
  try {
    const [[updated]] = await sql.transaction(txn => [
      txn`
        UPDATE bookings SET status = 'cancelled', cancelled_at = NOW()
        WHERE id = ${id} AND status = 'cancelling'
        RETURNING *
      `,
      txn`
        UPDATE jobs SET status = 'open', assigned_operator_id = NULL
        WHERE id = ${booking.job_id} AND status = 'booked'
      `,
    ])
    if (!updated) return error('Booking is not in a cancellable state', 409)
    return json(updated)
  } catch (err) {
    console.error('Cancellation commit failed for booking', booking.id, err.message)
    // The hold is released; a retry sees the canceled intent and only commits.
    await restore()
    return error('Cancellation failed; please try again', 500)
  }
}

async function completeBooking(req, id) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()

  const [booking] = await sql`
    SELECT b.*, j.status AS job_status
    FROM bookings b JOIN jobs j ON b.job_id = j.id
    WHERE b.id = ${id}
  `
  if (!booking) return notFound()
  if (booking.client_id !== user.id && user.role !== 'admin') return forbidden()

  if (!COMPLETABLE_STATUSES.includes(booking.status))
    return error('Booking cannot be completed from its current status', 409)
  // With payments on, a booking without an initialized payment cannot complete.
  if (paymentsEnabled() && !booking.stripe_payment_intent_id)
    return error('Payment setup for this booking has not finished', 409)

  // Atomic conditional update: fold the status and job-status guards into the same
  // statement so a concurrent change between the SELECT and here cannot slip through.
  // The correlated subquery re-reads jobs.status at UPDATE time, eliminating the race.
  const [updated] = await sql`
    UPDATE bookings SET status = 'completed', completed_at = NOW(),
      capture_attempts = capture_attempts + 1
    WHERE id = ${id}
      AND status = ANY(${COMPLETABLE_STATUSES})
      AND (SELECT status FROM jobs WHERE id = job_id) != 'cancelled'
    RETURNING *
  `
  if (!updated) return error('Job has been cancelled or booking cannot be completed from its current status', 409)

  let capturedPi
  try {
    capturedPi = await capturePayment(updated)
    // A required capture that returned nothing is a failure, not a completion.
    if (paymentsEnabled() && !capturedPi) throw new Error('no payment captured')
  } catch (err) {
    console.error('Stripe capture failed for booking', updated.id, err.message)
    // Distinct failure state; completion can be retried from it.
    await sql`
      UPDATE bookings SET status = 'capture_failed', completed_at = NULL
      WHERE id = ${updated.id} AND status = 'completed'
    `
    // Job stays in its previous state since payment did not succeed
    return json({ error: 'Payment capture failed; completion can be retried', booking: { ...updated, status: 'capture_failed', completed_at: null } }, 402)
  }

  return finishCompletion(updated, capturedPi)
}

// Post-capture steps shared by completion and cancel-time reconciliation.
async function finishCompletion(updated, capturedPi) {
  // Update job only after payment is confirmed (or when Stripe is not configured).
  // Exclude 'cancelled' so a concurrent job cancellation is never overwritten.
  await sql`UPDATE jobs SET status = 'completed' WHERE id = ${updated.job_id} AND status NOT IN ('completed', 'cancelled')`

  if (capturedPi) {
    await sql`UPDATE bookings SET payout_status = 'pending' WHERE id = ${updated.id}`
    try {
      await payoutAndInvoice(updated, capturedPi.latest_charge)
      await sql`UPDATE bookings SET payout_status = 'completed' WHERE id = ${updated.id}`
      // Notify operator only after payout succeeds
      const [opRow]  = await sql`SELECT email, name FROM users WHERE id = ${updated.operator_id}`
      const [jobRow] = await sql`SELECT title FROM jobs WHERE id = ${updated.job_id}`
      if (opRow && jobRow) {
        await sendBookingCompletedEmail(opRow.email, opRow.name, jobRow, updated.operator_payout_cents)
          .catch(err => console.error('sendBookingCompletedEmail failed:', err.message))
      }
    } catch (err) {
      console.error('Payout/invoice failed for booking', updated.id, err.message)
      await sql`UPDATE bookings SET payout_status = 'failed' WHERE id = ${updated.id}`
      // Service was delivered — completion stands; admin retries payout separately
    }
  }

  return json(updated)
}
