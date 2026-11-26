import { describe, it, expect, vi, beforeEach } from 'vitest';

// Handler-level tests for /api/reviews with sql and auth mocked.
const sqlMock = vi.fn();
vi.mock('../../netlify/functions/utils/db.js', () => ({ sql: sqlMock }));

const requireAuthMock = vi.fn();
vi.mock('../../netlify/functions/utils/auth.js', () => ({ requireAuth: requireAuthMock }));

const { default: handler } = await import('../../netlify/functions/api-reviews.mjs');

const CLIENT = { id: 'client-1', role: 'client' };
const OPERATOR = { id: 'op-1', role: 'operator' };
const BOOKING = { id: 'booking-1', client_id: CLIENT.id, operator_id: 'op-9', status: 'completed' };

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

const call = async (method, path = '', body) => {
  const res = await handler(
    new Request(`http://localhost/api/reviews${path}`, {
      method,
      ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
    }),
  );
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
};

beforeEach(() => {
  sqlMock.mockClear();
  requireAuthMock.mockReset();
  requireAuthMock.mockResolvedValue(CLIENT);
  responses = [];
});

describe('routing', () => {
  it('answers OPTIONS with 204', async () => {
    expect((await call('OPTIONS')).status).toBe(204);
  });

  it('returns 404 for unsupported methods', async () => {
    const { status, body } = await call('DELETE');
    expect(status).toBe(404);
    expect(body.error).toBe('Not found');
  });
});

describe('GET /api/reviews', () => {
  it('requires operator_id', async () => {
    const { status, body } = await call('GET');
    expect(status).toBe(400);
    expect(body.error).toBe('operator_id is required');
  });

  it('lists reviews for an operator', async () => {
    const rows = [{ id: 'r1', rating: 5, comment: 'great', reviewer_name: 'Cora' }];
    responses = [[/FROM reviews r/, rows]];
    const { status, body } = await call('GET', '?operator_id=op-1');
    expect(status).toBe(200);
    expect(body).toEqual(rows);
    expect(queries()[0].values).toEqual(['op-1']);
  });
});

describe('POST /api/reviews', () => {
  const valid = { booking_id: BOOKING.id, rating: 5, comment: 'Superb' };

  it('requires authentication', async () => {
    requireAuthMock.mockResolvedValue(null);
    expect((await call('POST', '', valid)).status).toBe(401);
  });

  it('rejects non-client roles', async () => {
    requireAuthMock.mockResolvedValue(OPERATOR);
    expect((await call('POST', '', valid)).status).toBe(403);
  });

  it('rejects invalid JSON', async () => {
    const { status, body } = await call('POST', '', 'not json');
    expect(status).toBe(400);
    expect(body.error).toBe('Invalid JSON');
  });

  it.each([
    [{ rating: 5 }, 'booking_id and rating are required'],
    [{ booking_id: 'b' }, 'booking_id and rating are required'],
    [{ booking_id: 'b', rating: 6 }, 'rating must be an integer from 1 to 5'],
    [{ booking_id: 'b', rating: 3.5 }, 'rating must be an integer from 1 to 5'],
    [{ booking_id: 'b', rating: 5, comment: 42 }, 'comment must be a string'],
    [{ booking_id: 'b', rating: 5, comment: 'x'.repeat(2001) }, 'comment must be 2000 characters or fewer'],
  ])('rejects bad input %#', async (payload, message) => {
    const { status, body } = await call('POST', '', payload);
    expect(status).toBe(400);
    expect(body.error).toBe(message);
  });

  it('returns 404 when the booking is missing or not completed', async () => {
    responses = [[/FROM bookings/, []]];
    const { status, body } = await call('POST', '', valid);
    expect(status).toBe(404);
    expect(body.error).toBe('Booking not found or not completed');
  });

  it('inserts a review with the booking operator and a null comment when omitted', async () => {
    responses = [
      [/FROM bookings/, [BOOKING]],
      [/INSERT INTO reviews/, [{ id: 'r1' }]],
    ];
    const { status, body } = await call('POST', '', { booking_id: BOOKING.id, rating: 4 });
    expect(status).toBe(201);
    expect(body).toEqual({ id: 'r1' });
    const lookup = queries().find((q) => /FROM bookings/.test(q.text));
    expect(lookup.text).toMatch(/client_id = [?]/);
    expect(lookup.text).toMatch(/status = .completed./);
    expect(lookup.values).toEqual([BOOKING.id, CLIENT.id]);
    const insert = queries().find((q) => /INSERT INTO reviews/.test(q.text));
    expect(insert.values).toEqual([BOOKING.id, CLIENT.id, BOOKING.operator_id, 4, null]);
  });

  it('returns 409 on a duplicate review', async () => {
    responses = [
      [/FROM bookings/, [BOOKING]],
      [/INSERT INTO reviews/, () => { throw new Error('duplicate key value violates unique constraint'); }],
    ];
    const { status, body } = await call('POST', '', valid);
    expect(status).toBe(409);
    expect(body.error).toBe('You have already reviewed this booking');
  });

  it('rethrows unexpected insert errors', async () => {
    responses = [
      [/FROM bookings/, [BOOKING]],
      [/INSERT INTO reviews/, () => { throw new Error('connection lost'); }],
    ];
    await expect(call('POST', '', valid)).rejects.toThrow('connection lost');
  });
});
