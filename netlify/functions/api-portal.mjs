import { verifyPortalToken } from './utils/portal.js';
import { json, error, cors } from './utils/response.js';

export const config = { path: '/api/portal/*' };

export default async (req) => {
  if (req.method === 'OPTIONS') return cors();

  const url = new URL(req.url);
  const route = url.pathname.replace('/api/portal', '');

  if (req.method === 'POST' && route === '/verify') return verify(req);

  return error('Not found', 404);
};

async function verify(req) {
  // Fail closed: if the production secret isn't configured, deny every
  // request rather than falling back to a weaker (or no-op) check.
  const salt = process.env.PORTAL_SALT;
  if (!salt) {
    return error('Client portal is not available', 503);
  }

  const body = await req.json().catch(() => null);
  const code = body?.code;
  if (!code || typeof code !== 'string') {
    return error('Access code is required', 400);
  }

  const result = verifyPortalToken(code, salt);
  if (!result.valid) {
    // Deliberately generic — don't leak whether the code was malformed,
    // expired, or tampered with.
    return error('Invalid or expired access code', 401);
  }

  return json({ valid: true, clientId: result.clientId, expiresAt: result.expiresAt });
}
