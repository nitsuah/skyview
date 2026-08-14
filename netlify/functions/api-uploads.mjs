import { getStore } from '@netlify/blobs'
import { sql } from './utils/db.js'
import { requireAuth } from './utils/auth.js'
import { json, error, cors, unauthorized, forbidden } from './utils/response.js'

export const config = { path: '/api/uploads*' }

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export default async (req, context) => {
  if (req.method === 'OPTIONS') return cors()

  const url   = new URL(req.url)
  const route = url.pathname.replace('/api/uploads', '')

  if (req.method === 'POST' && route === '/cert')        return uploadCert(req)
  if (req.method === 'POST' && route === '/deliverable') return uploadDeliverable(req, url)

  return error('Not found', 404)
}

async function uploadCert(req) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()
  if (user.role !== 'operator') return forbidden()

  const formData = await req.formData().catch(() => null)
  if (!formData) return error('Expected multipart/form-data')

  const file = formData.get('cert')
  if (!file || !(file instanceof File)) return error('cert field must be a file')
  if (!ALLOWED_TYPES.includes(file.type)) return error('cert must be a PDF or image (JPEG, PNG, WebP)')
  if (file.size > MAX_SIZE) return error('cert must be under 10MB')

  const [profile] = await sql`SELECT id FROM operator_profiles WHERE user_id = ${user.id}`
  if (!profile) return error('Operator profile not found — complete onboarding first', 422)

  const store = getStore({ name: 'operator-certs', consistency: 'strong' })
  const key   = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  await store.set(key, await file.arrayBuffer(), {
    metadata: { userId: user.id, fileName: file.name, mimeType: file.type }
  })

  await sql`
    UPDATE operator_profiles SET
      faa_cert_blob_key   = ${key},
      verification_status = 'under_review'
    WHERE user_id = ${user.id}
  `

  return json({ message: 'Certificate uploaded. Admin review typically completes within 24 hours.' })
}

async function uploadDeliverable(req, url) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()
  if (user.role !== 'operator' && user.role !== 'admin') return forbidden()

  const bookingId = url.searchParams.get('booking_id')
  if (!bookingId) return error('booking_id query parameter is required')

  const [booking] = await sql`SELECT * FROM bookings WHERE id = ${bookingId}`
  if (!booking) return error('Booking not found', 404)
  if (booking.operator_id !== user.id && user.role !== 'admin') return forbidden()

  const formData = await req.formData().catch(() => null)
  if (!formData) return error('Expected multipart/form-data')

  const file = formData.get('file')
  if (!file || !(file instanceof File)) return error('file field must be a file')
  if (file.size > 500 * 1024 * 1024) return error('Deliverable must be under 500MB')

  const store  = getStore({ name: 'deliverables', consistency: 'strong' })
  const key    = `${bookingId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  await store.set(key, await file.arrayBuffer(), {
    metadata: { bookingId, userId: user.id, fileName: file.name, mimeType: file.type }
  })

  const [deliverable] = await sql`
    INSERT INTO deliverables (booking_id, blob_key, file_name, file_type, file_size_bytes)
    VALUES (${bookingId}, ${key}, ${file.name}, ${file.type}, ${file.size})
    RETURNING *
  `

  return json(deliverable, 201)
}
