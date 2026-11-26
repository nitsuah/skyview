import { describe, it, expect, vi, beforeEach } from 'vitest';

// Handler-level tests for POST /api/jobs (job creation) with sql, auth, email and Stripe mocked.
const sqlMock = vi.fn();
vi.mock('../../netlify/functions/utils/db.js', () => ({ sql: sqlMock }));

const requireAuthMock = vi.fn();
vi.mock('../../netlify/functions/utils/auth.js', () => ({ requireAuth: requireAuthMock }));

vi.mock('../../netlify/functions/utils/email.js', () => ({ sendJobAlertEmail: vi.fn() }));
vi.mock('../../netlify/functions/utils/stripe.js', () => ({ stripe: null }));

const { default: handler } = await import('../../netlify/functions/api-jobs.mjs');

const CLIENT = { id: 'client-1', role: 'client' };
const OPERATOR = { id: 'op-1', role: 'operator' };
const ADMIN = { id: 'admin-1', role: 'admin' };
const ROW = { id: 'job-1', title: 'Roof survey' };

const normalize = (strings) => strings.join('?').replace(/\s+/g, ' ').trim();
sqlMock.mockImplementation((strings) =>
  Promise.resolve(/INSERT INTO jobs/.test(normalize(strings)) ? [ROW] : []),
);
const insertValues = () => {
  const found = sqlMock.mock.calls.find(([strings]) => /INSERT INTO jobs/.test(normalize(strings)));
  return found ? found.slice(1) : null;
};

const post = async (body) => {
  const res = await handler(
    new Request('http://localhost/api/jobs', {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
  return { status: res.status, body: await res.json() };
};
const valid = (extra = {}) => ({ title: 'Roof survey', service_type: 'inspection', ...extra });

beforeEach(() => {
  delete process.env.RESEND_API_KEY;
  sqlMock.mockClear();
  requireAuthMock.mockReset();
  requireAuthMock.mockResolvedValue(CLIENT);
});

describe('POST /api/jobs authorisation and JSON', () => {
  it('requires authentication', async () => {
    requireAuthMock.mockResolvedValue(null);
    expect((await post(valid())).status).toBe(401);
  });

  it('forbids operators but allows clients and admins', async () => {
    requireAuthMock.mockResolvedValue(OPERATOR);
    expect((await post(valid())).status).toBe(403);
    requireAuthMock.mockResolvedValue(CLIENT);
    expect((await post(valid())).status).toBe(201);
    requireAuthMock.mockResolvedValue(ADMIN);
    expect((await post(valid())).status).toBe(201);
  });

  it('rejects a non-JSON body', async () => {
    const { status, body } = await post('not json');
    expect(status).toBe(400);
    expect(body.error).toBe('Invalid JSON');
  });
});

describe('POST /api/jobs validation', () => {
  it('requires title and service_type', async () => {
    for (const payload of [{ service_type: 'mapping' }, { title: 'x' }]) {
      const { status, body } = await post(payload);
      expect(status).toBe(400);
      expect(body.error).toBe('title and service_type are required');
    }
  });

  it('validates the title', async () => {
    const nonString = await post(valid({ title: 5 }));
    expect(nonString.status).toBe(400);
    expect(nonString.body.error).toBe('title must be a string');
    expect((await post(valid({ title: 'x'.repeat(201) }))).status).toBe(400);
    expect((await post(valid({ title: 'x'.repeat(200) }))).status).toBe(201);
  });

  it('validates the description', async () => {
    expect((await post(valid({ description: 7 }))).status).toBe(400);
    expect((await post(valid({ description: 'x'.repeat(5001) }))).status).toBe(400);
    expect((await post(valid({ description: null }))).status).toBe(201);
  });

  it('validates service_type', async () => {
    const { status, body } = await post(valid({ service_type: 'fireworks' }));
    expect(status).toBe(400);
    expect(body.error).toContain('real_estate, cinematography, mapping, events, inspection');
    for (const type of ['real_estate', 'cinematography', 'mapping', 'events', 'inspection']) {
      expect((await post(valid({ service_type: type }))).status).toBe(201);
    }
  });

  it('validates preferred_time', async () => {
    expect((await post(valid({ preferred_time: 'midnight' }))).status).toBe(400);
    for (const time of ['morning', 'afternoon', 'evening', 'flexible']) {
      expect((await post(valid({ preferred_time: time }))).status).toBe(201);
    }
  });

  it('validates budget_cents', async () => {
    for (const budget of [-1, 1.5, '100']) {
      const { status, body } = await post(valid({ budget_cents: budget }));
      expect(status).toBe(400);
      expect(body.error).toContain('non-negative integer');
    }
    expect((await post(valid({ budget_cents: 0 }))).status).toBe(201);
    expect((await post(valid({ budget_cents: null }))).status).toBe(201);
  });
});

describe('POST /api/jobs insert', () => {
  it('returns 201 with the row, inserting the user id and null for omitted fields', async () => {
    const { status, body } = await post(valid());
    expect(status).toBe(201);
    expect(body).toEqual(ROW);
    expect(insertValues()).toEqual([
      CLIENT.id, 'Roof survey', 'inspection', null, null, null, null, null, null, null,
    ]);
  });

  it('passes provided optional fields through', async () => {
    await post(valid({
      description: 'd', location_address: 'addr', location_lat: 1.5, location_lng: 2.5,
      preferred_date: '2027-01-01', preferred_time: 'morning', budget_cents: 500,
    }));
    expect(insertValues()).toEqual([
      CLIENT.id, 'Roof survey', 'inspection', 'd', 'addr', 1.5, 2.5, '2027-01-01', 'morning', 500,
    ]);
  });
});
