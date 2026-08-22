import { sql } from './utils/db.js'
import { requireAuth } from './utils/auth.js'
import { json, error, cors, unauthorized, forbidden, notFound } from './utils/response.js'
import { stripe } from './utils/stripe.js'
import { sendBookingConfirmedEmail, sendBookingDeclinedEmail, sendBookingCompletedEmail } from './utils/email.js'

export const config = { path: '/api/bookings*' }

const PLATFORM_FEE = 0.15

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

  const { job_id, operator_id, scheduled_at, duration_hours, total_cents } = body
  if (!job_id || !operator_id || !total_cents)
    return error('job_id, operator_id, and total_cents are required')
  if (!Number.isInteger(total_cents) || total_cents <= 0 || total_cents > 2_147_483_647)
    return error('total_cents must be a positive integer within the supported range')
  if (stripe && total_cents < 50)
    return error('total_cents must be at least 50 cents when payments are enabled', 422)

  // Validate operator is verified before creating booking
  const [opProfile] = await sql`
    SELECT id FROM operator_profiles WHERE user_id = ${operator_id} AND verification_status = 'verified'
  `
  if (!opProfile) return error('Operator is not available', 409)

  const fee    = Math.round(total_cents * PLATFORM_FEE)
  const payout = total_cents - fee

  // Atomic gate: UPDATE jobs WHERE status='open' prevents double-booking race
  const [jobUpdate] = await sql`
    UPDATE jobs SET status = 'booked', assigned_operator_id = ${operator_id}
    WHERE id = ${job_id} AND client_id = ${user.id} AND status = 'open'
    RETURNING *
  `
  if (!jobUpdate) return error('This job is no longer available', 409)

  const [booking] = await sql`
    INSERT INTO bookings
      (job_id, client_id, operator_id, scheduled_at, duration_hours, total_cents, platform_fee_cents, operator_payout_cents)
    VALUES
      (${job_id}, ${user.id}, ${operator_id}, ${scheduled_at ?? null}, ${duration_hours ?? null},
       ${total_cents}, ${fee}, ${payout})
    RETURNING *
  `

  let stripe_client_secret = null
  if (stripe) {
    try {
      const intent = await stripe.paymentIntents.create({
        amount: total_cents,
        currency: 'usd',
        capture_method: 'manual',
        metadata: { booking_id: booking.id, job_id, client_id: user.id, operator_id },
      })
      await sql`UPDATE bookings SET stripe_payment_intent_id = ${intent.id} WHERE id = ${booking.id}`
      stripe_client_secret = intent.client_secret
    } catch (err) {
      console.error('Stripe PaymentIntent creation failed:', err.message)
      await sql`DELETE FROM bookings WHERE id = ${booking.id}`
      await sql`UPDATE jobs SET status = 'open', assigned_operator_id = NULL WHERE id = ${job_id}`
      return error('Payment setup failed — please try again', 502)
    }
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

  // Release the payment authorization
  if (stripe && booking.stripe_payment_intent_id) {
    try {
      await stripe.paymentIntents.cancel(booking.stripe_payment_intent_id)
    } catch (err) {
      console.error('PI cancel failed for booking', id, err.message)
      // Non-fatal: Stripe uncaptured PIs auto-expire after 7 days
    }
  }

  return json(updated)
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
  if (booking.job_status === 'cancelled') return error('Job has been cancelled', 409)

  // Atomic conditional update — only advances from valid predecessor states
  const [updated] = await sql`
    UPDATE bookings SET status = 'completed', completed_at = NOW()
    WHERE id = ${id} AND status IN ('pending', 'confirmed', 'in_progress')
    RETURNING *
  `
  if (!updated) return error('Booking cannot be marked complete from its current status', 409)

  let capturedPi = null
  if (stripe && updated.stripe_payment_intent_id) {
    try {
      capturedPi = await stripe.paymentIntents.capture(updated.stripe_payment_intent_id)
    } catch (err) {
      console.error('Stripe capture failed for booking', updated.id, err.message)
      await sql`UPDATE bookings SET status = 'disputed' WHERE id = ${updated.id}`
      // Job stays in its previous state since payment did not succeed
      return json({ ...updated, status: 'disputed' })
    }
  }

  // Update job only after payment is confirmed (or when Stripe is not configured)
  await sql`UPDATE jobs SET status = 'completed' WHERE id = ${booking.job_id} AND status != 'completed'`

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

async function payoutAndInvoice(booking, chargeId = null) {
  // Transfer to operator if they have Stripe Connect onboarded
  const [opProfile] = await sql`
    SELECT stripe_account_id, stripe_onboarded FROM operator_profiles WHERE user_id = ${booking.operator_id}
  `
  if (opProfile?.stripe_account_id && opProfile.stripe_onboarded) {
    const transfer = await stripe.transfers.create(
      {
        amount: booking.operator_payout_cents,
        currency: 'usd',
        destination: opProfile.stripe_account_id,
        // source_transaction links the transfer to the specific captured charge
        // so funds are drawn from that charge rather than platform available balance
        ...(chargeId ? { source_transaction: chargeId } : {}),
        metadata: { booking_id: booking.id },
      },
      { idempotencyKey: `transfer-${booking.id}` }
    )
    await sql`UPDATE bookings SET stripe_transfer_id = ${transfer.id} WHERE id = ${booking.id}`
  }

  // Let invoice errors propagate so payout_status reflects the true outcome
  await issueInvoice(booking)
}

async function issueInvoice(booking) {
  const [client] = await sql`SELECT id, email, name, stripe_customer_id FROM users WHERE id = ${booking.client_id}`
  const [job] = await sql`SELECT title FROM jobs WHERE id = ${booking.job_id}`
  if (!client) return

  let customerId = client.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create(
      { email: client.email, name: client.name, metadata: { skyview_user_id: client.id } },
      { idempotencyKey: `create-customer-${client.id}` }
    )
    customerId = customer.id
    // Persist only if not already set (safe under concurrent calls with the same idempotencyKey)
    await sql`
      UPDATE users SET stripe_customer_id = ${customerId}
      WHERE id = ${client.id} AND stripe_customer_id IS NULL
    `.catch(err => console.error('Failed to persist stripe_customer_id:', err.message))
  }

  const invoice = await stripe.invoices.create(
    { customer: customerId, auto_advance: false, metadata: { booking_id: booking.id } },
    { idempotencyKey: `invoice-${booking.id}` }
  )

  await stripe.invoiceItems.create(
    {
      customer: customerId,
      invoice: invoice.id,
      amount: booking.total_cents,
      currency: 'usd',
      description: `SkyView Drone Service${job ? ': ' + job.title : ''}`,
    },
    { idempotencyKey: `invoice-item-${booking.id}` }
  )

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id)
  // Mark paid out-of-band since we captured via PaymentIntent
  await stripe.invoices.pay(finalized.id, { paid_out_of_band: true })
}
