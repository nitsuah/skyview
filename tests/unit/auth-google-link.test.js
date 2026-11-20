import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sqlMock = vi.fn();
vi.mock('../../netlify/functions/utils/db.js', () => ({ sql: sqlMock }));
process.env.JWT_SECRET = 'x'.repeat(40);
process.env.GOOGLE_CLIENT_ID = 'cid';
process.env.GOOGLE_CLIENT_SECRET = 'sec';
const { googleCallback } = await import('../../netlify/functions/api-auth-google.mjs');

const text = (strings) => strings.join('?').replace(/\s+/g, ' ').trim();
let existing;
beforeEach(() => {
  sqlMock.mockReset();
  sqlMock.mockImplementation((strings) => {
    const t = text(strings);
    if (/WHERE google_id/.test(t)) return Promise.resolve([]);
    if (/WHERE email =/.test(t)) return Promise.resolve([existing]);
    return Promise.resolve([]);
  });
  globalThis.fetch = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'at' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'g1', email: 'v@x.co', name: 'V', verified_email: true }) });
});
afterEach(() => vi.unstubAllGlobals());

const callback = () => {
  const nonce = 'n1';
  const state = Buffer.from(JSON.stringify({ role: 'client', nonce })).toString('base64url');
  const req = { headers: new Map([['cookie', `oauth_state=${nonce}`]]) };
  return googleCallback(req, new URL(`http://localhost/api/auth/google/callback?code=c&state=${state}`));
};
const updates = () => sqlMock.mock.calls.map(([s]) => text(s)).filter((t) => /^UPDATE users/.test(t));

describe('linking Google to an existing email account', () => {
  it('clears the password and sessions when the account was never verified', async () => {
    existing = { id: 'u1', role: 'client', active: true, email_verified: false };
    const res = await callback();
    expect(res.status).toBe(302);
    const u = updates();
    expect(u).toHaveLength(1);
    expect(u[0]).toMatch(/password_hash = NULL/);
    expect(u[0]).toMatch(/sessions_valid_after = NOW\(\)/);
  });

  it('keeps the password of an account that was already verified', async () => {
    existing = { id: 'u2', role: 'client', active: true, email_verified: true };
    await callback();
    const u = updates();
    expect(u).toHaveLength(1);
    expect(u[0]).not.toMatch(/password_hash/);
  });
});
