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
  const auth = req.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ')) return null
  return auth.slice(7)
}

export async function requireAuth(req, sql) {
  const token = extractToken(req)
  if (!token) return null
  try {
    const payload = await verifyToken(token)
    const [user] = await sql`
      SELECT id, email, role, name
      FROM users
      WHERE id = ${payload.sub} AND active = true
    `
    return user || null
  } catch {
    return null
  }
}

export const hashPassword = (password) => bcrypt.hash(password, 10)
export const checkPassword = (password, hash) => bcrypt.compare(password, hash)
