import { randomBytes } from 'crypto'
import { sql } from './utils/db.js'
import { signToken } from './utils/auth.js'
import { CORS_HEADERS } from './utils/response.js'

export const config = { path: '/api/auth/google*' }

const BASE     = () => process.env.DEPLOY_PRIME_URL || process.env.URL || 'https://skyviewd.netlify.app'
const CALLBACK = () => `${BASE()}/api/auth/google/callback`
const isHttps  = () => BASE().startsWith('https')
const secureFl = () => isHttps() ? '; Secure' : ''

export default async (req) => {
  const url   = new URL(req.url)
  const route = url.pathname.replace('/api/auth/google', '')

  if (req.method === 'GET' && (route === '' || route === '/')) return googleRedirect(req, url)
  if (req.method === 'GET' && route === '/callback')           return googleCallback(req, url)

  return new Response('Not found', { status: 404 })
}

function googleRedirect(req, url) {
  if (!process.env.GOOGLE_CLIENT_ID)
    return new Response('Google OAuth is not configured', { status: 503 })

  const role  = ['client', 'operator'].includes(url.searchParams.get('role'))
    ? url.searchParams.get('role') : 'client'
  const nonce = randomBytes(16).toString('hex')
  const state = Buffer.from(JSON.stringify({ role, nonce })).toString('base64url')

  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  CALLBACK(),
    response_type: 'code',
    scope:         'openid email profile',
    state,
  })

  // Bind the state nonce to the initiating browser via a short-lived HttpOnly cookie
  const stateCookie = `oauth_state=${nonce}; HttpOnly${secureFl()}; SameSite=Lax; Path=/api/auth/google; Max-Age=600`

  const headers = new Headers({ Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}` })
  headers.append('Set-Cookie', stateCookie)
  return new Response(null, { status: 302, headers })
}

async function googleCallback(req, url) {
  const base  = BASE()
  const code  = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) return Response.redirect(`${base}/app/login?error=oauth_failed`, 302)

  // Verify state nonce against browser-bound cookie (CSRF protection)
  const cookie      = req.headers.get('cookie') || ''
  const nonceMatch  = cookie.match(/(?:^|;\s*)oauth_state=([^;]+)/)
  const storedNonce = nonceMatch ? nonceMatch[1] : null

  let role = 'client'
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    if (!storedNonce || decoded.nonce !== storedNonce)
      return Response.redirect(`${base}/app/login?error=oauth_failed`, 302)
    if (['client', 'operator'].includes(decoded.role)) role = decoded.role
  } catch {
    return Response.redirect(`${base}/app/login?error=oauth_failed`, 302)
  }

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
  const { id: google_id, email, name, verified_email } = await profileRes.json()

  if (!google_id || !email) return Response.redirect(`${base}/app/login?error=oauth_failed`, 302)
  // Only link/create accounts for Google-verified email addresses
  if (!verified_email) return Response.redirect(`${base}/app/login?error=email_not_verified`, 302)

  // Find existing user by Google ID
  let [user] = await sql`SELECT id, email, role, name, active FROM users WHERE google_id = ${google_id}`

  if (!user) {
    const [existing] = await sql`
      SELECT id, email, role, name, active FROM users WHERE email = ${email.toLowerCase().trim()}
    `
    if (existing) {
      await sql`UPDATE users SET google_id = ${google_id}, email_verified = true WHERE id = ${existing.id}`
      user = existing
    } else {
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
  const sf  = secureFl()
  // Clear the short-lived state cookie and set the session cookie (HttpOnly — never readable by JS)
  const clearState  = `oauth_state=; HttpOnly${sf}; SameSite=Lax; Path=/api/auth/google; Max-Age=0`
  const sessionCook = `skyview_session=${encodeURIComponent(jwt)}; HttpOnly${sf}; SameSite=Lax; Path=/; Max-Age=604800`

  // ?oauth=1 signals the client to flush any stale bearer token before reading
  // the new cookie session, preventing a prior account's token from masking it.
  const headers = new Headers({ Location: `${base}/app?oauth=1` })
  headers.append('Set-Cookie', clearState)
  headers.append('Set-Cookie', sessionCook)
  return new Response(null, { status: 302, headers })
}
