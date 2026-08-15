import { sql } from './utils/db.js'
import { requireAuth } from './utils/auth.js'
import { json, error, cors, unauthorized } from './utils/response.js'

export const config = { path: '/api/notifications*' }

export default async (req, context) => {
  if (req.method === 'OPTIONS') return cors()

  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()

  const url   = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  const id    = parts[2] || null

  if (req.method === 'GET' && !id)              return listNotifications(user)
  if (req.method === 'POST' && id === 'read-all') return markAllRead(user)
  if (req.method === 'POST' && id)              return markRead(user, id)

  return error('Not found', 404)
}

async function listNotifications(user) {
  const notifications = await sql`
    SELECT id, type, message, link, read, created_at
    FROM notifications
    WHERE user_id = ${user.id}
    ORDER BY created_at DESC
    LIMIT 50
  `
  const [{ unread_count }] = await sql`
    SELECT COUNT(*)::int AS unread_count FROM notifications
    WHERE user_id = ${user.id} AND read = false
  `
  return json({ notifications, unread_count })
}

async function markRead(user, id) {
  await sql`
    UPDATE notifications SET read = true
    WHERE id = ${id} AND user_id = ${user.id}
  `
  return json({ ok: true })
}

async function markAllRead(user) {
  await sql`
    UPDATE notifications SET read = true
    WHERE user_id = ${user.id} AND read = false
  `
  return json({ ok: true })
}

// Internal helper — call from other functions to create a notification
export async function createNotification(userId, type, message, link = null) {
  await sql`
    INSERT INTO notifications (user_id, type, message, link)
    VALUES (${userId}, ${type}, ${message}, ${link})
  `
}
