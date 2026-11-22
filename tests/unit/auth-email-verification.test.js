import { describe, it, expect, vi, beforeEach } from 'vitest';

const sqlMock = vi.fn();
vi.mock('../../netlify/functions/utils/db.js', () => ({ sql: sqlMock }));
vi.mock('../../netlify/functions/utils/email.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

process.env.JWT_SECRET = 'x'.repeat(40);
const { signToken, requireAuth } = await import('../../netlify/functions/utils/auth.js');

const text = (strings) => strings.join('?').replace(/\s+/g, ' ').trim();
let responses;
beforeEach(() => {
  responses = [];
  sqlMock.mockReset();
  sqlMock.mockImplementation((strings) => {
    const t = text(strings);
    for (const [re, result] of responses) if (re.test(t)) return Promise.resolve(result);
    return Promise.resolve([]);
  });
});

const authedReq = (token) => new Request('http://localhost/api/auth/me', { headers: { authorization: `Bearer ${token}` } });

describe('requireAuth requires a verified email', () => {
  it('requireAuth rejects a valid token for an unverified account', async () => {
    const token = await signToken({ sub: 'u1', role: 'client', sv: 0 });
    responses.push([/FROM users/, [{ id: 'u1', role: 'client', email_verified: false, session_version: 0 }]]);
    expect(await requireAuth(authedReq(token), sqlMock)).toBeNull();
  });

  it('requireAuth accepts a verified account and hides internal columns', async () => {
    const token = await signToken({ sub: 'u1', role: 'client', sv: 0 });
    responses.push([/FROM users/, [{ id: 'u1', role: 'client', email_verified: true, session_version: 0 }]]);
    expect(await requireAuth(authedReq(token), sqlMock)).toEqual({ id: 'u1', role: 'client' });
  });
});
