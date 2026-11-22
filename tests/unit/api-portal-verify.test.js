import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHash } from 'crypto';
import { generatePortalToken } from '../../netlify/functions/utils/portal.js';

// POST /api/portal/verify: access codes are accepted once, then refused.
const SALT = 'test-salt-do-not-use-in-prod';
const used = new Set();
const sqlMock = vi.fn(async (strings, ...values) => {
  const text = strings.join('?').replace(/\s+/g, ' ');
  if (/INSERT INTO portal_code_uses/.test(text)) {
    const [hash] = values;
    if (used.has(hash)) return [];
    used.add(hash);
    return [{ code_hash: hash }];
  }
  return [];
});
vi.mock('../../netlify/functions/utils/db.js', () => ({ sql: sqlMock }));
vi.mock('../../netlify/functions/utils/rate-limit.js', () => ({
  throttle: vi.fn(async () => null),
  requestIp: () => '203.0.113.9',
}));

const { default: handler } = await import('../../netlify/functions/api-portal.mjs');
const verify = (code) =>
  handler(new Request('http://localhost/api/portal/verify', { method: 'POST', body: JSON.stringify({ code }) }));

beforeEach(() => {
  used.clear();
  sqlMock.mockClear();
  process.env.PORTAL_SALT = SALT;
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => { delete process.env.PORTAL_SALT; });

describe('portal access code single use', () => {
  it('accepts a valid code once and issues a session token', async () => {
    const res = await verify(generatePortalToken('client-1', 30, SALT));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.sessionToken).toBeTruthy();
  });

  it('refuses the same code the second time', async () => {
    const code = generatePortalToken('client-1', 30, SALT);
    expect((await verify(code)).status).toBe(200);
    expect((await verify(code)).status).toBe(401);
  });

  it.each([
    ['uppercase signature', (c) => { const [a, b, s] = c.split('.'); return `${a}.${b}.${s.toUpperCase()}`; }],
  ])('treats a %s as the same code', async (_l, mutate) => {
    const code = generatePortalToken('client-1', 30, SALT);
    expect((await verify(code)).status).toBe(200);
    expect((await verify(mutate(code))).status).toBe(401);
  });

  it('does not consume codes with a bad signature', async () => {
    const code = generatePortalToken('client-1', 30, SALT);
    const forged = code.slice(0, -2) + (code.endsWith('00') ? '11' : '00');
    expect((await verify(forged)).status).toBe(401);
    expect(sqlMock.mock.calls.some(([s]) => /portal_code_uses/.test(s.join('')))).toBe(false);
    expect((await verify(code)).status).toBe(200);
  });

  it('stores only a hash of the code, expiring with the code', async () => {
    const code = generatePortalToken('client-1', 30, SALT);
    await verify(code);
    const insert = sqlMock.mock.calls.find(([s]) => /INSERT INTO portal_code_uses/.test(s.join('')));
    expect(insert.slice(1)).not.toContain(code);
    expect(insert[1]).toMatch(/^[a-f0-9]{64}$/);
    expect(insert[3]).toBe(Number(code.split('.')[1]));
    const [a, b, sig] = code.split('.');
    expect(insert[1]).toBe(createHash('sha256').update(`${a}.${b}.${sig}`).digest('hex'));
  });

  it('fails closed when the code store is unavailable', async () => {
    sqlMock.mockRejectedValueOnce(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await verify(generatePortalToken('client-1', 30, SALT))).status).toBe(503);
  });
});
