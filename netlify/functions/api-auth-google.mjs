import { randomBytes } from 'crypto'
import { sql } from './utils/db.js'
import { signToken } from './utils/auth.js'

export const config = { path: '/api/auth/google*' }

const BASE        = () => process.env.DEPLOY_PRIME_URL || process.env.URL || 'https://skyviewd.netlify.app'
const CALLBACK    = () => `${BASE()}/api/auth/google/callback`

export default async (req) => {
  const url   = new URL(req.url)
  const route = url.pathname.replace('/api/auth/google', '')

  if (req.method === 'GET' && (route === '' || route === '/')) return googleRedirect(url)
  if (req.method === 'GET' && route === '/callback')           return googleCallback(url)

  return new Response('Not found', { status: 404 })
}

function googleRedirect(url) {
  if (!process.env.GOOGLE_CLIENT_ID)
    return new Response('Google OAuth is not configured', { status: 503 })

  const role  = ['client', 'operator'].includes(url.searchParams.get('role'))
    ? url.searchParams.get('role') : 'client'
  const state = Buffer.from(JSON.stringify({ role, nonce: randomBytes(8).toString('hex') }))
    .toString('base64url')

  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  CALLBACK(),
    response_type: 'code',
    scope:         'openid email profile',
    state,
  })

  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302)
}

async function googleCallback(url) {
  const base  = BASE()
  const code  = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) return Response.redirect(`${base}/app/login?error=oauth_failed`, 302)

  let role = 'client'
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    if (['client', 'operator'].includes(decoded.role)) role = decoded.role
  } catch { /* use default role */ }

  // Exchange authorization code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri:  CALLBACK(),
      grant_type:    'authorization_code',
    }),
  })
  if (!tokenRes.ok) {
    console.error('Google token exchange failed:', await tokenRes.text())
    return Response.redirect(`${base}/app/login?error=oauth_failed`, 302)
  }
  const { access_token } = await tokenRes.json()

  // Fetch Google user profile
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  if (!profileRes.ok) return Response.redirect(`${base}/app/login?error=oauth_failed`, 302)
  const { id: google_id, email, name } = await profileRes.json()

  if (!google_id || !email) return Response.redirect(`${base}/app/login?error=oauth_failed`, 302)

  // Find existing user by Google ID
  let [user] = await sql`SELECT id, email, role, name, active FROM users WHERE google_id = ${google_id}`

  if (!user) {
    // Check if account with this email already exists (password-based)
    const [existing] = await sql`
      SELECT id, email, role, name, active FROM users WHERE email = ${email.toLowerCase().trim()}
    `
    if (existing) {
      // Link Google to existing account and mark email verified
      await sql`UPDATE users SET google_id = ${google_id}, email_verified = true WHERE id = ${existing.id}`
      user = existing
    } else {
      // Create new Google-only account (password_hash nullable after migration 005)
      const [created] = await sql`
        INSERT INTO users (email, password_hash, role, name, google_id, email_verified)
        VALUES (${email.toLowerCase().trim()}, NULL, ${role}, ${name ?? email.split('@')[0]}, ${google_id}, true)
        RETURNING id, email, role, name, active
      `
      user = created
      if (role === 'operator') {
        await sql`INSERT INTO operator_profiles (user_id) VALUES (${user.id})`
      }
    }
  }

  if (!user.active) return Response.redirect(`${base}/app/login?error=account_disabled`, 302)

  const jwt = await signToken({ sub: user.id, role: user.role })
  // Use fragment so the JWT is never sent to servers or captured in access logs / Referer headers
  return Response.redirect(`${base}/app#token=${encodeURIComponent(jwt)}`, 302)
}
