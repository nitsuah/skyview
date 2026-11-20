import { describe, it, expect, vi, beforeEach } from 'vitest';

const sqlMock = vi.fn();
vi.mock('../../netlify/functions/utils/db.js', () => ({ sql: sqlMock }));
vi.mock('../../netlify/functions/utils/email.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

process.env.JWT_SECRET = 'x'.repeat(40);
const { signToken, requireAuth } = await import('../../netlify/functions/utils/auth.js');
const { default: handler } = await import('../../netlify/functions/api-auth.mjs');

const text = (strings) => strings.join('?').replace(/\s+/g, ' ').trim();
let responses;
beforeEach(() => {
  responses = [];
  sqlMock.mockReset();
  sqlMock.mockImplementation((strings, ...values) => {
    const t = text(strings);
    for (const [re, result] of responses) {
      if (re.test(t)) return Promise.resolve(typeof result === 'function' ? result(values) : result);
    }
    return Promise.resolve([]);
  });
});
const ran = (re) => sqlMock.mock.calls.some(([s]) => re.test(text(s)));

const authedReq = (token) => new Request('http://localhost/api/auth/me', { headers: { authorization: `Bearer ${token}` } });
const post = (path, body) =>
  new Request(`http://localhost/api/auth${path}`, { method: 'POST', body: JSON.stringify(body) });

describe('email verification gates sessions', () => {
  it('register does not return a session token', async () => {
    responses.push([/INSERT INTO users/, [{ id: 'u1', email: 'a@b.co', role: 'client', name: 'A' }]]);
    const res = await handler(post('/register', { email: 'a@b.co', password: 'password1', role: 'client', name: 'A' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.token).toBeUndefined();
    expect(body.verification_required).toBe(true);
  });

  it('requireAuth rejects a token for an unverified account', async () => {
    const token = await signToken({ sub: 'u1', role: 'client' });
    responses.push([/FROM users/, [{ id: 'u1', role: 'client', email_verified: false, sessions_valid_after: null }]]);
    expect(await requireAuth(authedReq(token), sqlMock)).toBeNull();
  });

  it('requireAuth accepts a verified account and hides internal columns', async () => {
    const token = await signToken({ sub: 'u1', role: 'client' });
    responses.push([/FROM users/, [{ id: 'u1', role: 'client', email_verified: true, sessions_valid_after: null }]]);
    const user = await requireAuth(authedReq(token), sqlMock);
    expect(user).toEqual({ id: 'u1', role: 'client' });
  });
});

describe('credential changes end older sessions', () => {
  it('rejects a token issued before sessions_valid_after', async () => {
    const token = await signToken({ sub: 'u1', role: 'client' });
    const later = new Date(Date.now() + 60_000).toISOString();
    responses.push([/FROM users/, [{ id: 'u1', role: 'client', email_verified: true, sessions_valid_after: later }]]);
    expect(await requireAuth(authedReq(token), sqlMock)).toBeNull();
  });

  it('accepts a token issued after sessions_valid_after', async () => {
    const earlier = new Date(Date.now() - 60_000).toISOString();
    const token = await signToken({ sub: 'u1', role: 'client' });
    responses.push([/FROM users/, [{ id: 'u1', role: 'client', email_verified: true, sessions_valid_after: earlier }]]);
    expect(await requireAuth(authedReq(token), sqlMock)).not.toBeNull();
  });

  it('password reset stamps sessions_valid_after', async () => {
    responses.push([/UPDATE password_reset_tokens/, [{ user_id: 'u1' }]]);
    const res = await handler(post('/reset-password', { token: 't', password: 'newpassword1' }));
    expect(res.status).toBe(200);
    expect(ran(/UPDATE users SET password_hash = \?, sessions_valid_after = NOW\(\)/)).toBe(true);
  });
});
