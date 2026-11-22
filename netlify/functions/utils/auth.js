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
  return extractCredential(req)?.token ?? null
}

// Returns the session token and where it came from ('header' or 'cookie').
function extractCredential(req) {
  // An explicit Authorization header wins (API clients)
  const auth = req.headers.get('authorization') || ''
  if (auth.startsWith('Bearer ')) return { token: auth.slice(7), source: 'header' }

  // Browser sessions use the HttpOnly session cookie
  const cookie = req.headers.get('cookie') || ''
  const match  = cookie.match(/(?:^|;\s*)skyview_session=([^;]+)/)
  if (!match) return null
  try {
    return { token: decodeURIComponent(match[1]), source: 'cookie' }
  } catch {
    return null // malformed cookie value: treat as signed out, not a 500
  }
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// True when a browser says the request came from another site. Uses
// Sec-Fetch-Site when sent, else compares Origin with the request's own origin.
// Requests with neither header (non-browser clients) are not cross-site.
export function isCrossSiteRequest(req) {
  const site = req.headers.get('sec-fetch-site')
  if (site) return site !== 'same-origin' && site !== 'none'
  const origin = req.headers.get('origin')
  if (!origin) return false
  try {
    return origin !== new URL(req.url).origin
  } catch {
    return true
  }
}

export async function requireAuth(req, sql) {
  const credential = extractCredential(req)
  if (!credential) return null
  // CSRF: a cookie must not authorize a state-changing request from another site
  if (credential.source === 'cookie' && UNSAFE_METHODS.has(req.method) && isCrossSiteRequest(req)) {
    return null
  }
  const { token } = credential
  try {
    const payload = await verifyToken(token)
    const [user] = await sql`
      SELECT id, email, role, name, email_verified, session_version
      FROM users
      WHERE id = ${payload.sub} AND active = true
    `
    // Unverified accounts hold no session, whatever token is presented
    if (!user || !user.email_verified) return null
    // Reject tokens from before the last revocation (tokens without sv predate
    // versioning and count as version 0)
    if ((payload.sv ?? 0) !== user.session_version) return null
    // Keep the version out of the returned user object
    const { session_version: _version, email_verified: _verified, ...safe } = user
    return safe
  } catch {
    return null
  }
}

export const hashPassword = (password) => bcrypt.hash(password, 10)
export const checkPassword = (password, hash) => bcrypt.compare(password, hash)
