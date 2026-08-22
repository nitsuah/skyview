import { sql } from './utils/db.js'
import { requireAuth } from './utils/auth.js'
import { json, error, cors, unauthorized, forbidden } from './utils/response.js'

export const config = { path: '/api/reviews*' }

export default async (req, context) => {
  if (req.method === 'OPTIONS') return cors()

  const url = new URL(req.url)

  if (req.method === 'GET')  return listReviews(url)
  if (req.method === 'POST') return submitReview(req)

  return error('Not found', 404)
}

async function listReviews(url) {
  const operatorId = url.searchParams.get('operator_id')
  if (!operatorId) return error('operator_id is required')

  const reviews = await sql`
    SELECT r.id, r.rating, r.comment, r.created_at,
           u.name AS reviewer_name
    FROM reviews r
    JOIN users u ON r.reviewer_id = u.id
    WHERE r.operator_id = ${operatorId}
    ORDER BY r.created_at DESC
    LIMIT 50
  `
  return json(reviews)
}

async function submitReview(req) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()
  if (user.role !== 'client') return forbidden()

  const body = await req.json().catch(() => null)
  if (!body) return error('Invalid JSON')

  const { booking_id, rating, comment } = body
  if (!booking_id || !rating) return error('booking_id and rating are required')
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return error('rating must be an integer from 1 to 5')
  if (comment && comment.length > 2000)
    return error('comment must be 2000 characters or fewer')

  const [booking] = await sql`
    SELECT * FROM bookings
    WHERE id = ${booking_id} AND client_id = ${user.id} AND status = 'completed'
  `
  if (!booking) return error('Booking not found or not completed', 404)

  try {
    const [review] = await sql`
      INSERT INTO reviews (booking_id, reviewer_id, operator_id, rating, comment)
      VALUES (${booking_id}, ${user.id}, ${booking.operator_id}, ${rating}, ${comment ?? null})
      RETURNING *
    `
    return json(review, 201)
  } catch (err) {
    if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
      return error('You have already reviewed this booking', 409)
    }
    throw err
  }
}
