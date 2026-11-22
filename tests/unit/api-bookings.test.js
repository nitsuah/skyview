import { describe, it, expect, vi, beforeEach } from 'vitest';

// Handler-level tests for /api/bookings with sql, auth, email, scheduling and
// Stripe mocked (F-20260916-06). They pin the route contracts and the money
// paths: PaymentIntent create on booking, cancel on decline, capture before the
// job is marked completed, and payout + invoice after capture.
const sqlMock = vi.fn();
vi.mock('../../netlify/functions/utils/db.js', () => ({ sql: sqlMock }));

const requireAuthMock = vi.fn();
vi.mock('../../netlify/functions/utils/auth.js', () => ({ requireAuth: requireAuthMock }));

const availabilityMock = vi.fn();
vi.mock('../../netlify/functions/utils/scheduling.js', () => ({ checkOperatorAvailability: availabilityMock }));

const emailMocks = {
  sendBookingConfirmedEmail: vi.fn(),
  sendBookingDeclinedEmail: vi.fn(),
  sendBookingCompletedEmail: vi.fn(),
};
vi.mock('../../netlify/functions/utils/email.js', () => emailMocks);

const stripeMock = {
  paymentIntents: { create: vi.fn(), cancel: vi.fn(), capture: vi.fn(), retrieve: vi.fn() },
  transfers: { create: vi.fn() },
  customers: { create: vi.fn() },
  invoices: { create: vi.fn(), finalizeInvoice: vi.fn(), pay: vi.fn() },
  invoiceItems: { create: vi.fn() },
};
// A getter so individual tests can switch payments off (stripe = null), which
// is how the app runs when STRIPE_SECRET_KEY is unset.
const stripeState = { client: stripeMock };
vi.mock('../../netlify/functions/utils/stripe.js', () => ({
  get stripe() { return stripeState.client; },
}));

const { default: handler } = await import('../../netlify/functions/api-bookings.mjs');

const CLIENT = { id: 'client-1', role: 'client', name: 'Cora Client' };
const OPERATOR = { id: 'op-1', role: 'operator', name: 'Otto Operator' };
const OTHER_OPERATOR = { id: 'op-2', role: 'operator', name: 'Other' };
const ADMIN = { id: 'admin-1', role: 'admin', name: 'Ada Admin' };

const BOOKING_ID = 'booking-1';
const JOB_ID = 'job-1';
const baseBooking = {
  id: BOOKING_ID,
  job_id: JOB_ID,
  client_id: CLIENT.id,
  operator_id: OPERATOR.id,
  scheduled_at: '2027-03-01T15:00:00Z',
  duration_hours: 2,
  total_cents: 10000,
  platform_fee_cents: 1500,
  operator_payout_cents: 8500,
  status: 'pending',
  stripe_payment_intent_id: 'pi_123',
};

// sql is a tagged template; respond by matching the normalized query text so
// the tests don't depend on the exact number or order of unrelated queries.
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
const queryIndex = (pattern) => queries().findIndex((q) => pattern.test(q.text));
const ran = (pattern) => queryIndex(pattern) !== -1;
const callOrderOfQuery = (pattern) => sqlMock.mock.invocationCallOrder[queryIndex(pattern)];

