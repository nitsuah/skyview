import { describe, it, expect, vi, beforeEach } from 'vitest';

const sqlMock = vi.fn();
vi.mock('../../netlify/functions/utils/db.js', () => ({ sql: sqlMock }));
const requireAuthMock = vi.fn();
vi.mock('../../netlify/functions/utils/auth.js', () => ({ requireAuth: requireAuthMock }));
vi.mock('../../netlify/functions/utils/email.js', () => ({
  sendBookingConfirmedEmail: vi.fn(),
  sendBookingDeclinedEmail: vi.fn(),
  sendBookingCompletedEmail: vi.fn(),
}));
const availabilityMock = vi.fn();
vi.mock('../../netlify/functions/utils/scheduling.js', () => ({
  checkOperatorAvailability: availabilityMock,
}));
const priceBookingMock = vi.fn(() => 12345);
const authorizePaymentMock = vi.fn(async () => null);
vi.mock('../../netlify/functions/utils/booking-billing.js', () => ({
  MIN_CHARGE_CENTS: 50,
  paymentsEnabled: () => false,
  splitTotal: () => ({ fee: 1234, payout: 11111 }),
  priceBooking: priceBookingMock,
  authorizePayment: authorizePaymentMock,
  releasePayment: vi.fn(),
  capturePayment: vi.fn(),
  retrievePayment: vi.fn(),
  payoutAndInvoice: vi.fn(),
}));

const { default: handler, COMPLETABLE_STATUSES } = await import('../../netlify/functions/api-bookings.mjs');
const CLIENT = { id: 'client-1', role: 'client' };
const OPERATOR_PROFILE = { id: 'op-1', hourly_rate_cents: 5000, base_rate_cents: 10000 };
const BOOKING = {
  id: 'booking-1', job_id: 'job-1', client_id: CLIENT.id, operator_id: 'op-1',
  status: 'pending', total_cents: 12345, stripe_payment_intent_id: null,
};

const normalize = (strings) => strings.join('?').replace(/\\s+/g, ' ').trim();
const post = async (path, body) => {
  const req = new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const res = await handler(req);
  return { status: res.status, body: await res.json() };
};

beforeEach(() => {
  sqlMock.mockReset();
  requireAuthMock.mockReset().mockResolvedValue(CLIENT);
  availabilityMock.mockReset().mockResolvedValue({ ok: true });
  priceBookingMock.mockClear();
  authorizePaymentMock.mockClear();
});

describe('booking security regressions', () => {
  it('does not allow a client to complete a pending booking before operator confirmation', async () => {
    sqlMock.mockImplementation(async (strings) => {
      const query = normalize(strings);
      if (/SELECT b\\.\\*, j\\.status AS job_status/.test(query)) return [{ ...BOOKING, job_status: 'booked' }];
      return [];
    });

    const result = await post('/api/bookings/booking-1/complete');
    expect(result.status).toBe(409);
    expect(result.body.error).toMatch(/cannot be completed/i);
    expect(sqlMock.mock.calls.some(([strings]) => /UPDATE bookings SET status = 'completed'/.test(normalize(strings)))).toBe(false);
  });

  it('prices a booking from the verified operator profile and ignores client total_cents', async () => {
    sqlMock.mockImplementation(async (strings) => {
      const query = normalize(strings);
      if (/FROM operator_profiles/.test(query)) return [OPERATOR_PROFILE];
      if (/UPDATE jobs SET status = 'booked'/.test(query)) return [{ id: 'job-1' }];
      if (/INSERT INTO bookings/.test(query)) return [BOOKING];
      return [];
    });

    const result = await post('/api/bookings', {
      job_id: 'job-1',
      operator_id: 'op-1',
      duration_hours: 2,
      total_cents: 1,
    });
    expect(result.status).toBe(201);
    expect(priceBookingMock).toHaveBeenCalledWith(OPERATOR_PROFILE, 2);

    const insert = sqlMock.mock.calls.find(([strings]) => /INSERT INTO bookings/.test(normalize(strings)));
    expect(insert).toBeTruthy();
    expect(insert.slice(1)).toContain(12345);
    expect(insert.slice(1)).not.toContain(1);
  });

  it('keeps pending out of the allowed completion states', () => {
    expect(COMPLETABLE_STATUSES).toEqual(['confirmed', 'in_progress', 'capture_failed']);
    expect(COMPLETABLE_STATUSES).not.toContain('pending');
  });
});
