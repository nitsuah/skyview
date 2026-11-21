import { describe, it, expect, vi, beforeEach } from 'vitest';

// Pre-hijack regression: signing in with Google must not keep a password that
// was set on an unverified local account by whoever registered it first.
const { sqlMock } = vi.hoisted(() => ({ sqlMock: vi.fn() }));
vi.mock('../../netlify/functions/utils/db.js', () => ({ sql: sqlMock }));
vi.mock('../../netlify/functions/utils/auth.js', () => ({ signToken: vi.fn().mockResolvedValue('jwt') }));

const { googleCallback } = await import('../../netlify/functions/api-auth-google.mjs');

const statements = [];
const stub = (existing) => {
  sqlMock.mockImplementation(async (strings) => {
    const text = strings.join('?');
    statements.push(text);
    if (text.includes('WHERE google_id')) return [];
    if (text.includes('WHERE email')) return [existing];
    return [];
  });
};

const callback = () => {
  const state = Buffer.from(JSON.stringify({ role: 'client', nonce: 'n1' })).toString('base64url');
  const req = new Request(`http://localhost/api/auth/google/callback?code=c&state=${state}`);
  req.headers.set('cookie', 'oauth_state=n1');
  return googleCallback(req, new URL(req.url));
};

beforeEach(() => {
  statements.length = 0;
  sqlMock.mockReset();
  process.env.GOOGLE_CLIENT_ID = 'id';
  process.env.GOOGLE_CLIENT_SECRET = 'secret';
  vi.stubGlobal('fetch', vi.fn(async (u) => ({
    ok: true,
    text: async () => '',
    json: async () => (String(u).includes('/token')
      ? { access_token: 'at' }
      : { id: 'g1', email: 'v@example.com', name: 'V', verified_email: true }),
  })));
});

describe('google callback linking an existing local account', () => {
  const base = { id: 'u1', email: 'v@example.com', role: 'client', name: 'V', active: true };

  it('clears the password of an unverified local account when linking', async () => {
    stub({ ...base, email_verified: false });
    const res = await callback();
    expect(res.status).toBe(302);
    expect(statements.some((s) => s.includes('UPDATE users') && s.includes('google_id'))).toBe(true);
    expect(statements.some((s) => s.includes('UPDATE users') && s.includes('email_verified'))).toBe(true);
    expect(statements.some((s) => s.includes('password_hash = NULL'))).toBe(true);
  });

  it('keeps the password of an already verified local account', async () => {
    stub({ ...base, email_verified: true });
    const res = await callback();
    expect(res.status).toBe(302);
    expect(statements.some((s) => s.includes('UPDATE users') && s.includes('google_id'))).toBe(true);
    expect(statements.some((s) => s.includes('UPDATE users') && s.includes('email_verified'))).toBe(true);
    expect(statements.some((s) => s.includes('password_hash = NULL'))).toBe(false);
  });
});