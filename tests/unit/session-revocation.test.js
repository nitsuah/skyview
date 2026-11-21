import { describe, it, expect, vi, beforeEach } from 'vitest';

// Server-side session revocation: a JWT issued before users.sessions_valid_after
// must stop working, and password reset and logout must move that cutoff.
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
const authed = async () => new Request('http://localhost/api/auth/x', {
  method: 'POST',
  headers: { authorization: `Bearer ${await signToken({ sub: 'u1', role: 'client' })}` },
});

beforeEach(() => { statements.length = 0; sqlMock.mockReset(); });

describe('requireAuth honours sessions_valid_after', () => {
  it('rejects a token issued before the cutoff', async () => {
    withUser({ sessions_valid_after: new Date(Date.now() + 60_000).toISOString() });
    expect(await requireAuth(await authed(), sqlMock)).toBeNull();
  });

  it('accepts a token issued after the cutoff, or when no cutoff is set', async () => {
    withUser({ sessions_valid_after: new Date(Date.now() - 3_600_000).toISOString() });
    expect((await requireAuth(await authed(), sqlMock))?.id).toBe('u1');
    withUser({ sessions_valid_after: null });
    expect((await requireAuth(await authed(), sqlMock))?.id).toBe('u1');
  });

  it('does not expose the cutoff column to callers', async () => {
    withUser({ sessions_valid_after: null });
    expect(await requireAuth(await authed(), sqlMock)).not.toHaveProperty('sessions_valid_after');
  });
});

describe('revoking routes', () => {
  it('POST /logout moves the cutoff for the signed-in user', async () => {
    withUser({ sessions_valid_after: null });
    const req = await authed();
    const res = await handler(new Request('http://localhost/api/auth/logout', { method: 'POST', headers: req.headers }));
    expect(res.status).toBe(200);
    expect(statements.some((s) => s.includes('UPDATE users') && s.includes('sessions_valid_after = NOW()'))).toBe(true);
  });

  it('POST /reset-password moves the cutoff for the reset user', async () => {
    withUser();
    const res = await handler(new Request('http://localhost/api/auth/reset-password', {
      method: 'POST', body: JSON.stringify({ token: 't', password: 'longenough1' }),
    }));
    expect(res.status).toBe(200);
    expect(statements.some((s) => s.includes('UPDATE users') && s.includes('sessions_valid_after = NOW()'))).toBe(true);
  });
});