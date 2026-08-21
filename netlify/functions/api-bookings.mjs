import { sql } from './utils/db.js'
import { requireAuth } from './utils/auth.js'
import { json, error, cors, unauthorized, forbidden, notFound } from './utils/response.js'
import { stripe } from './utils/stripe.js'

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

  // Release the payment authorization
  if (stripe && booking.stripe_payment_intent_id) {
    stripe.paymentIntents.cancel(booking.stripe_payment_intent_id).catch(err =>
      console.error('Stripe PI cancel failed:', err.message)
    )
  }

  return json(updated)
}

async function completeBooking(req, id) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()

  const [booking] = await sql`SELECT * FROM bookings WHERE id = ${id}`
  if (!booking) return notFound()
  if (booking.client_id !== user.id && user.role !== 'admin') return forbidden()

  // Atomic conditional update — only advances from valid predecessor states
  const [updated] = await sql`
    UPDATE bookings SET status = 'completed', completed_at = NOW()
    WHERE id = ${id} AND status IN ('pending', 'confirmed', 'in_progress')
    RETURNING *
  `
  if (!updated) return error('Booking cannot be marked complete from its current status', 409)

  await sql`UPDATE jobs SET status = 'completed' WHERE id = ${booking.job_id} AND status != 'completed'`

  if (stripe && updated.stripe_payment_intent_id) {
    captureAndPayout(updated).catch(err => console.error('Stripe payout error:', err.message))
  }

  return json(updated)
}

async function captureAndPayout(booking) {
  try {
    await stripe.paymentIntents.capture(booking.stripe_payment_intent_id)
  } catch (err) {
    console.error('Stripe capture failed for booking', booking.id, err.message)
    await sql`UPDATE bookings SET status = 'disputed' WHERE id = ${booking.id}`
    return
  }

  // Transfer to operator if they have Stripe Connect onboarded
  const [opProfile] = await sql`
    SELECT stripe_account_id, stripe_onboarded FROM operator_profiles WHERE user_id = ${booking.operator_id}
  `
  if (opProfile?.stripe_account_id && opProfile.stripe_onboarded) {
    const transfer = await stripe.transfers.create({
      amount: booking.operator_payout_cents,
      currency: 'usd',
      destination: opProfile.stripe_account_id,
      metadata: { booking_id: booking.id },
    })
    await sql`UPDATE bookings SET stripe_transfer_id = ${transfer.id} WHERE id = ${booking.id}`
  }

  // Generate Stripe Invoice for the client
  await issueInvoice(booking).catch(err => console.error('Invoice error:', err.message))
}

async function issueInvoice(booking) {
  const [client] = await sql`SELECT email, name FROM users WHERE id = ${booking.client_id}`
  const [job] = await sql`SELECT title FROM jobs WHERE id = ${booking.job_id}`
  if (!client) return

  const existing = await stripe.customers.list({ email: client.email, limit: 1 })
  const customer = existing.data[0]
    ?? await stripe.customers.create({ email: client.email, name: client.name })

  const invoice = await stripe.invoices.create({
    customer: customer.id,
    auto_advance: false,
    metadata: { booking_id: booking.id },
  })

  await stripe.invoiceItems.create({
    customer: customer.id,
    invoice: invoice.id,
    amount: booking.total_cents,
    currency: 'usd',
    description: `SkyView Drone Service${job ? ': ' + job.title : ''}`,
  })

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id)
  // Mark paid out-of-band since we captured via PaymentIntent
  await stripe.invoices.pay(finalized.id, { paid_out_of_band: true })
}
