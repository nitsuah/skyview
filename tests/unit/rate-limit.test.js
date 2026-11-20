import { describe, it, expect, vi, beforeEach } from 'vitest';

const sqlMock = vi.fn();
vi.mock('../../netlify/functions/utils/db.js', () => ({ sql: sqlMock }));
vi.mock('../../netlify/functions/utils/email.js', () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));
process.env.JWT_SECRET = 'x'.repeat(40);
process.env.PORTAL_SALT = 'portal-salt-for-tests';
delete process.env.RATE_LIMIT_DISABLED;

const { default: authHandler } = await import('../../netlify/functions/api-auth.mjs');
const { default: portalHandler } = await import('../../netlify/functions/api-portal.mjs');
const { rateLimit } = await import('../../netlify/functions/utils/rate-limit.js');

// Counter rows by key; every INSERT ... count bumps and returns the new count.
let counts;
beforeEach(() => {
  counts = new Map();
  sqlMock.mockReset();
  sqlMock.mockImplementation((strings, ...values) => {
    const t = strings.join('?');
    if (/INSERT INTO rate_limits/.test(t)) {
      const key = values[0];
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return Promise.resolve([{ count: counts.get(key), remaining: 120 }]);
    }
    return Promise.resolve([]);
  });
});

const post = (path, body, ip = '1.1.1.1') =>
  new Request(`http://localhost/api/auth${path}`, {
    method: 'POST',
    headers: { 'x-nf-client-connection-ip': ip },
    body: JSON.stringify(body),
  });

describe('rateLimit', () => {
  it('allows up to max then limits', async () => {
    const lim = { max: 2, windowSec: 60 };
    expect((await rateLimit(sqlMock, 's', 'a', lim)).limited).toBe(false);
    expect((await rateLimit(sqlMock, 's', 'a', lim)).limited).toBe(false);
    const third = await rateLimit(sqlMock, 's', 'a', lim);
    expect(third.limited).toBe(true);
    expect(third.retryAfter).toBeGreaterThan(0);
  });

  it('can be disabled for local development', async () => {
    process.env.RATE_LIMIT_DISABLED = '1';
    try {
      expect((await rateLimit(sqlMock, 's', 'a', { max: 0, windowSec: 60 })).limited).toBe(false);
      expect(sqlMock).not.toHaveBeenCalled();
    } finally {
      delete process.env.RATE_LIMIT_DISABLED;
    }
  });
});

describe('auth endpoints are throttled', () => {
  it('locks an account after repeated login attempts from rotating addresses', async () => {
    let last;
    for (let i = 0; i < 9; i++) {
      last = await authHandler(post('/login', { email: 'a@b.co', password: 'nope' }, `9.9.9.${i}`));
    }
    expect(last.status).toBe(429);
    expect(last.headers.get('retry-after')).toBeTruthy();
  });

  it('limits password reset requests per account', async () => {
    let last;
    for (let i = 0; i < 4; i++) {
      last = await authHandler(post('/forgot-password', { email: 'a@b.co' }, `8.8.8.${i}`));
    }
    expect(last.status).toBe(429);
  });

  it('limits login attempts per address', async () => {
    let last;
    for (let i = 0; i < 31; i++) {
      last = await authHandler(post('/login', { email: `u${i}@b.co`, password: 'nope' }));
    }
    expect(last.status).toBe(429);
  });
});

describe('portal access-code verification is throttled', () => {
  it('returns 429 after repeated guesses from one address', async () => {
    let last;
    for (let i = 0; i < 11; i++) {
      last = await portalHandler(new Request('http://localhost/api/portal/verify', {
        method: 'POST',
        headers: { 'x-nf-client-connection-ip': '2.2.2.2' },
        body: JSON.stringify({ code: 'bad' }),
      }));
    }
    expect(last.status).toBe(429);
  });
});
