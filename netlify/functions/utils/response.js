const ALLOWED_ORIGIN = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://skyviewd.netlify.app'

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
  // Every function response here is a dynamic API call (auth, bookings,
  // portal sessions, signed download links, etc.), never static content —
  // an intermediate cache or shared browser profile must never reuse one
  // client's response for another. CWE-525, flagged on the client-portal
  // PR (#131) but applies to every consumer of this shared helper.
  'Cache-Control': 'no-store',
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: CORS_HEADERS })

export const error = (message, status = 400) =>
  new Response(JSON.stringify({ error: message }), { status, headers: CORS_HEADERS })

export const cors = () =>
  new Response(null, { status: 204, headers: CORS_HEADERS })

export const redirect = (url, status = 302) =>
  new Response(null, { status, headers: { ...CORS_HEADERS, Location: url } })

export const unauthorized = () => error('Unauthorized', 401)
export const forbidden    = () => error('Forbidden', 403)
export const notFound     = () => error('Not found', 404)
export const methodNotAllowed = () => error('Method not allowed', 405)
