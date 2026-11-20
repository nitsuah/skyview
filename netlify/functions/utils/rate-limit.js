import { createHash } from 'crypto'
import { error } from './response.js'

export const requestIp = (req) =>
  req.headers.get('x-nf-client-connection-ip') ||
  (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
  'unknown'

const digest = (v) => createHash('sha256').update(String(v)).digest('hex').slice(0, 32)

// Fixed-window counter stored in Postgres. Returns { limited, retryAfter }.
// Set RATE_LIMIT_DISABLED=1 to turn it off for local development.
export async function rateLimit(sql, scope, identity, { max, windowSec }) {
  if (process.env.RATE_LIMIT_DISABLED === '1') return { limited: false, retryAfter: 0 }
  const key = `${scope}:${digest(identity)}`
  const [row] = await sql`
    INSERT INTO rate_limits (key, window_start, count)
    VALUES (${key}, to_timestamp(floor(extract(epoch FROM now()) / ${windowSec}) * ${windowSec}), 1)
    ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
    RETURNING count, extract(epoch FROM (window_start + (${windowSec} * interval '1 second') - now())) AS remaining
  `
  if (Math.random() < 0.01) {
    await sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`.catch(() => {})
  }
  const limited = Number(row.count) > max
  return { limited, retryAfter: Math.max(1, Math.ceil(Number(row.remaining) || windowSec)) }
}

// Applies every check; returns a 429 Response for the first one exceeded, else null.
export async function throttle(sql, checks) {
  for (const [scope, identity, limits] of checks) {
    const { limited, retryAfter } = await rateLimit(sql, scope, identity, limits)
    if (limited) {
      const res = error('Too many requests. Please try again later.', 429)
      res.headers.set('Retry-After', String(retryAfter))
      return res
    }
  }
  return null
}
