import { describe, it, expect, vi, beforeEach } from 'vitest';

// Handler-level tests for /api/operators cert_revision computation (F-20260916-06).
// The certificate change is decided inside the UPDATE against the row at write
// time (no earlier read whose value could go stale), and omitted fields are not
// treated as changes.
const sqlMock = vi.fn();
vi.mock('../../netlify/functions/utils/db.js', () => ({ sql: sqlMock }));

const requireAuthMock = vi.fn();
vi.mock('../../netlify/functions/utils/auth.js', () => ({ requireAuth: requireAuthMock }));

const { default: handler } = await import('../../netlify/functions/api-operators.mjs');

const OPERATOR = { id: 'op-1', role: 'operator', name: 'Otto Operator' };
const ADMIN = { id: 'admin-1', role: 'admin', name: 'Ada Admin' };

const baseProfile = {
  user_id: OPERATOR.id,
  bio: 'Test bio',
  equipment: 'Drone',
  service_types: ['photo'],
  coverage_lat: 37.7749,
  coverage_lng: -122.4194,
  coverage_radius_mi: 25,
  base_rate_cents: 5000,
  hourly_rate_cents: 1000,
  booking_url: 'https://example.com',
  faa_cert_number: 'CERT-123',
  faa_cert_expires_at: '2027-12-31',
  verification_status: 'verified',
  cert_revision: 0,
};

let responses;
const normalize = (strings) => strings.join('?').replace(/\s+/g, ' ').trim();
sqlMock.mockImplementation((strings, ...values) => {
  const text = normalize(strings);
  for (const [pattern, result] of responses) {
    if (pattern.test(text)) {
      try {
        return Promise.resolve(typeof result === 'function' ? result(values) : result);
      } catch (err) {
        return Promise.reject(err);
      }
    }
  }
  return Promise.resolve([]);
});
const queries = () => sqlMock.mock.calls.map(([strings, ...values]) => ({ text: normalize(strings), values }));
const ran = (pattern) => queries().some(q => pattern.test(q.text));

beforeEach(() => {
  vi.clearAllMocks();
  responses = [];
  requireAuthMock.mockResolvedValue(OPERATOR);
});

async function call(method, path, body = {}) {
  const req = new Request(`http://localhost/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handler(req);
}

describe('api-operators cert revision', () => {
  const update = () => queries().find((q) => /^UPDATE operator_profiles SET/.test(q.text));

  it('decides the certificate change in the UPDATE, without reading the profile first', async () => {
    responses = [[/^UPDATE operator_profiles SET/, [{ ...baseProfile, cert_revision: 1 }]]];
    const res = await call('PUT', `/operators/${OPERATOR.id}`, { faa_cert_number: 'CERT-456' });
    expect(res.status).toBe(200);
    expect(ran(/^SELECT .*FROM operator_profiles/)).toBe(false);
    const { text } = update();
    expect(text).toMatch(/cert_revision = cert_revision \+ CASE WHEN \(\?::text IS NOT NULL AND \?::text IS DISTINCT FROM faa_cert_number\)/);
    expect(text).toMatch(/\?::date IS NOT NULL AND \?::date IS DISTINCT FROM faa_cert_expires_at/);
  });

  it('passes the submitted certificate values to the comparison', async () => {
    responses = [[/^UPDATE operator_profiles SET/, [baseProfile]]];
    await call('PUT', `/operators/${OPERATOR.id}`, { faa_cert_number: 'CERT-456', faa_cert_expires_at: '2028-01-31' });
    expect(update().values).toEqual(expect.arrayContaining(['CERT-456', '2028-01-31']));
  });

  it('passes null for omitted certificate fields, so a bio-only edit is not a change', async () => {
    responses = [[/^UPDATE operator_profiles SET/, [baseProfile]]];
    await call('PUT', `/operators/${OPERATOR.id}`, { bio: 'New bio' });
    const { values } = update();
    expect(values).not.toContain('CERT-123');
    expect(values).not.toContain(undefined);
  });

  it('404s when there is no profile to update', async () => {
    responses = [];
    const res = await call('PUT', `/operators/${OPERATOR.id}`, { bio: 'x' });
    expect(res.status).toBe(404);
  });
});
