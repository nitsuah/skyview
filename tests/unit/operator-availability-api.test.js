import { describe, it, expect, vi, beforeEach } from 'vitest';

// Handler-level tests for GET/PUT /api/operators/:id/availability with sql and
// auth mocked: request validation, who may see blocked-date reasons, and that
// the replace-all runs as a single transaction.
const sqlMock = vi.fn();
sqlMock.transaction = vi.fn();
vi.mock('../../netlify/functions/utils/db.js', () => ({ sql: sqlMock }));

const requireAuthMock = vi.fn();
vi.mock('../../netlify/functions/utils/auth.js', () => ({ requireAuth: requireAuthMock }));
vi.mock('../../netlify/functions/utils/email.js', () => ({ sendOperatorApprovedEmail: vi.fn() }));
vi.mock('../../netlify/functions/utils/stripe.js', () => ({ stripe: null }));

const { default: handler } = await import('../../netlify/functions/api-operators.mjs');

const OP = '11111111-1111-1111-1111-111111111111';
const url = `http://localhost/api/operators/${OP}/availability`;
const put = (body) => new Request(url, { method: 'PUT', body: JSON.stringify(body) });

beforeEach(() => {
  sqlMock.mockReset();
  sqlMock.transaction.mockReset();
  requireAuthMock.mockReset();
});

describe('GET availability', () => {
  const rows = () => {
    sqlMock
      .mockResolvedValueOnce([{ day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00' }])
      .mockResolvedValueOnce([{ blocked_date: '2027-02-01', reason: 'surgery' }]);
  };

  it('hides blocked-date reasons from anonymous callers', async () => {
    requireAuthMock.mockResolvedValue(null);
    rows();
    const body = await (await handler(new Request(url))).json();
    expect(body.blocked).toEqual([{ blocked_date: '2027-02-01' }]);
    expect(body.weekly).toHaveLength(1);
  });

  it('hides reasons from other users, including other operators and clients', async () => {
    requireAuthMock.mockResolvedValue({ id: 'someone-else', role: 'operator' });
    rows();
    expect((await (await handler(new Request(url))).json()).blocked[0]).not.toHaveProperty('reason');
  });

  it('shows reasons to the operator themselves', async () => {
    requireAuthMock.mockResolvedValue({ id: OP, role: 'operator' });
    rows();
    expect((await (await handler(new Request(url))).json()).blocked[0].reason).toBe('surgery');
  });

  it('shows reasons to admins', async () => {
    requireAuthMock.mockResolvedValue({ id: 'admin-1', role: 'admin' });
    rows();
    expect((await (await handler(new Request(url))).json()).blocked[0].reason).toBe('surgery');
  });
});

describe('PUT availability validation', () => {
  beforeEach(() => requireAuthMock.mockResolvedValue({ id: OP, role: 'operator' }));

  it.each([
    ['weekly is an object', { weekly: {}, blocked: [] }],
    ['blocked is missing', { weekly: [] }],
    ['weekly is missing', { blocked: [] }],
    ['blocked is a string', { weekly: [], blocked: 'none' }],
  ])('rejects the body when %s, before touching the database', async (_label, body) => {
    const res = await handler(put(body));
    expect(res.status).toBe(400);
    expect(sqlMock.transaction).not.toHaveBeenCalled();
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it.each(['2027-02-31', '2027-13-01', '2027-00-10', '2027-04-31', '2026-02-29'])(
    'rejects the impossible blocked date %s with a 400 before touching the database',
    async (date) => {
      const res = await handler(put({ weekly: [], blocked: [{ date }] }));
      expect(res.status).toBe(400);
      expect(sqlMock).not.toHaveBeenCalled();
      expect(sqlMock.transaction).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['null weekly entry', { weekly: [null], blocked: [] }],
    ['null blocked entry', { weekly: [], blocked: [null] }],
    ['string entry', { weekly: ['monday'], blocked: [] }],
    ['array entry', { weekly: [], blocked: [[]] }],
    ['number entry', { weekly: [], blocked: [42] }],
  ])('returns a 400 (not a 500) for a %s, before touching the database', async (_label, body) => {
    const res = await handler(put(body));
    expect(res.status).toBe(400);
    expect(sqlMock).not.toHaveBeenCalled();
    expect(sqlMock.transaction).not.toHaveBeenCalled();
  });

  it('rejects an end time that is not after the start time', async () => {
    const res = await handler(put({ weekly: [{ day_of_week: 1, start_time: '17:00', end_time: '09:00' }], blocked: [] }));
    expect(res.status).toBe(400);
    expect(sqlMock.transaction).not.toHaveBeenCalled();
  });

  it('forbids another operator from editing this calendar', async () => {
    requireAuthMock.mockResolvedValue({ id: 'someone-else', role: 'operator' });
    const res = await handler(put({ weekly: [], blocked: [] }));
    expect(res.status).toBe(403);
  });
});

describe('PUT availability replace-all', () => {
  it('runs both deletes and every insert in a single transaction', async () => {
    requireAuthMock.mockResolvedValue({ id: OP, role: 'operator' });
    sqlMock.mockResolvedValueOnce([{ id: 'profile-1' }]); // profile lookup
    sqlMock.mockResolvedValue([]);                        // GET after save
    // The handler passes a callback; run it with a tagged-template stub that
    // records each statement so we can inspect what the transaction contains.
    const statements = [];
    sqlMock.transaction.mockImplementation(async (build) => {
      const txn = (strings) => { statements.push(strings.join('?').replace(/\s+/g, ' ').trim()); return {}; };
      build(txn);
      return [];
    });

    const res = await handler(put({
      weekly: [{ day_of_week: 1, start_time: '09:00', end_time: '17:00' }, { day_of_week: 1, start_time: '18:00', end_time: '20:00' }],
      blocked: [{ date: '2027-02-01', reason: 'x' }],
    }));

    expect(res.status).toBe(200);
    expect(sqlMock.transaction).toHaveBeenCalledTimes(1);
    expect(statements).toHaveLength(2 + 2 + 1); // 2 deletes + 2 weekly inserts + 1 blocked insert
    expect(statements[0]).toMatch(/^DELETE FROM operator_availability/);
    expect(statements[1]).toMatch(/^DELETE FROM operator_blocked_dates/);
  });
});