const req = (method, path, body) =>
  new Request(`http://localhost/api/bookings${path}`, {
    method,
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
const call = async (method, path, body) => {
  const res = await handler(req(method, path, body));
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
};
const allStripeFns = () => Object.values(stripeMock).flatMap((group) => Object.values(group));

beforeEach(() => {
  responses = [];
  stripeState.client = stripeMock;
  sqlMock.mockClear();
  requireAuthMock.mockReset();
  availabilityMock.mockReset().mockResolvedValue({ ok: true });
  for (const fn of Object.values(emailMocks)) fn.mockReset().mockResolvedValue(undefined);
  for (const fn of allStripeFns()) fn.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('routing', () => {
  it('answers CORS preflight without auth', async () => {
    const res = await call('OPTIONS', '');
    expect(res.status).toBe(204);
    expect(requireAuthMock).not.toHaveBeenCalled();
  });

  it('404s unknown method/route combinations', async () => {
    expect((await call('DELETE', '')).status).toBe(404);
    expect((await call('GET', `/${BOOKING_ID}/confirm`)).status).toBe(404);
  });

  it('401s every route when unauthenticated', async () => {
    requireAuthMock.mockResolvedValue(null);
    for (const [method, path] of [
      ['GET', ''], ['POST', ''], ['GET', `/${BOOKING_ID}`],
      ['POST', `/${BOOKING_ID}/confirm`], ['POST', `/${BOOKING_ID}/decline`], ['POST', `/${BOOKING_ID}/complete`], ['POST', `/${BOOKING_ID}/cancel`],
    ]) {
      expect((await call(method, path, method === 'POST' ? {} : undefined)).status).toBe(401);
    }
  });
});

describe('GET /api/bookings and /api/bookings/:id', () => {
  it('lists only the caller\'s own bookings by role', async () => {
    requireAuthMock.mockResolvedValue(CLIENT);
    responses = [[/FROM bookings b/, [baseBooking]]];
    const res = await call('GET', '');
    expect(res.body).toEqual([baseBooking]);
    expect(queries()[0].text).toMatch(/WHERE b.client_id = \?/);
    expect(queries()[0].values).toEqual([CLIENT.id]);
  });

  it('lets a party or an admin read a booking, but not a stranger', async () => {
    responses = [[/SELECT \* FROM bookings WHERE id/, [baseBooking]]];
    requireAuthMock.mockResolvedValue(OPERATOR);
    expect((await call('GET', `/${BOOKING_ID}`)).status).toBe(200);
    requireAuthMock.mockResolvedValue(ADMIN);
    expect((await call('GET', `/${BOOKING_ID}`)).status).toBe(200);
    requireAuthMock.mockResolvedValue(OTHER_OPERATOR);
    expect((await call('GET', `/${BOOKING_ID}`)).status).toBe(403);
  });
});

describe('POST /api/bookings (create)', () => {
  const body = { job_id: JOB_ID, operator_id: OPERATOR.id, total_cents: 10000, scheduled_at: '2027-03-01T15:00:00Z', duration_hours: 2 };
  const happyResponses = () => [
    [/FROM operator_profiles WHERE user_id = \? AND verification_status/, [{ id: 'profile-1', hourly_rate_cents: 5000, base_rate_cents: 3000 }]],
    [/^UPDATE jobs SET status = 'booked'/, [{ id: JOB_ID, status: 'booked' }]],
    [/^INSERT INTO bookings/, [{ ...baseBooking, stripe_payment_intent_id: null }]],
  ];

  beforeEach(() => requireAuthMock.mockResolvedValue(CLIENT));

  it('only lets clients book', async () => {
    requireAuthMock.mockResolvedValue(OPERATOR);
    expect((await call('POST', '', body)).status).toBe(403);
  });

  it.each([
    ['invalid JSON', 'not json', 400],
    ['missing fields', { job_id: JOB_ID }, 400],
    ['a non-positive duration', { ...body, duration_hours: -2 }, 400],
    ['an absurd duration', { ...body, duration_hours: 1000 }, 400],
  ])('rejects %s', async (_label, payload, status) => {
    expect((await call('POST', '', payload)).status).toBe(status);
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
  });

  describe('server-side pricing', () => {
    const insertValues = () => queries().find((q) => /^INSERT INTO bookings/.test(q.text)).values;
    const setup = (op) => {
      responses = happyResponses();
      responses[0] = [responses[0][0], [{ id: 'profile-1', ...op }]];
      // Echo the priced values the handler inserted, like the database would.
      responses[2] = [responses[2][0], (v) => [{ ...baseBooking, stripe_payment_intent_id: null, total_cents: v[v.length - 3] }]];
      stripeMock.paymentIntents.create.mockResolvedValue({ id: 'pi_new', client_secret: 's' });
    };
    const both = { hourly_rate_cents: 5000, base_rate_cents: 3000 };

    it.each([
      ['hourly rate x hours', both, { duration_hours: 2.5 }, 12500],
      ['hours given as a numeric string', both, { duration_hours: '2' }, 10000],
      ['base rate when the operator has no hourly rate', { hourly_rate_cents: null, base_rate_cents: 3000 }, { duration_hours: null }, 3000],
    ])('prices from %s', async (_label, op, extra, expected) => {
      setup(op);
      const res = await call('POST', '', { ...body, ...extra });
      expect(res.status).toBe(201);
      const v = insertValues();
      expect(v.slice(-3)).toEqual([expected, Math.round(expected * 0.15), expected - Math.round(expected * 0.15)]);
      expect(stripeMock.paymentIntents.create.mock.calls[0][0].amount).toBe(expected);
    });

    it('stores duration_hours as a finite number', async () => {
      setup(both);
      await call('POST', '', { ...body, duration_hours: '1.5' });
      expect(insertValues()).toContain(1.5);
    });

    it('requires duration_hours when the operator bills hourly', async () => {
      setup(both);
      const res = await call('POST', '', { ...body, duration_hours: null });
      expect(res.status).toBe(400);
      expect(ran(/^UPDATE jobs/)).toBe(false);
    });

    it.each(['abc', 'Infinity', 0, -1])('rejects duration_hours %s', async (duration_hours) => {
      setup(both);
      expect((await call('POST', '', { ...body, duration_hours })).status).toBe(400);
    });

    it.each([1, 49, 999999999, -5, 10.5])('ignores a client-supplied total of %s', async (total_cents) => {
      setup(both);
      const res = await call('POST', '', { ...body, total_cents });
      expect(res.status).toBe(201);
      expect(insertValues().slice(-3)[0]).toBe(10000);
    });

    it('does not price from the job budget when the operator has no rates', async () => {
      setup({ hourly_rate_cents: null, base_rate_cents: null });
      const res = await call('POST', '', { ...body, budget_cents: 20000 });
      expect(res.status).toBe(422);
      expect(ran(/budget_cents/)).toBe(false);
      expect(ran(/^UPDATE jobs/)).toBe(false);
    });

    it('422s under the minimum charge when payments are enabled', async () => {
      setup({ hourly_rate_cents: null, base_rate_cents: 20 });
      expect((await call('POST', '', body)).status).toBe(422);
      expect(ran(/^INSERT INTO bookings/)).toBe(false);
    });
  });

  it('409s when the operator is not verified', async () => {
    const res = await call('POST', '', body);
    expect(res.status).toBe(409);
    expect(ran(/^UPDATE jobs/)).toBe(false);
  });

  it('409s with the scheduling reason when the operator is unavailable', async () => {
    responses = happyResponses();
    availabilityMock.mockResolvedValue({ ok: false, reason: 'Operator is booked then' });
    const res = await call('POST', '', body);
    expect(res).toEqual({ status: 409, body: { error: 'Operator is booked then' } });
    expect(availabilityMock).toHaveBeenCalledWith(OPERATOR.id, body.scheduled_at, body.duration_hours);
  });

  it('treats blank scheduled_at/duration_hours as not provided', async () => {
    responses = happyResponses();
    responses[0] = [responses[0][0], [{ id: 'profile-1', hourly_rate_cents: null, base_rate_cents: 3000 }]];
    stripeMock.paymentIntents.create.mockResolvedValue({ id: 'pi_new', client_secret: 'secret_new' });
    await call('POST', '', { ...body, scheduled_at: '', duration_hours: '' });
    expect(availabilityMock).toHaveBeenCalledWith(OPERATOR.id, null, null);
  });

  it('409s when the job is no longer open (double-booking gate)', async () => {
    responses = [happyResponses()[0]];
    const res = await call('POST', '', body);
    expect(res.status).toBe(409);
    expect(ran(/^INSERT INTO bookings/)).toBe(false);
  });

  it('creates the booking with a 15% fee and a manual-capture PaymentIntent', async () => {
    responses = happyResponses();
    stripeMock.paymentIntents.create.mockResolvedValue({ id: 'pi_new', client_secret: 'secret_new' });

    const res = await call('POST', '', body);

    expect(res.status).toBe(201);
    expect(res.body.stripe_client_secret).toBe('secret_new');
    const insert = queries().find((q) => /^INSERT INTO bookings/.test(q.text));
    expect(insert.values.slice(-3)).toEqual([10000, 1500, 8500]);
    expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith({
      amount: 10000,
      currency: 'usd',
      capture_method: 'manual',
      metadata: { booking_id: BOOKING_ID, job_id: JOB_ID, client_id: CLIENT.id, operator_id: OPERATOR.id },
    });
    const persist = queries().find((q) => /SET stripe_payment_intent_id/.test(q.text));
    expect(persist.values).toEqual(['pi_new', BOOKING_ID]);
  });

  it('reopens the job and 409s when the insert hits the overlap constraint', async () => {
    responses = happyResponses();
    responses[2] = [/^INSERT INTO bookings/, () => { throw Object.assign(new Error('overlap'), { code: '23P01' }); }];
    const res = await call('POST', '', body);
    expect(res.status).toBe(409);
    expect(ran(/^UPDATE jobs SET status = 'open'/)).toBe(true);
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
  });

  it('rolls back the booking and job and 502s when Stripe fails', async () => {
    responses = happyResponses();
    stripeMock.paymentIntents.create.mockRejectedValue(new Error('card_declined'));

    const res = await call('POST', '', body);

    expect(res.status).toBe(502);
    expect(queries().find((q) => /^DELETE FROM bookings/.test(q.text)).values).toEqual([BOOKING_ID]);
    expect(queries().find((q) => /^UPDATE jobs SET status = 'open'/.test(q.text)).values).toEqual([JOB_ID]);
  });

  it('skips payments entirely when Stripe is not configured', async () => {
    stripeState.client = null;
    responses = happyResponses();
    const res = await call('POST', '', body);
    expect(res.status).toBe(201);
    expect(res.body.stripe_client_secret).toBeNull();
    expect(ran(/stripe_payment_intent_id/)).toBe(false);
  });
});

describe('POST /api/bookings/:id/confirm', () => {
  const confirmResponses = () => [
    [/^SELECT \* FROM bookings WHERE id/, [baseBooking]],
    [/^UPDATE bookings SET status = 'confirmed'/, [{ ...baseBooking, status: 'confirmed' }]],
    [/^SELECT email FROM users/, [{ email: 'cora@example.com' }]],
    [/^SELECT title FROM jobs/, [{ title: 'Roof survey' }]],
  ];

  it('only lets the booked operator confirm', async () => {
    responses = confirmResponses();
    requireAuthMock.mockResolvedValue(CLIENT);
    expect((await call('POST', `/${BOOKING_ID}/confirm`)).status).toBe(403);
    requireAuthMock.mockResolvedValue(OTHER_OPERATOR);
    expect((await call('POST', `/${BOOKING_ID}/confirm`)).status).toBe(403);
    requireAuthMock.mockResolvedValue(OPERATOR);
    responses = [];
    expect((await call('POST', `/${BOOKING_ID}/confirm`)).status).toBe(404);
  });

  it('409s when another accepted booking now overlaps', async () => {
    requireAuthMock.mockResolvedValue(OPERATOR);
    responses = confirmResponses();
    availabilityMock.mockResolvedValue({ ok: false, reason: 'Overlaps another booking' });
    const res = await call('POST', `/${BOOKING_ID}/confirm`);
    expect(res.status).toBe(409);
    expect(availabilityMock).toHaveBeenCalledWith(OPERATOR.id, baseBooking.scheduled_at, baseBooking.duration_hours, BOOKING_ID);
    expect(ran(/SET status = 'confirmed'/)).toBe(false);
  });

  it('confirms a pending booking, emails the client, and makes no Stripe call', async () => {
    requireAuthMock.mockResolvedValue(OPERATOR);
    responses = confirmResponses();
    const res = await call('POST', `/${BOOKING_ID}/confirm`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
    expect(emailMocks.sendBookingConfirmedEmail).toHaveBeenCalledWith('cora@example.com', { title: 'Roof survey' }, OPERATOR.name);
    for (const fn of allStripeFns()) expect(fn).not.toHaveBeenCalled();
  });

  it('409s when payment setup has not finished', async () => {
    requireAuthMock.mockResolvedValue(OPERATOR);
    responses = [[/^SELECT \* FROM bookings WHERE id/, [{ ...baseBooking, stripe_payment_intent_id: null }]]];
    expect((await call('POST', `/${BOOKING_ID}/confirm`)).status).toBe(409);
    expect(ran(/SET status = 'confirmed'/)).toBe(false);
  });

  it('409s when the booking is no longer pending', async () => {
    requireAuthMock.mockResolvedValue(OPERATOR);
    responses = [confirmResponses()[0]];
    expect((await call('POST', `/${BOOKING_ID}/confirm`)).status).toBe(409);
  });

  it('still confirms when the email fails', async () => {
    requireAuthMock.mockResolvedValue(OPERATOR);
    responses = confirmResponses();
    emailMocks.sendBookingConfirmedEmail.mockRejectedValue(new Error('smtp down'));
    expect((await call('POST', `/${BOOKING_ID}/confirm`)).status).toBe(200);
  });
});

describe('POST /api/bookings/:id/decline', () => {
  const declineResponses = (booking = baseBooking) => [
    [/^SELECT \* FROM bookings WHERE id/, [booking]],
    [/^UPDATE bookings SET status = 'cancelled'/, [{ ...booking, status: 'cancelled' }]],
    [/^SELECT email FROM users/, [{ email: 'cora@example.com' }]],
    [/^SELECT title FROM jobs/, [{ title: 'Roof survey' }]],
  ];

  beforeEach(() => requireAuthMock.mockResolvedValue(OPERATOR));

  it('only lets the booked operator decline', async () => {
    responses = declineResponses();
    requireAuthMock.mockResolvedValue(OTHER_OPERATOR);
    expect((await call('POST', `/${BOOKING_ID}/decline`)).status).toBe(403);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  it('cancels the booking, reopens the job, emails the client and releases the authorization', async () => {
    responses = declineResponses();
    stripeMock.paymentIntents.cancel.mockResolvedValue({ id: 'pi_123', status: 'canceled' });

    const res = await call('POST', `/${BOOKING_ID}/decline`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
    expect(queries().find((q) => /^UPDATE jobs SET status = 'open'/.test(q.text)).values).toEqual([JOB_ID]);
    expect(emailMocks.sendBookingDeclinedEmail).toHaveBeenCalledWith('cora@example.com', { title: 'Roof survey' });
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledWith('pi_123');
  });

  it('409s without touching Stripe when the booking is not pending', async () => {
    responses = [declineResponses()[0]];
    expect((await call('POST', `/${BOOKING_ID}/decline`)).status).toBe(409);
    expect(ran(/^UPDATE jobs/)).toBe(false);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  it('still declines when the Stripe cancel fails (uncaptured PIs expire on their own)', async () => {
    responses = declineResponses();
    stripeMock.paymentIntents.cancel.mockRejectedValue(new Error('stripe down'));
    const res = await call('POST', `/${BOOKING_ID}/decline`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('skips the Stripe cancel when the booking has no PaymentIntent', async () => {
    responses = declineResponses({ ...baseBooking, stripe_payment_intent_id: null });
    expect((await call('POST', `/${BOOKING_ID}/decline`)).status).toBe(200);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  });
});

describe('POST /api/bookings/:id/complete', () => {
  const completeResponses = ({ booking = { ...baseBooking, status: 'confirmed' }, opProfile = { stripe_account_id: 'acct_op', stripe_onboarded: true }, customerId = null } = {}) => [
    [/^SELECT b\.\*, j\.status AS job_status/, [{ ...booking, job_status: 'booked' }]],
    [/^UPDATE bookings SET status = 'completed'/, [{ ...booking, status: 'completed' }]],
    [/FROM operator_profiles WHERE user_id/, opProfile ? [opProfile] : []],
    [/^SELECT id, email, name, stripe_customer_id FROM users/, [{ id: CLIENT.id, email: 'cora@example.com', name: CLIENT.name, stripe_customer_id: customerId }]],
    [/^SELECT email, name FROM users/, [{ email: 'otto@example.com', name: OPERATOR.name }]],
    [/^SELECT title FROM jobs/, [{ title: 'Roof survey' }]],
  ];
  const stubStripeSuccess = () => {
    stripeMock.paymentIntents.capture.mockResolvedValue({ id: 'pi_123', latest_charge: 'ch_123' });
    stripeMock.transfers.create.mockResolvedValue({ id: 'tr_123' });
    stripeMock.customers.create.mockResolvedValue({ id: 'cus_new' });
    stripeMock.invoices.create.mockResolvedValue({ id: 'in_123' });
    stripeMock.invoiceItems.create.mockResolvedValue({ id: 'ii_123' });
    stripeMock.invoices.finalizeInvoice.mockResolvedValue({ id: 'in_123' });
    stripeMock.invoices.pay.mockResolvedValue({ id: 'in_123', paid: true });
  };
  const payoutStatuses = () => queries()
    .filter((q) => /^UPDATE bookings SET payout_status/.test(q.text))
    .map((q) => q.text.match(/payout_status = '(\w+)'/)[1]);

  beforeEach(() => {
    requireAuthMock.mockResolvedValue(CLIENT);
    stubStripeSuccess();
  });

  it('only lets the booking\'s client or an admin complete', async () => {
    responses = completeResponses();
    requireAuthMock.mockResolvedValue(OPERATOR);
    expect((await call('POST', `/${BOOKING_ID}/complete`)).status).toBe(403);
    requireAuthMock.mockResolvedValue(ADMIN);
    expect((await call('POST', `/${BOOKING_ID}/complete`)).status).toBe(200);
  });

  it('409s without capturing when the job was cancelled or the status is wrong', async () => {
    responses = [completeResponses()[0]];
    expect((await call('POST', `/${BOOKING_ID}/complete`)).status).toBe(409);
    expect(stripeMock.paymentIntents.capture).not.toHaveBeenCalled();
    expect(ran(/^UPDATE jobs/)).toBe(false);
  });

  it('captures, then completes the job, then pays out, invoices and emails the operator', async () => {
    responses = completeResponses();

    const res = await call('POST', `/${BOOKING_ID}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(stripeMock.paymentIntents.capture).toHaveBeenCalledWith('pi_123', {}, { idempotencyKey: `capture-${BOOKING_ID}` });
    expect(stripeMock.paymentIntents.capture.mock.invocationCallOrder[0])
      .toBeLessThan(callOrderOfQuery(/^UPDATE jobs SET status = 'completed'/));

    expect(stripeMock.transfers.create).toHaveBeenCalledWith(
      { amount: 8500, currency: 'usd', destination: 'acct_op', source_transaction: 'ch_123', metadata: { booking_id: BOOKING_ID } },
      { idempotencyKey: `transfer-${BOOKING_ID}` },
    );
    expect(queries().find((q) => /SET stripe_transfer_id/.test(q.text)).values).toEqual(['tr_123', BOOKING_ID]);

    expect(stripeMock.customers.create).toHaveBeenCalledWith(
      { email: 'cora@example.com', name: CLIENT.name, metadata: { skyview_user_id: CLIENT.id } },
      { idempotencyKey: `create-customer-${CLIENT.id}` },
    );
    expect(stripeMock.invoices.create).toHaveBeenCalledWith(
      { customer: 'cus_new', auto_advance: false, metadata: { booking_id: BOOKING_ID } },
      { idempotencyKey: `invoice-${BOOKING_ID}` },
    );
    expect(stripeMock.invoiceItems.create).toHaveBeenCalledWith(
      { customer: 'cus_new', invoice: 'in_123', amount: 10000, currency: 'usd', description: 'SkyView Drone Service: Roof survey' },
      { idempotencyKey: `invoice-item-${BOOKING_ID}` },
    );
    expect(stripeMock.invoices.pay).toHaveBeenCalledWith('in_123', { paid_out_of_band: true });

    expect(payoutStatuses()).toEqual(['pending', 'completed']);
    expect(emailMocks.sendBookingCompletedEmail).toHaveBeenCalledWith('otto@example.com', OPERATOR.name, { title: 'Roof survey' }, 8500);
  });

  it('moves to capture_failed, not completed or disputed, and leaves the job alone when capture fails', async () => {
    responses = completeResponses();
    stripeMock.paymentIntents.capture.mockRejectedValue(new Error('authorization expired'));

    const res = await call('POST', `/${BOOKING_ID}/complete`);

    expect(res.status).toBe(402);
    expect(res.body.booking.status).toBe('capture_failed');
    expect(ran(/^UPDATE bookings SET status = 'capture_failed'/)).toBe(true);
    expect(ran(/'disputed'/)).toBe(false);
    expect(ran(/^UPDATE jobs/)).toBe(false);
    expect(stripeMock.transfers.create).not.toHaveBeenCalled();
    expect(payoutStatuses()).toEqual([]);
  });

  it('captures idempotently per booking', async () => {
    responses = completeResponses();
    await call('POST', `/${BOOKING_ID}/complete`);
    expect(stripeMock.paymentIntents.capture).toHaveBeenCalledWith('pi_123', {}, { idempotencyKey: `capture-${BOOKING_ID}` });
  });

  it('treats a capture error as success when the PaymentIntent already succeeded', async () => {
    responses = completeResponses();
    stripeMock.paymentIntents.capture.mockRejectedValue(new Error('already captured'));
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ id: 'pi_123', status: 'succeeded', latest_charge: 'ch_123' });
    const res = await call('POST', `/${BOOKING_ID}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(ran(/^UPDATE bookings SET status = 'capture_failed'/)).toBe(false);
    expect(stripeMock.transfers.create).toHaveBeenCalled();
  });

  it('still fails when the PaymentIntent has not succeeded', async () => {
    responses = completeResponses();
    stripeMock.paymentIntents.capture.mockRejectedValue(new Error('expired'));
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ id: 'pi_123', status: 'requires_payment_method' });
    expect((await call('POST', `/${BOOKING_ID}/complete`)).status).toBe(402);
  });

  it('treats a null capture result as a failure when payments are enabled', async () => {
    responses = completeResponses();
    stripeMock.paymentIntents.capture.mockResolvedValue(null);
    const res = await call('POST', `/${BOOKING_ID}/complete`);
    expect(res.status).toBe(402);
    expect(ran(/^UPDATE bookings SET status = 'capture_failed'/)).toBe(true);
    expect(ran(/^UPDATE jobs/)).toBe(false);
  });

  it('refuses completion without a PaymentIntent when payments are enabled', async () => {
    responses = completeResponses({ booking: { ...baseBooking, status: 'confirmed', stripe_payment_intent_id: null } });
    const res = await call('POST', `/${BOOKING_ID}/complete`);
    expect(res.status).toBe(409);
    expect(ran(/^UPDATE bookings SET status = 'completed'/)).toBe(false);
    expect(ran(/^UPDATE jobs/)).toBe(false);
  });

  // [status, completion allowed]
  it.each([
    ['pending', false],
    ['confirmed', true],
    ['in_progress', true],
    ['capture_failed', true],
    ['completed', false],
    ['cancelled', false],
    ['disputed', false],
  ])('booking status %s -> completion allowed: %s', async (status, allowed) => {
    responses = completeResponses({ booking: { ...baseBooking, status } });
    const res = await call('POST', `/${BOOKING_ID}/complete`);
    expect(res.status).toBe(allowed ? 200 : 409);
    expect(ran(/^UPDATE bookings SET status = 'completed'/)).toBe(allowed);
    expect(stripeMock.paymentIntents.capture).toHaveBeenCalledTimes(allowed ? 1 : 0);
  });

  it('retries a capture_failed booking through to completion', async () => {
    responses = completeResponses({ booking: { ...baseBooking, status: 'capture_failed' } });
    const res = await call('POST', `/${BOOKING_ID}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(ran(/^UPDATE jobs SET status = 'completed'/)).toBe(true);
  });

  it('keeps the completion but marks payout failed when the transfer fails', async () => {
    responses = completeResponses();
    stripeMock.transfers.create.mockRejectedValue(new Error('insufficient funds'));

    const res = await call('POST', `/${BOOKING_ID}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(ran(/^UPDATE jobs SET status = 'completed'/)).toBe(true);
    expect(payoutStatuses()).toEqual(['pending', 'failed']);
    expect(stripeMock.invoices.create).not.toHaveBeenCalled();
    expect(emailMocks.sendBookingCompletedEmail).not.toHaveBeenCalled();
  });

  it('marks payout failed when invoicing fails after the transfer', async () => {
    responses = completeResponses();
    stripeMock.invoices.finalizeInvoice.mockRejectedValue(new Error('invoice error'));
    expect((await call('POST', `/${BOOKING_ID}/complete`)).status).toBe(200);
    expect(stripeMock.transfers.create).toHaveBeenCalled();
    expect(payoutStatuses()).toEqual(['pending', 'failed']);
  });

  it('skips the transfer but still invoices when the operator has not finished Connect onboarding', async () => {
    responses = completeResponses({ opProfile: { stripe_account_id: 'acct_op', stripe_onboarded: false } });
    expect((await call('POST', `/${BOOKING_ID}/complete`)).status).toBe(200);
    expect(stripeMock.transfers.create).not.toHaveBeenCalled();
    expect(stripeMock.invoices.pay).toHaveBeenCalled();
    expect(payoutStatuses()).toEqual(['pending', 'completed']);
  });

  it('reuses an existing Stripe customer', async () => {
    responses = completeResponses({ customerId: 'cus_existing' });
    await call('POST', `/${BOOKING_ID}/complete`);
    expect(stripeMock.customers.create).not.toHaveBeenCalled();
    expect(stripeMock.invoices.create.mock.calls[0][0].customer).toBe('cus_existing');
  });

  it('completes the job without any payment calls when payments are off and the booking has no PaymentIntent', async () => {
    stripeState.client = null;
    responses = completeResponses({ booking: { ...baseBooking, status: 'confirmed', stripe_payment_intent_id: null } });
    const res = await call('POST', `/${BOOKING_ID}/complete`);
    expect(res.status).toBe(200);
    expect(ran(/^UPDATE jobs SET status = 'completed'/)).toBe(true);
    for (const fn of allStripeFns()) expect(fn).not.toHaveBeenCalled();
    expect(payoutStatuses()).toEqual([]);
  });

  it('completes the job without payment calls when Stripe is not configured', async () => {
    stripeState.client = null;
    responses = completeResponses();
    expect((await call('POST', `/${BOOKING_ID}/complete`)).status).toBe(200);
    expect(ran(/^UPDATE jobs SET status = 'completed'/)).toBe(true);
    expect(payoutStatuses()).toEqual([]);
  });
});

describe('POST /api/bookings/:id/cancel (exit from capture_failed)', () => {
  const failed = { ...baseBooking, status: 'capture_failed' };
  const cancelResponses = () => [
    [/^SELECT \* FROM bookings WHERE id/, [failed]],
    [/^UPDATE bookings SET status = 'cancelled'/, [{ ...failed, status: 'cancelled' }]],
  ];

  it.each([[CLIENT, 200], [ADMIN, 200], [OPERATOR, 403], [OTHER_OPERATOR, 403]])('as %o -> %i', async (user, status) => {
    requireAuthMock.mockResolvedValue(user);
    responses = cancelResponses();
    expect((await call('POST', `/${BOOKING_ID}/cancel`)).status).toBe(status);
  });

  it('cancels, reopens the job and releases the hold', async () => {
    requireAuthMock.mockResolvedValue(CLIENT);
    responses = cancelResponses();
    const res = await call('POST', `/${BOOKING_ID}/cancel`);
    expect(res.body.status).toBe('cancelled');
    expect(ran(/^UPDATE jobs SET status = 'open'/)).toBe(true);
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledWith('pi_123');
  });

  it('409s without side effects when the update matches nothing (any other status)', async () => {
    requireAuthMock.mockResolvedValue(CLIENT);
    responses = [cancelResponses()[0]];
    expect((await call('POST', `/${BOOKING_ID}/cancel`)).status).toBe(409);
    expect(ran(/^UPDATE jobs/)).toBe(false);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  it('only updates from capture_failed', async () => {
    requireAuthMock.mockResolvedValue(CLIENT);
    responses = cancelResponses();
    await call('POST', `/${BOOKING_ID}/cancel`);
    expect(queries().find((q) => /^UPDATE bookings SET status = 'cancelled'/.test(q.text)).text).toMatch(/status = 'capture_failed'/);
  });
});
