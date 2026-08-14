import { sql } from './utils/db.js'
import { requireAuth } from './utils/auth.js'
import { sendOperatorApprovedEmail } from './utils/email.js'
import { json, error, cors, unauthorized, forbidden, notFound } from './utils/response.js'

export const config = { path: '/api/operators*' }

export default async (req, context) => {
  if (req.method === 'OPTIONS') return cors()

  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  // ['api','operators'] | ['api','operators','<id>'] | ['api','operators','<id>','verify']
  const id     = parts[2] || null
  const action = parts[3] || null

  if (!id) {
    if (req.method === 'GET') return listOperators(url)
  } else if (action === 'verify') {
    if (req.method === 'POST') return verifyOperator(req, id)
  } else {
    if (req.method === 'GET') return getOperator(id)
    if (req.method === 'PUT') return updateProfile(req, id)
  }

  return error('Not found', 404)
}

async function listOperators(url) {
  const serviceType = url.searchParams.get('service')
  const serviceFilter = serviceType
    ? sql`AND ${serviceType} = ANY(op.service_types::text[])`
    : sql``

  const operators = await sql`
    SELECT u.id, u.name,
           op.bio, op.equipment, op.service_types,
           op.coverage_radius_mi,
           op.base_rate_cents, op.hourly_rate_cents, op.booking_url,
           COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS avg_rating,
           COUNT(r.id) AS review_count
    FROM operator_profiles op
    JOIN users u ON op.user_id = u.id
    LEFT JOIN reviews r ON r.operator_id = u.id
    WHERE op.verification_status = 'verified'
      ${serviceFilter}
    GROUP BY u.id, u.name, op.bio, op.equipment, op.service_types,
             op.coverage_radius_mi,
             op.base_rate_cents, op.hourly_rate_cents, op.booking_url
    ORDER BY avg_rating DESC, review_count DESC
  `
  return json(operators)
}

async function getOperator(id) {
  const [op] = await sql`
    SELECT u.id, u.name,
           op.bio, op.equipment, op.service_types,
           op.coverage_radius_mi,
           op.base_rate_cents, op.hourly_rate_cents, op.booking_url,
           COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS avg_rating,
           COUNT(r.id) AS review_count
    FROM operator_profiles op
    JOIN users u ON op.user_id = u.id
    LEFT JOIN reviews r ON r.operator_id = u.id
    WHERE u.id = ${id} AND op.verification_status = 'verified'
    GROUP BY u.id, u.name, op.bio, op.equipment, op.service_types,
             op.coverage_radius_mi,
             op.base_rate_cents, op.hourly_rate_cents, op.booking_url
  `
  if (!op) return notFound()
  return json(op)
}

async function updateProfile(req, id) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()

  // Operators update their own; admin can update any
  const targetId = user.role === 'admin' ? id : user.id
  if (user.role === 'operator' && user.id !== id) return forbidden()

  const [profile] = await sql`SELECT id FROM operator_profiles WHERE user_id = ${targetId}`
  if (!profile) return notFound()

  const body = await req.json().catch(() => null)
  if (!body) return error('Invalid JSON')

  const {
    bio, equipment, service_types, coverage_lat, coverage_lng, coverage_radius_mi,
    base_rate_cents, hourly_rate_cents, booking_url,
    faa_cert_number, faa_cert_expires_at
  } = body

  if (booking_url != null) {
    try {
      const u = new URL(booking_url)
      if (u.protocol !== 'https:') return error('booking_url must use HTTPS')
    } catch {
      return error('booking_url is not a valid URL')
    }
  }

  const certChanging = faa_cert_number != null || faa_cert_expires_at != null

  const [updated] = await sql`
    UPDATE operator_profiles SET
      bio                = COALESCE(${bio ?? null}, bio),
      equipment          = COALESCE(${equipment ?? null}, equipment),
      service_types      = COALESCE(${service_types ?? null}, service_types),
      coverage_lat       = COALESCE(${coverage_lat ?? null}, coverage_lat),
      coverage_lng       = COALESCE(${coverage_lng ?? null}, coverage_lng),
      coverage_radius_mi = COALESCE(${coverage_radius_mi ?? null}, coverage_radius_mi),
      base_rate_cents    = COALESCE(${base_rate_cents ?? null}, base_rate_cents),
      hourly_rate_cents  = COALESCE(${hourly_rate_cents ?? null}, hourly_rate_cents),
      booking_url        = COALESCE(${booking_url ?? null}, booking_url),
      faa_cert_number    = COALESCE(${faa_cert_number ?? null}, faa_cert_number),
      faa_cert_expires_at = COALESCE(${faa_cert_expires_at ?? null}, faa_cert_expires_at),
      verification_status = CASE WHEN ${certChanging} THEN 'pending' ELSE verification_status END
    WHERE user_id = ${targetId}
    RETURNING *
  `
  return json(updated)
}

async function verifyOperator(req, id) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()
  if (user.role !== 'admin') return forbidden()

  const body = await req.json().catch(() => null)
  const action = body?.action  // 'approve' | 'reject' | 'suspend'

  const statusMap = { approve: 'verified', reject: 'pending', suspend: 'suspended' }
  const newStatus = statusMap[action]
  if (!newStatus) return error("action must be 'approve', 'reject', or 'suspend'")

  const [op] = await sql`
    UPDATE operator_profiles SET
      verification_status = ${newStatus},
      verified_at = ${action === 'approve' ? sql`NOW()` : null},
      verified_by = ${action === 'approve' ? user.id : null}
    WHERE user_id = ${id}
    RETURNING *
  `
  if (!op) return notFound()

  if (action === 'approve' && process.env.RESEND_API_KEY) {
    const [u] = await sql`SELECT email, name FROM users WHERE id = ${id}`
    if (u) sendOperatorApprovedEmail(u.email, u.name).catch(console.error)
  }

  return json({ status: newStatus })
}
