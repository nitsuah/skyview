import { sql } from './utils/db.js'
import { requireAuth } from './utils/auth.js'
import { json, error, cors, unauthorized, forbidden } from './utils/response.js'

export const config = { path: '/api/admin/*' }

export default async (req, context) => {
  if (req.method === 'OPTIONS') return cors()

  const user = await requireAuth(req, sql)
  if (!user)              return unauthorized()
  if (user.role !== 'admin') return forbidden()

  const url   = new URL(req.url)
  const route = url.pathname.replace('/api/admin', '')

  if (req.method === 'GET' && route === '/dashboard')          return dashboard()
  if (req.method === 'GET' && route === '/pending-operators')  return pendingOperators()
  if (req.method === 'GET' && route === '/jobs')               return allJobs()
  if (req.method === 'GET' && route === '/users')              return allUsers()

  return error('Not found', 404)
}

async function dashboard() {
  const [stats] = await sql`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'client')   AS client_count,
      (SELECT COUNT(*) FROM users WHERE role = 'operator') AS operator_count,
      (SELECT COUNT(*) FROM operator_profiles WHERE verification_status = 'verified')      AS verified_operators,
      (SELECT COUNT(*) FROM operator_profiles WHERE verification_status = 'under_review')  AS pending_verifications,
      (SELECT COUNT(*) FROM jobs WHERE status = 'open')      AS open_jobs,
      (SELECT COUNT(*) FROM jobs WHERE status = 'completed') AS completed_jobs,
      (SELECT COUNT(*) FROM bookings WHERE status = 'completed') AS completed_bookings,
      (SELECT COALESCE(SUM(platform_fee_cents), 0) FROM bookings WHERE status = 'completed') AS total_revenue_cents
  `
  return json(stats)
}

async function pendingOperators() {
  const operators = await sql`
    SELECT
      u.id, u.name, u.email, u.created_at,
      op.faa_cert_number, op.faa_cert_expires_at, op.faa_cert_blob_key,
      op.verification_status, op.service_types, op.bio, op.equipment
    FROM operator_profiles op
    JOIN users u ON op.user_id = u.id
    WHERE op.verification_status IN ('pending', 'under_review')
    ORDER BY u.created_at ASC
  `
  return json(operators)
}

async function allJobs() {
  const jobs = await sql`
    SELECT j.*, u.name AS client_name, ou.name AS operator_name
    FROM jobs j
    JOIN users u ON j.client_id = u.id
    LEFT JOIN users ou ON j.assigned_operator_id = ou.id
    ORDER BY j.created_at DESC
    LIMIT 100
  `
  return json(jobs)
}

async function allUsers() {
  const users = await sql`
    SELECT u.id, u.email, u.name, u.role, u.active, u.email_verified, u.created_at,
      op.verification_status
    FROM users u
    LEFT JOIN operator_profiles op ON op.user_id = u.id
    ORDER BY u.created_at DESC
    LIMIT 200
  `
  return json(users)
}
