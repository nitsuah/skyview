import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

const getSecret = () => {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET is not set')
  if (s.length < 32) throw new Error('JWT_SECRET must be at least 32 characters')
  return new TextEncoder().encode(s)
}

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifyToken(token) {
  const { payload } = await jwtVerify(token, getSecret())
  return payload
}

export function extractToken(req) {
  // Prefer Authorization header (email/password login)
  const auth = req.headers.get('authorization') || ''
  if (auth.startsWith('Bearer ')) return auth.slice(7)

  // Fall back to HttpOnly session cookie (Google OAuth)
  const cookie = req.headers.get('cookie') || ''
  const match  = cookie.match(/(?:^|;\s*)skyview_session=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export async function requireAuth(req, sql) {
  const token = extractToken(req)
  if (!token) return null
  try {
    const payload = await verifyToken(token)
    const [user] = await sql`
      SELECT id, email, role, name, email_verified, sessions_valid_after
      FROM users
      WHERE id = ${payload.sub} AND active = true
    `
    if (!user || !user.email_verified) return null
    // Reject sessions issued before the last credential change.
    if (user.sessions_valid_after) {
      const validAfter = Math.floor(new Date(user.sessions_valid_after).getTime() / 1000)
      if (!payload.iat || payload.iat < validAfter) return null
    }
    const { email_verified: _v, sessions_valid_after: _s, ...safe } = user
    return safe
  } catch {
    return null
  }
}

export const hashPassword = (password) => bcrypt.hash(password, 10)
export const checkPassword = (password, hash) => bcrypt.compare(password, hash)
