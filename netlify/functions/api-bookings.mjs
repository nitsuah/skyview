import { sql } from './utils/db.js'
import { requireAuth } from './utils/auth.js'
import { json, error, cors, unauthorized, forbidden, notFound } from './utils/response.js'

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

  // TODO Phase 2: create Stripe PaymentIntent here and return client_secret

  return json(booking, 201)
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

  // TODO Phase 2: trigger Stripe Transfer to operator here

  return json(updated)
}
