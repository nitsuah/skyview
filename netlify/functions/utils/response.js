const ALLOWED_ORIGIN = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://skyviewd.netlify.app'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: CORS_HEADERS })

export const error = (message, status = 400) =>
  new Response(JSON.stringify({ error: message }), { status, headers: CORS_HEADERS })

export const cors = () =>
  new Response(null, { status: 204, headers: CORS_HEADERS })

export const unauthorized = () => error('Unauthorized', 401)
export const forbidden    = () => error('Forbidden', 403)
export const notFound     = () => error('Not found', 404)
export const methodNotAllowed = () => error('Method not allowed', 405)
