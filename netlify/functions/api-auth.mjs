import { randomBytes, createHash } from 'crypto'
const hashToken = (t) => createHash('sha256').update(t).digest('hex')
import { sql } from './utils/db.js'
import { signToken, hashPassword, checkPassword, requireAuth } from './utils/auth.js'
import { sendVerificationEmail, sendPasswordResetEmail } from './utils/email.js'
import { json, error, cors, unauthorized } from './utils/response.js'

export const config = { path: '/api/auth/*' }

export default async (req, context) => {
  if (req.method === 'OPTIONS') return cors()

  const url = new URL(req.url)
  const route = url.pathname.replace('/api/auth', '')

  if (req.method === 'POST' && route === '/register')        return register(req)
  if (req.method === 'POST' && route === '/login')           return login(req)
  if (req.method === 'GET'  && route === '/me')              return me(req)
  if (req.method === 'GET'  && route === '/verify')          return verifyEmail(url)
  if (req.method === 'POST' && route === '/forgot-password')         return forgotPassword(req)
  if (req.method === 'POST' && route === '/reset-password')          return resetPassword(req)
  if (req.method === 'POST' && route === '/resend-verification')     return resendVerification(req)

  return error('Not found', 404)
}

async function register(req) {
  const body = await req.json().catch(() => null)
  if (!body) return error('Invalid JSON')

  const { email, password, role, name } = body
  if (!email || !password || !role || !name)
    return error('email, password, role, and name are required')
  if (!['client', 'operator'].includes(role))
    return error('role must be client or operator')
  if (password.length < 8)
    return error('Password must be at least 8 characters')

  const [existing] = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}`
  if (existing) return error('An account with this email already exists', 409)

  const password_hash = await hashPassword(password)
  const [user] = await sql`
    INSERT INTO users (email, password_hash, role, name)
    VALUES (${email.toLowerCase().trim()}, ${password_hash}, ${role}, ${name.trim()})
    RETURNING id, email, role, name
  `

  if (role === 'operator') {
    await sql`INSERT INTO operator_profiles (user_id) VALUES (${user.id})`
  }

  // Email verification (fire-and-forget)
  if (process.env.RESEND_API_KEY) {
    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 86_400_000) // 24h
    await sql`INSERT INTO email_tokens (user_id, token_hash, expires_at) VALUES (${user.id}, ${hashToken(token)}, ${expires})`
    sendVerificationEmail(user.email, token).catch(console.error)
  }

  const jwt = await signToken({ sub: user.id, role: user.role })
  return json({ user, token: jwt }, 201)
}

async function login(req) {
  const body = await req.json().catch(() => null)
  if (!body) return error('Invalid JSON')

  const { email, password } = body
  if (!email || !password) return error('email and password are required')

  const [user] = await sql`
    SELECT id, email, role, name, password_hash, active
    FROM users WHERE email = ${email.toLowerCase().trim()}
  `
  if (!user || !user.active) return error('Invalid email or password', 401)

  const valid = await checkPassword(password, user.password_hash)
  if (!valid) return error('Invalid email or password', 401)

  const { password_hash: _, ...safeUser } = user
  const jwt = await signToken({ sub: user.id, role: user.role })
  return json({ user: safeUser, token: jwt })
}

async function me(req) {
  const user = await requireAuth(req, sql)
  if (!user) return unauthorized()

  if (user.role === 'operator') {
    const [profile] = await sql`
      SELECT verification_status, faa_cert_expires_at, stripe_onboarded,
             service_types, coverage_lat, coverage_lng, coverage_radius_mi,
             base_rate_cents, hourly_rate_cents, booking_url, bio
      FROM operator_profiles WHERE user_id = ${user.id}
    `
    return json({ ...user, profile: profile || {} })
  }

  return json(user)
}

async function verifyEmail(url) {
  const token = url.searchParams.get('token')
  if (!token) return error('Missing token')

  const [record] = await sql`
    SELECT id, user_id, expires_at, used_at FROM email_tokens WHERE token_hash = ${hashToken(token)}
  `
  if (!record)          return error('Invalid or expired token', 404)
  if (record.used_at)   return error('Token already used', 410)
  if (new Date(record.expires_at) < new Date()) return error('Token expired', 410)

  await sql`UPDATE users SET email_verified = true WHERE id = ${record.user_id}`
  await sql`UPDATE email_tokens SET used_at = NOW() WHERE id = ${record.id}`

  const base = process.env.DEPLOY_PRIME_URL || process.env.URL || 'https://skyviewd.netlify.app'
  return Response.redirect(`${base}/app?verified=1`, 302)
}

async function resendVerification(req) {
  const body = await req.json().catch(() => null)
  const { email } = body ?? {}
  if (!email) return error('email is required')

  const [user] = await sql`
    SELECT id, email_verified, active FROM users WHERE email = ${email.toLowerCase().trim()}
  `
  // Always return 200 to avoid email enumeration
  if (!user || !user.active || user.email_verified) return json({ ok: true })

  if (process.env.RESEND_API_KEY) {
    const token   = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 86_400_000) // 24h
    await sql`INSERT INTO email_tokens (user_id, token_hash, expires_at) VALUES (${user.id}, ${hashToken(token)}, ${expires})`
    sendVerificationEmail(user.email, token).catch(console.error)
  }
  return json({ ok: true })
}

async function forgotPassword(req) {
  const body = await req.json().catch(() => null)
  if (!body) return error('Invalid JSON')

  const { email } = body
  if (!email) return error('email is required')

  const [user] = await sql`SELECT id, active FROM users WHERE email = ${email.toLowerCase().trim()}`
  // Always return 200 to avoid email enumeration
  if (!user || !user.active) return json({ ok: true })

  const token   = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 3_600_000) // 1 hour
  await sql`
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (${user.id}, ${hashToken(token)}, ${expires})
  `
  if (process.env.RESEND_API_KEY) {
    sendPasswordResetEmail(email.toLowerCase().trim(), token).catch(console.error)
  }
  return json({ ok: true })
}

async function resetPassword(req) {
  const body = await req.json().catch(() => null)
  if (!body) return error('Invalid JSON')

  const { token, password } = body
  if (!token || !password) return error('token and password are required')
  if (password.length < 8) return error('Password must be at least 8 characters')

  const password_hash = await hashPassword(password)

  // Atomic claim: mark token used and fetch user_id in one query to prevent replay
  const [claimed] = await sql`
    UPDATE password_reset_tokens
    SET used_at = NOW()
    WHERE token_hash = ${hashToken(token)}
      AND used_at IS NULL
      AND expires_at > NOW()
    RETURNING user_id
  `
  if (!claimed) return error('Invalid or expired reset link', 400)

  await sql`UPDATE users SET password_hash = ${password_hash} WHERE id = ${claimed.user_id}`

  return json({ ok: true })
}
