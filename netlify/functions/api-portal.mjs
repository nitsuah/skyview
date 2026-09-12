import {
  verifyPortalToken,
  generateSessionToken,
  verifySessionToken,
  generateSignedDownloadToken,
  verifySignedDownloadToken,
  logPortalAccess,
} from './utils/portal.js';
import { getManifestForClient, findFile } from './utils/portal-manifest.js';
import { json, error, cors, redirect } from './utils/response.js';

export const config = { path: '/api/portal/*' };

export default async (req) => {
  if (req.method === 'OPTIONS') return cors();

  const url = new URL(req.url);
  const route = url.pathname.replace('/api/portal', '');

  if (req.method === 'POST' && route === '/verify') return verify(req);
  if (req.method === 'GET' && route === '/files') return listFiles(req);
  if (req.method === 'GET' && route === '/download') return createDownloadLink(req, url);
  if (req.method === 'GET' && route === '/file') return serveFile(req, url);

  return error('Not found', 404);
};

function requestIp(req) {
  return req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'unknown';
}

function bearerToken(req) {
  const auth = req.headers.get('authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

function requireSession(req, salt) {
  const token = bearerToken(req);
  if (!token) return { valid: false, reason: 'missing_session' };
  return verifySessionToken(token, salt);
}

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
  logPortalAccess('login_attempt', {
    valid: result.valid,
    reason: result.reason,
    clientId: result.clientId,
    ip: requestIp(req),
  });

  if (!result.valid) {
    // Deliberately generic — don't leak whether the code was malformed,
    // expired, or tampered with.
    return error('Invalid or expired access code', 401);
  }

  // Exchange the (long-lived, 30-day) access code for a short-lived (1
  // hour) session token right away. The client then uses this session —
  // never the original code — for every gallery-to-server call, and the
  // login page delivers it to the gallery via a URL fragment rather than a
  // query param (see pages/client-portal.html), so it never rides in a
  // logged URL. CWE-598 fix, PR #121 review.
  const session = generateSessionToken(result.clientId, salt);

  return json({
    valid: true,
    clientId: result.clientId,
    expiresAt: result.expiresAt,
    sessionToken: session.token,
    sessionExpiresAt: session.expiresAt,
  });
}

async function listFiles(req) {
  const salt = process.env.PORTAL_SALT;
  if (!salt) return error('Client portal is not available', 503);

  const session = requireSession(req, salt);
  logPortalAccess('list_files', {
    valid: session.valid,
    reason: session.reason,
    clientId: session.clientId,
    ip: requestIp(req),
  });

  if (!session.valid) return error('Invalid or expired session', 401);

  const manifest = getManifestForClient(session.clientId);
  return json({
    clientId: session.clientId,
    projectName: manifest.projectName,
    deliveredAt: manifest.deliveredAt,
    // Never include the underlying storage path here — clients only ever
    // get a path by asking for a time-bound signed link (see /download).
    files: manifest.files.map(({ id, title, type, meta }) => ({ id, title, type, meta })),
  });
}

async function createDownloadLink(req, url) {
  const salt = process.env.PORTAL_SALT;
  if (!salt) return error('Client portal is not available', 503);

  const session = requireSession(req, salt);
  if (!session.valid) {
    logPortalAccess('download_request', { valid: false, reason: session.reason, ip: requestIp(req) });
    return error('Invalid or expired session', 401);
  }

  const fileId = url.searchParams.get('file');
  if (!fileId) return error('file query parameter is required', 400);

  const file = findFile(session.clientId, fileId);
  logPortalAccess('download_request', {
    clientId: session.clientId,
    fileId,
    found: !!file,
    ip: requestIp(req),
  });

  if (!file) return error('File not found', 404);

  const signed = generateSignedDownloadToken(session.clientId, fileId, salt);
  const fileUrl = new URL('/api/portal/file', url);
  fileUrl.searchParams.set('token', signed.token);

  return json({ url: fileUrl.toString(), fileName: file.title, expiresAt: signed.expiresAt });
}

async function serveFile(req, url) {
  // NOTE: today's demo manifest (portal-manifest.js) points at files under
  // /assets/gallery, which is the site's own public marketing gallery --
  // already served statically with no auth at all. The signed-token check
  // below genuinely gates whether the CLIENT gets this redirect URL, but
  // it does not (and cannot) gate the underlying /assets/gallery/<file>
  // path itself, which stays reachable directly. This is fine for demo
  // content (nothing sensitive is exposed either way) but must NOT be the
  // pattern for real per-client files: those need to live outside any
  // statically-published directory and be read + returned as bytes here
  // (or served from a private bucket), not redirected to a public path.
  // See docs/CLIENT_PORTAL.md.
  const salt = process.env.PORTAL_SALT;
  if (!salt) return error('Client portal is not available', 503);

  const token = url.searchParams.get('token');
  const result = verifySignedDownloadToken(token, salt);
  logPortalAccess('file_serve', {
    valid: result.valid,
    reason: result.reason,
    clientId: result.clientId,
    fileId: result.fileId,
    ip: requestIp(req),
  });

  if (!result.valid) return error('Invalid or expired download link', 401);

  const file = findFile(result.clientId, result.fileId);
  if (!file) return error('File not found', 404);

  const target = new URL(file.path, url.origin);
  return redirect(target.toString(), 302);
}
