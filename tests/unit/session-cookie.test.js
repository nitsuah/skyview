// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Email/password sign-in uses the HttpOnly session cookie (#213): the token is
// never returned to page script, and a cookie cannot authorize a cross-site write.
const { sqlMock } = vi.hoisted(() => ({ sqlMock: vi.fn() }));
vi.mock('../../netlify/functions/utils/db.js', () => ({ sql: sqlMock }));
vi.mock('../../netlify/functions/utils/email.js', () => ({
  sendVerificationEmail: vi.fn(), sendPasswordResetEmail: vi.fn(),
}));
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn(async () => 'h'), compare: vi.fn(async () => true) } }));

process.env.JWT_SECRET = 'x'.repeat(40);
process.env.DATABASE_URL ??= 'postgres://user:pass@localhost:5432/db';
process.env.URL = 'https://skyview.example';
const { signToken, requireAuth, isCrossSiteRequest } = await import('../../netlify/functions/utils/auth.js');
const { default: handler } = await import('../../netlify/functions/api-auth.mjs');

const USER = { id: 'u1', email: 'a@example.com', role: 'client', name: 'A' };
const ORIGIN = 'https://skyview.example';

beforeEach(() => {
  sqlMock.mockReset();
  sqlMock.mockImplementation(async (strings) => {
    const text = strings.join('?');
    if (text.includes('SELECT id FROM users WHERE email')) return [];
    if (text.includes('INSERT INTO users')) return [USER];
    if (text.includes('FROM users')) {
      return [{ ...USER, password_hash: 'h', active: true, email_verified: true, session_version: 0 }];
    }
    return [];
  });
});

const post = (path, body) => handler(new Request(`${ORIGIN}/api/auth${path}`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
}));

function expectSessionCookie(res) {
  const cookie = res.headers.get('set-cookie') || '';
  expect(cookie).toMatch(/^skyview_session=[^;]+;/);
  for (const attr of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/', 'Max-Age=604800']) {
    expect(cookie).toContain(attr);
  }
}

describe('email/password sign-in sets the session cookie', () => {
  it('login sets the cookie and returns no token', async () => {
    const res = await post('/login', { email: 'a@example.com', password: 'longenough' });
    expect(res.status).toBe(200);
    expectSessionCookie(res);
    const body = await res.json();
    expect(body.user.email).toBe('a@example.com');
    expect(body).not.toHaveProperty('token');
    expect(body.user).not.toHaveProperty('password_hash');
  });

  it('register sets the cookie and returns no token', async () => {
    const res = await post('/register', { email: 'a@example.com', password: 'longenough', role: 'client', name: 'A' });
    expect(res.status).toBe(201);
    expectSessionCookie(res);
    expect(await res.json()).not.toHaveProperty('token');
  });
});

describe('login and register refuse requests that could plant a session', () => {
  const attempt = (path, headers, body) => handler(new Request(`${ORIGIN}/api/auth${path}`, {
    method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body),
  }));
  const creds = { email: 'a@example.com', password: 'longenough' };

  it.each(['/login', '/register'])('%s rejects a cross-site request with 403 and no cookie', async (path) => {
    for (const headers of [
      { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' },
      { 'content-type': 'application/json', origin: 'https://evil.example' },
    ]) {
      const res = await attempt(path, headers, { ...creds, role: 'client', name: 'A' });
      expect(res.status).toBe(403);
      expect(res.headers.get('set-cookie')).toBeNull();
    }
  });

  it.each(['/login', '/register'])('%s rejects a non-JSON body (form post) with 415', async (path) => {
    const res = await attempt(path, { 'content-type': 'text/plain' }, JSON.stringify(creds));
    expect(res.status).toBe(415);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('still accepts a same-origin JSON login', async () => {
    const res = await attempt('/login', { 'content-type': 'application/json', origin: ORIGIN, 'sec-fetch-site': 'same-origin' }, creds);
    expect(res.status).toBe(200);
  });
});

describe('requireAuth with the session cookie', () => {
  const cookieRequest = async (method, headers = {}) => new Request(`${ORIGIN}/api/jobs`, {
    method,
    headers: { cookie: `skyview_session=${await signToken({ sub: 'u1', role: 'client' })}`, ...headers },
  });

  it('accepts the cookie for reads and same-origin writes', async () => {
    expect(await requireAuth(await cookieRequest('GET'), sqlMock)).toMatchObject({ id: 'u1' });
    expect(await requireAuth(await cookieRequest('POST', { 'sec-fetch-site': 'same-origin' }), sqlMock)).toMatchObject({ id: 'u1' });
    expect(await requireAuth(await cookieRequest('POST', { origin: ORIGIN }), sqlMock)).toMatchObject({ id: 'u1' });
  });

  it('rejects cookie-authenticated writes from another site', async () => {
    expect(await requireAuth(await cookieRequest('POST', { 'sec-fetch-site': 'cross-site' }), sqlMock)).toBeNull();
    expect(await requireAuth(await cookieRequest('DELETE', { origin: 'https://evil.example' }), sqlMock)).toBeNull();
  });

  it('still accepts a bearer header from non-browser clients', async () => {
    const req = new Request(`${ORIGIN}/api/jobs`, {
      method: 'POST',
      headers: { authorization: `Bearer ${await signToken({ sub: 'u1', role: 'client' })}`, origin: 'https://other.example' },
    });
    expect(await requireAuth(req, sqlMock)).toMatchObject({ id: 'u1' });
  });

  it('classifies requests by Sec-Fetch-Site, then Origin', () => {
    const r = (headers) => new Request(`${ORIGIN}/x`, { headers });
    expect(isCrossSiteRequest(r({ 'sec-fetch-site': 'same-site' }))).toBe(true);
    expect(isCrossSiteRequest(r({ 'sec-fetch-site': 'none' }))).toBe(false);
    expect(isCrossSiteRequest(r({ origin: ORIGIN }))).toBe(false);
    expect(isCrossSiteRequest(r({}))).toBe(false);
  });
});

describe('platform code keeps the token out of page storage', () => {
  it('never writes or reads skyview_token, and sends credentials with requests', () => {
    const api = readFileSync(resolve('platform/src/lib/api.js'), 'utf-8');
    const auth = readFileSync(resolve('platform/src/lib/auth.jsx'), 'utf-8');
    expect(api).not.toMatch(/localStorage|Authorization/);
    expect(api).toContain("credentials: 'include'");
    expect(auth).not.toMatch(/localStorage\.(setItem|getItem)\(\s*['"]skyview_token/);
    // Blocked storage cannot stop session start-up, and a failed logout keeps the user signed in.
    expect(auth).toMatch(/try\s*\{\s*localStorage\.removeItem\('skyview_token'\)/);
    expect(auth).not.toMatch(/finally\s*\{\s*setUser\(null\)/);
    expect(readFileSync(resolve('scripts/conversion-tracking.js'), 'utf-8')).not.toContain('skyview_token');
  });
});
