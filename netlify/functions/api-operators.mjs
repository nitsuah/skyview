import { sql } from './utils/db.js'
import { requireAuth } from './utils/auth.js'
import { sendOperatorApprovedEmail } from './utils/email.js'
import { json, error, cors, unauthorized, forbidden, notFound } from './utils/response.js'
import { stripe } from './utils/stripe.js'

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
  } else if (action === 'connect') {
    if (req.method === 'POST') return connectOperator(req, id)
    if (req.method === 'GET')  return getConnectStatus(req, id)
  } else if (action === 'availability') {
    if (req.method === 'GET') return getAvailability(req, id)
    if (req.method === 'PUT') return updateAvailability(req, id)
  } else {
    if (req.method === 'GET') return getOperator(req, id)
    if (req.method === 'PUT') return updateProfile(req, id)
  }

  return error('Not found', 404)
}

async function listOperators(url) {
  const serviceType = url.searchParams.get('service')

  // Two explicit branches — Neon HTTP driver does not support nested sql fragments
  const operators = serviceType
    ? await sql`
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
          AND ${serviceType} = ANY(op.service_types::text[])
        GROUP BY u.id, u.name, op.bio, op.equipment, op.service_types,
                 op.coverage_radius_mi,
                 op.base_rate_cents, op.hourly_rate_cents, op.booking_url
        ORDER BY avg_rating DESC, review_count DESC
      `
    : await sql`
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
        GROUP BY u.id, u.name, op.bio, op.equipment, op.service_types,
                 op.coverage_radius_mi,
                 op.base_rate_cents, op.hourly_rate_cents, op.booking_url
        ORDER BY avg_rating DESC, review_count DESC
      `
  return json(operators)
}

