// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Server-side session revocation: a JWT whose sv claim is not the user's current
// users.session_version must stop working, and reset and logout-all must bump it.
const { sqlMock } = vi.hoisted(() => ({ sqlMock: vi.fn() }));
vi.mock('../../netlify/functions/utils/db.js', () => ({ sql: sqlMock }));
vi.mock('../../netlify/functions/utils/email.js', () => ({
  sendVerificationEmail: vi.fn(), sendPasswordResetEmail: vi.fn(),
}));
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn(async () => 'h'), compare: vi.fn(async () => true) } }));

process.env.JWT_SECRET = 'x'.repeat(40);
process.env.DATABASE_URL ??= 'postgres://user:pass@localhost:5432/db';
const { signToken, requireAuth } = await import('../../netlify/functions/utils/auth.js');
const { default: handler } = await import('../../netlify/functions/api-auth.mjs');

const USER = { id: 'u1', email: 'a@example.com', role: 'client', name: 'A' };
const statements = [];
const withUser = (extra = {}) => sqlMock.mockImplementation(async (strings) => {
  const text = strings.join('?');
  statements.push(text);
  if (text.includes('FROM users')) return [{ ...USER, ...extra }];
  if (text.includes('RETURNING user_id')) return [{ user_id: 'u1' }];
  return [];
});

beforeEach(() => { statements.length = 0; sqlMock.mockReset(); });

const tokenFor = (sv) => signToken({ sub: 'u1', role: 'client', ...(sv === undefined ? {} : { sv }) });
const bearer = async (sv) => new Request('http://localhost/api/auth/x', {
  method: 'POST', headers: { authorization: `Bearer ${await tokenFor(sv)}` },
});

describe('requireAuth honours session_version', () => {
  it('accepts a token whose sv matches the current version', async () => {
    withUser({ session_version: 3 });
    expect((await requireAuth(await bearer(3), sqlMock))?.id).toBe('u1');
  });

  it('rejects a token from before a revocation, even within the same second', async () => {
    const old = await bearer(2);
    withUser({ session_version: 3 });
    expect(await requireAuth(old, sqlMock)).toBeNull();
  });

  it('treats a token without sv as version 0 (issued before versioning)', async () => {
    withUser({ session_version: 0 });
    expect((await requireAuth(await bearer(undefined), sqlMock))?.id).toBe('u1');
    withUser({ session_version: 1 });
    expect(await requireAuth(await bearer(undefined), sqlMock)).toBeNull();
  });

  it('does not expose the version column to callers', async () => {
    withUser({ session_version: 0 });
    expect(await requireAuth(await bearer(0), sqlMock)).not.toHaveProperty('session_version');
  });
});

const BUMP = 'session_version = session_version + 1';

describe('revoking routes', () => {
  it('POST /logout clears this device only and leaves other sessions valid', async () => {
    withUser({ session_version: 0 });
    const req = await bearer(0);
    const res = await handler(new Request('http://localhost/api/auth/logout', { method: 'POST', headers: req.headers }));
    expect(res.status).toBe(200);
    expect(statements.some((s) => s.includes('session_version ='))).toBe(false);
  });

  it('POST /logout-all bumps the version atomically for the signed-in user', async () => {
    withUser({ session_version: 0 });
    const req = await bearer(0);
    const res = await handler(new Request('http://localhost/api/auth/logout-all', { method: 'POST', headers: req.headers }));
    expect(res.status).toBe(200);
    expect(statements.some((s) => s.includes('UPDATE users') && s.includes(BUMP))).toBe(true);
  });

  it('POST /logout-all without a valid session is 401', async () => {
    const res = await handler(new Request('http://localhost/api/auth/logout-all', { method: 'POST' }));
    expect(res.status).toBe(401);
  });

  it('POST /reset-password bumps the version for the reset user', async () => {
    withUser();
    const res = await handler(new Request('http://localhost/api/auth/reset-password', {
      method: 'POST', body: JSON.stringify({ token: 't', password: 'longenough1' }),
    }));
    expect(res.status).toBe(200);
    expect(statements.some((s) => s.includes('UPDATE users') && s.includes(BUMP))).toBe(true);
  });

  it('login issues a token that carries the current version', async () => {
    withUser({ session_version: 5, password_hash: 'h', active: true, email_verified: true });
    const res = await handler(new Request('http://localhost/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email: 'a@example.com', password: 'longenough1' }),
    }));
    // The token travels only in the HttpOnly cookie (#213)
    const { user } = await res.json();
    expect(user).not.toHaveProperty('session_version');
    const token = decodeURIComponent((res.headers.get('set-cookie') || '').match(/skyview_session=([^;]+)/)?.[1] ?? '');
    const { verifyToken } = await import('../../netlify/functions/utils/auth.js');
    expect((await verifyToken(token)).sv).toBe(5);
  });
});
