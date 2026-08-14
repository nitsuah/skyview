import { sql } from './utils/db.js'
import { requireAuth } from './utils/auth.js'
import { sendJobAlertEmail } from './utils/email.js'
import { json, error, cors, unauthorized, forbidden, notFound } from './utils/response.js'

export const config = { path: '/api/jobs*' }

export default async (req, context) => {
  if (req.method === 'OPTIONS') return cors()

  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  // ['api','jobs'] or ['api','jobs','<uuid>']
  const id = parts[2] || null

  if (!id) {
    if (req.method === 'GET')  return listJobs(req)
    if (req.method === 'POST') return createJob(req)
  } else {
    if (req.method === 'GET') return getJob(req, id)
    if (req.method === 'PUT') return updateJob(req, id)
  }

  return error('Not found', 404)
}

async function listJobs(req) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()

  if (user.role === 'client') {
    const jobs = await sql`
      SELECT j.*, u.name AS client_name
      FROM jobs j JOIN users u ON j.client_id = u.id
      WHERE j.client_id = ${user.id}
      ORDER BY j.created_at DESC
    `
    return json(jobs)
  }

  if (user.role === 'operator') {
    const [profile] = await sql`
      SELECT coverage_lat, coverage_lng, coverage_radius_mi, service_types
      FROM operator_profiles WHERE user_id = ${user.id}
    `
    if (!profile?.coverage_lat) {
      // Profile incomplete — return empty so dashboard can prompt setup
      return json([])
    }

    // Haversine distance filter (SQL-level, no PostGIS required)
    // Two separate queries avoid nested sql template literals (unsupported by Neon HTTP driver)
    const haversineBase = `
      SELECT j.*, u.name AS client_name,
        (3958.8 * acos(LEAST(1.0,
          cos(radians(${profile.coverage_lat})) * cos(radians(j.location_lat)) *
          cos(radians(j.location_lng) - radians(${profile.coverage_lng})) +
          sin(radians(${profile.coverage_lat})) * sin(radians(j.location_lat))
        ))) AS distance_miles
      FROM jobs j JOIN users u ON j.client_id = u.id
      WHERE j.status = 'open' AND j.location_lat IS NOT NULL
    `
    const jobs = profile.service_types?.length > 0
      ? await sql`
          SELECT j.*, u.name AS client_name,
            (3958.8 * acos(LEAST(1.0,
              cos(radians(${profile.coverage_lat})) * cos(radians(j.location_lat)) *
              cos(radians(j.location_lng) - radians(${profile.coverage_lng})) +
              sin(radians(${profile.coverage_lat})) * sin(radians(j.location_lat))
            ))) AS distance_miles
          FROM jobs j JOIN users u ON j.client_id = u.id
          WHERE j.status = 'open' AND j.location_lat IS NOT NULL
            AND j.service_type = ANY(${profile.service_types}::text[])
          ORDER BY j.preferred_date ASC NULLS LAST, j.created_at DESC
        `
      : await sql`
          SELECT j.*, u.name AS client_name,
            (3958.8 * acos(LEAST(1.0,
              cos(radians(${profile.coverage_lat})) * cos(radians(j.location_lat)) *
              cos(radians(j.location_lng) - radians(${profile.coverage_lng})) +
              sin(radians(${profile.coverage_lat})) * sin(radians(j.location_lat))
            ))) AS distance_miles
          FROM jobs j JOIN users u ON j.client_id = u.id
          WHERE j.status = 'open' AND j.location_lat IS NOT NULL
          ORDER BY j.preferred_date ASC NULLS LAST, j.created_at DESC
        `
    // Filter by radius after fetch (avoids HAVING with aggregate confusion)
    const radius = profile.coverage_radius_mi || 50
    return json(jobs.filter(j => j.distance_miles <= radius))
  }

  if (user.role === 'admin') {
    const jobs = await sql`
      SELECT j.*, u.name AS client_name, ou.name AS operator_name
      FROM jobs j
      JOIN users u ON j.client_id = u.id
      LEFT JOIN users ou ON j.assigned_operator_id = ou.id
      ORDER BY j.created_at DESC
      LIMIT 200
    `
    return json(jobs)
  }

  return unauthorized()
}

async function createJob(req) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()
  if (user.role !== 'client' && user.role !== 'admin') return forbidden()

  const body = await req.json().catch(() => null)
  if (!body) return error('Invalid JSON')

  const { title, service_type, description, location_address, location_lat, location_lng, preferred_date, preferred_time, budget_cents } = body
  if (!title || !service_type) return error('title and service_type are required')

  const [job] = await sql`
    INSERT INTO jobs (client_id, title, service_type, description, location_address, location_lat, location_lng, preferred_date, preferred_time, budget_cents)
    VALUES (${user.id}, ${title}, ${service_type}, ${description ?? null}, ${location_address ?? null},
            ${location_lat ?? null}, ${location_lng ?? null}, ${preferred_date ?? null},
            ${preferred_time ?? null}, ${budget_cents ?? null})
    RETURNING *
  `

  // Alert nearby verified operators (fire-and-forget)
  if (process.env.RESEND_API_KEY && location_lat && location_lng) {
    alertNearbyOperators(job).catch(console.error)
  }

  return json(job, 201)
}

async function alertNearbyOperators(job) {
  const operators = await sql`
    SELECT u.email, u.name, op.coverage_radius_mi,
      (3958.8 * acos(LEAST(1.0,
        cos(radians(op.coverage_lat)) * cos(radians(${job.location_lat})) *
        cos(radians(${job.location_lng}) - radians(op.coverage_lng)) +
        sin(radians(op.coverage_lat)) * sin(radians(${job.location_lat}))
      ))) AS distance_miles
    FROM operator_profiles op JOIN users u ON op.user_id = u.id
    WHERE op.verification_status = 'verified'
      AND op.coverage_lat IS NOT NULL
      AND ${job.service_type} = ANY(op.service_types::text[])
  `
  const nearby = operators.filter(o => o.distance_miles <= (o.coverage_radius_mi || 50))
  for (const op of nearby) {
    await sendJobAlertEmail(op.email, job).catch(() => {})
  }
}

async function getJob(req, id) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()

  const [job] = await sql`
    SELECT j.*, u.name AS client_name
    FROM jobs j JOIN users u ON j.client_id = u.id
    WHERE j.id = ${id}
  `
  if (!job) return notFound()
  if (user.role === 'client' && job.client_id !== user.id) return forbidden()

  return json(job)
}

async function updateJob(req, id) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()
  // Only the owning client or an admin may update a job
  if (user.role !== 'client' && user.role !== 'admin') return forbidden()

  const [job] = await sql`SELECT * FROM jobs WHERE id = ${id}`
  if (!job) return notFound()
  if (user.role === 'client' && job.client_id !== user.id) return forbidden()

  const body = await req.json().catch(() => null)
  if (!body) return error('Invalid JSON')

  const allowed = ['status', 'description', 'preferred_date', 'preferred_time', 'budget_cents']
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
  if (!Object.keys(updates).length) return error('No valid fields to update')

  // Build SET clause dynamically using tagged template
  const [updated] = await sql`
    UPDATE jobs SET
      status = COALESCE(${updates.status ?? null}, status),
      description = COALESCE(${updates.description ?? null}, description),
      preferred_date = COALESCE(${updates.preferred_date ?? null}, preferred_date),
      preferred_time = COALESCE(${updates.preferred_time ?? null}, preferred_time),
      budget_cents = COALESCE(${updates.budget_cents ?? null}, budget_cents)
    WHERE id = ${id}
    RETURNING *
  `
  return json(updated)
}