async function getOperator(req, id) {
  // Operators fetching their own profile get private fields (coordinates, cert data)
  const user = await requireAuth(req, sql)
  const isSelf = user?.role === 'operator' && user.id === id

  if (isSelf) {
    const [op] = await sql`
      SELECT u.id, u.name,
             op.bio, op.equipment, op.service_types,
             op.coverage_lat, op.coverage_lng, op.coverage_radius_mi,
             op.base_rate_cents, op.hourly_rate_cents, op.booking_url,
             op.faa_cert_number, op.faa_cert_expires_at,
             op.verification_status,
             COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS avg_rating,
             COUNT(r.id)::int AS review_count
      FROM operator_profiles op
      JOIN users u ON op.user_id = u.id
      LEFT JOIN reviews r ON r.operator_id = u.id
      WHERE u.id = ${id}
      GROUP BY u.id, u.name, op.bio, op.equipment, op.service_types,
               op.coverage_lat, op.coverage_lng, op.coverage_radius_mi,
               op.base_rate_cents, op.hourly_rate_cents, op.booking_url,
               op.faa_cert_number, op.faa_cert_expires_at,
               op.verification_status
    `
    if (!op) return notFound()
    return json(op)
  }

  // Public profile — verified operators only, no private fields
  const [op] = await sql`
    SELECT u.id, u.name,
           op.bio, op.equipment, op.service_types,
           op.coverage_radius_mi,
           op.base_rate_cents, op.hourly_rate_cents, op.booking_url,
           COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS avg_rating,
           COUNT(r.id)::int AS review_count
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

  const [profile] = await sql`
    SELECT id, faa_cert_number, faa_cert_expires_at
    FROM operator_profiles WHERE user_id = ${targetId}
  `
  if (!profile) return notFound()

  const body = await req.json().catch(() => null)
  if (!body) return error('Invalid JSON')

  const {
    bio, equipment, service_types, coverage_lat, coverage_lng, coverage_radius_mi,
    base_rate_cents, hourly_rate_cents, booking_url,
    faa_cert_number, faa_cert_expires_at
  } = body

  // Distinguish explicit null (clear the field) from omitted (keep existing value)
  const hasCoverageLat = Object.hasOwn(body, 'coverage_lat')
  const hasCoverageLng = Object.hasOwn(body, 'coverage_lng')

  if (booking_url != null) {
    try {
      const u = new URL(booking_url)
      if (u.protocol !== 'https:') return error('booking_url must use HTTPS')
    } catch {
      return error('booking_url is not a valid URL')
    }
  }

  // Only reset verification when cert values actually differ from what's stored
  const certChanging = (
    (faa_cert_number != null && faa_cert_number !== profile.faa_cert_number) ||
    (faa_cert_expires_at != null && faa_cert_expires_at !== String(profile.faa_cert_expires_at ?? '').slice(0, 10))
  )

  const [updated] = await sql`
    UPDATE operator_profiles SET
      bio                = COALESCE(${bio ?? null}, bio),
      equipment          = COALESCE(${equipment ?? null}, equipment),
      service_types      = COALESCE(${service_types ?? null}, service_types),
      coverage_lat       = CASE WHEN ${hasCoverageLat} THEN ${coverage_lat ?? null} ELSE coverage_lat END,
      coverage_lng       = CASE WHEN ${hasCoverageLng} THEN ${coverage_lng ?? null} ELSE coverage_lng END,
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

async function connectOperator(req, id) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()
  if (user.role !== 'admin' && (user.role !== 'operator' || user.id !== id)) return forbidden()
  if (!stripe) return error('Stripe is not configured', 503)

  const [profile] = await sql`SELECT stripe_account_id, stripe_onboarded FROM operator_profiles WHERE user_id = ${id}`
  if (!profile) return notFound()

  let accountId = profile.stripe_account_id
  if (!accountId) {
    const [u] = await sql`SELECT email, name FROM users WHERE id = ${id}`
    if (!u) return notFound()
    const account = await stripe.accounts.create(
      {
        type: 'express',
        email: u.email,
        capabilities: { transfers: { requested: true } },
        metadata: { operator_user_id: id },
      },
      { idempotencyKey: `create-connect-account-${id}` }
    )
    // Conditional update — safe when concurrent requests share the same idempotencyKey
    const [saved] = await sql`
      UPDATE operator_profiles SET stripe_account_id = ${account.id}
      WHERE user_id = ${id} AND stripe_account_id IS NULL
      RETURNING stripe_account_id
    `
    accountId = saved ? account.id
      : (await sql`SELECT stripe_account_id FROM operator_profiles WHERE user_id = ${id}`)[0]?.stripe_account_id
  }

  const base = process.env.URL || 'https://skyviewd.netlify.app'
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${base}/operator/connect`,
    return_url: `${base}/operator/dashboard`,
    type: 'account_onboarding',
  })

  return json({ onboarding_url: link.url, account_id: accountId })
}

async function getConnectStatus(req, id) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()
  if (user.role !== 'admin' && (user.role !== 'operator' || user.id !== id)) return forbidden()

  const [profile] = await sql`
    SELECT stripe_account_id, stripe_onboarded FROM operator_profiles WHERE user_id = ${id}
  `
  if (!profile) return notFound()
  return json({ account_id: profile.stripe_account_id, onboarded: profile.stripe_onboarded ?? false })
}

async function verifyOperator(req, id) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()
  if (user.role !== 'admin') return forbidden()

  const body = await req.json().catch(() => null)
  const action = body?.action  // 'approve' | 'reject' | 'suspend'
  const reason = body?.reason ?? null

  const statusMap = { approve: 'verified', reject: 'rejected', suspend: 'suspended' }
  const newStatus = statusMap[action]
  if (!newStatus) return error("action must be 'approve', 'reject', or 'suspend'")

  const [op] = await sql`
    UPDATE operator_profiles SET
      verification_status = ${newStatus},
      rejection_reason    = ${action === 'reject' ? reason : null},
      verified_at         = ${action === 'approve' ? new Date() : null},
      verified_by         = ${action === 'approve' ? user.id : null}
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

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

async function getAvailability(req, id) {
  // Blocked-date reasons are free-form text the operator typed for themselves
  // ("surgery", "family trip"); only the operator and admins may read them.
  // Everyone else just learns that the date is unavailable.
  const user = await requireAuth(req, sql)
  const canSeeReasons = user?.role === 'admin' || (user?.role === 'operator' && user.id === id)

  const [weekly, blocked] = await Promise.all([
    sql`SELECT day_of_week, start_time, end_time FROM operator_availability WHERE operator_id = ${id} ORDER BY day_of_week, start_time`,
    sql`SELECT blocked_date, reason FROM operator_blocked_dates WHERE operator_id = ${id} AND blocked_date >= CURRENT_DATE ORDER BY blocked_date`,
  ])
  return json({
    weekly,
    blocked: canSeeReasons ? blocked : blocked.map(({ blocked_date }) => ({ blocked_date })),
  })
}

async function updateAvailability(req, id) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()
  if (user.role !== 'admin' && (user.role !== 'operator' || user.id !== id)) return forbidden()

  const body = await req.json().catch(() => null)
  if (!body) return error('Invalid JSON')

  // Replace-all semantics: a missing or wrong-shaped field must be rejected, not
  // coerced to [], or a malformed request would silently wipe the calendar.
  if (!Array.isArray(body.weekly) || !Array.isArray(body.blocked))
    return error('weekly and blocked must both be arrays')

  const weekly  = body.weekly
  const blocked = body.blocked

  if (weekly.length > 50) return error('Too many weekly availability windows (max 50)')
  if (blocked.length > 200) return error('Too many blocked dates (max 200)')

  for (const w of weekly) {
    if (!Number.isInteger(w.day_of_week) || w.day_of_week < 0 || w.day_of_week > 6)
      return error('Each weekly entry needs day_of_week between 0 (Sunday) and 6 (Saturday)')
    if (typeof w.start_time !== 'string' || !TIME_RE.test(w.start_time))
      return error('Each weekly entry needs a valid start_time (HH:MM)')
    if (typeof w.end_time !== 'string' || !TIME_RE.test(w.end_time))
      return error('Each weekly entry needs a valid end_time (HH:MM)')
    if (w.end_time <= w.start_time)
      return error('end_time must be after start_time for every weekly entry')
  }
  for (const b of blocked) {
    if (typeof b.date !== 'string' || !DATE_RE.test(b.date))
      return error('Each blocked date needs a valid date (YYYY-MM-DD)')
    if (b.reason != null && (typeof b.reason !== 'string' || b.reason.length > 200))
      return error('Blocked-date reason must be a string of 200 characters or fewer')
  }

  const [profile] = await sql`SELECT id FROM operator_profiles WHERE user_id = ${id}`
  if (!profile) return notFound()

  // Replace-all in ONE transaction: if any insert fails the deletes roll back,
  // so an operator's existing calendar is never left erased or half-written
  // (an empty calendar reads as "unrestricted"), and concurrent saves can't
  // interleave their deletes and inserts.
  await sql.transaction(txn => [
    txn`DELETE FROM operator_availability WHERE operator_id = ${id}`,
    txn`DELETE FROM operator_blocked_dates WHERE operator_id = ${id}`,
    ...weekly.map(w => txn`
      INSERT INTO operator_availability (operator_id, day_of_week, start_time, end_time)
      VALUES (${id}, ${w.day_of_week}, ${w.start_time}, ${w.end_time})
    `),
    ...blocked.map(b => txn`
      INSERT INTO operator_blocked_dates (operator_id, blocked_date, reason)
      VALUES (${id}, ${b.date}, ${b.reason ?? null})
      ON CONFLICT (operator_id, blocked_date) DO UPDATE SET reason = EXCLUDED.reason
    `),
  ])

  return getAvailability(req, id)
}
