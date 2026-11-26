import { describe, it, expect, vi, beforeEach } from 'vitest';

// Handler-level tests for /api/admin/* with sql and auth mocked.
const sqlMock = vi.fn();
vi.mock('../../netlify/functions/utils/db.js', () => ({ sql: sqlMock }));

const requireAuthMock = vi.fn();
vi.mock('../../netlify/functions/utils/auth.js', () => ({ requireAuth: requireAuthMock }));

const { default: handler } = await import('../../netlify/functions/api-admin.mjs');

const ADMIN = { id: 'admin-1', role: 'admin' };
const CLIENT = { id: 'client-1', role: 'client' };
const OPERATOR = { id: 'op-1', role: 'operator' };

let responses;
const normalize = (strings) => strings.join('?').replace(/\s+/g, ' ').trim();
sqlMock.mockImplementation((strings, ...values) => {
  const text = normalize(strings);
  for (const [pattern, result] of responses) {
    if (pattern.test(text)) return Promise.resolve(typeof result === 'function' ? result(values) : result);
  }
  return Promise.resolve([]);
});
const queries = () => sqlMock.mock.calls.map(([strings, ...values]) => ({ text: normalize(strings), values }));
const pageQuery = (pattern) => queries().find((q) => pattern.test(q.text) && /LIMIT/.test(q.text));

const call = async (method, path) => {
  const res = await handler(new Request(`http://localhost/api/admin${path}`, { method }));
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
};

beforeEach(() => {
  sqlMock.mockClear();
  requireAuthMock.mockReset();
  requireAuthMock.mockResolvedValue(ADMIN);
  responses = [
    [/FROM users u/, [{ id: 'u1' }]],
    [/SELECT COUNT\(\*\)::int AS total FROM users/, [{ total: 7 }]],
    [/FROM jobs j/, [{ id: 'j1' }]],
    [/SELECT COUNT\(\*\)::int AS total FROM jobs/, [{ total: 3 }]],
    [/FROM operator_profiles op/, [{ id: 'o1' }]],
    [/AS client_count/, [{ client_count: 2 }]],
  ];
});

describe('access control', () => {
  it('answers OPTIONS with 204 before auth', async () => {
    const { status } = await call('OPTIONS', '/dashboard');
    expect(status).toBe(204);
    expect(requireAuthMock).not.toHaveBeenCalled();
  });

  it('returns 401 without a user', async () => {
    requireAuthMock.mockResolvedValue(null);
    for (const route of ['/dashboard', '/pending-operators', '/jobs', '/users']) {
      expect((await call('GET', route)).status).toBe(401);
    }
  });

  it.each([CLIENT, OPERATOR])('returns 403 for the $role role on every route', async (user) => {
    requireAuthMock.mockResolvedValue(user);
    for (const route of ['/dashboard', '/pending-operators', '/jobs', '/users']) {
      expect((await call('GET', route)).status).toBe(403);
    }
  });
});

describe('routes', () => {
  it('returns the dashboard stats row', async () => {
    const { status, body } = await call('GET', '/dashboard');
    expect(status).toBe(200);
    expect(body).toEqual({ client_count: 2 });
  });

  it('returns pending operators', async () => {
    const { status, body } = await call('GET', '/pending-operators');
    expect(status).toBe(200);
    expect(body).toEqual([{ id: 'o1' }]);
  });

  it('returns 404 for unknown routes and non-GET methods', async () => {
    expect((await call('GET', '/nope')).status).toBe(404);
    expect((await call('POST', '/dashboard')).status).toBe(404);
  });
});

describe('GET /jobs pagination', () => {
  it('returns total, limit, offset and data with defaults 100 and 0', async () => {
    const { status, body } = await call('GET', '/jobs');
    expect(status).toBe(200);
    expect(body).toEqual({ total: 3, limit: 100, offset: 0, data: [{ id: 'j1' }] });
    expect(pageQuery(/FROM jobs j/).values).toEqual([100, 0]);
  });

  it.each([
    ['9999', 500],
    ['0', 100],
    ['abc', 100],
    ['25', 25],
  ])('limit=%s gives %i', async (raw, expected) => {
    const { body } = await call('GET', `/jobs?limit=${raw}`);
    expect(body.limit).toBe(expected);
    expect(pageQuery(/FROM jobs j/).values[0]).toBe(expected);
  });

  it.each([['-5'], ['abc']])('offset=%s becomes 0', async (raw) => {
    const { body } = await call('GET', `/jobs?offset=${raw}`);
    expect(body.offset).toBe(0);
    expect(pageQuery(/FROM jobs j/).values[1]).toBe(0);
  });

  it('passes a valid offset through', async () => {
    const { body } = await call('GET', '/jobs?offset=40');
    expect(body.offset).toBe(40);
  });
});

describe('GET /users pagination', () => {
  it('uses a default limit of 200', async () => {
    const { status, body } = await call('GET', '/users');
    expect(status).toBe(200);
    expect(body).toEqual({ total: 7, limit: 200, offset: 0, data: [{ id: 'u1' }] });
    expect(pageQuery(/FROM users u/).values).toEqual([200, 0]);
  });

  it.each([
    ['9999', 500],
    ['0', 200],
    ['abc', 200],
  ])('limit=%s gives %i', async (raw, expected) => {
    const { body } = await call('GET', `/users?limit=${raw}`);
    expect(body.limit).toBe(expected);
  });

  it('clamps a negative offset to 0', async () => {
    const { body } = await call('GET', '/users?offset=-3');
    expect(body.offset).toBe(0);
  });
});
