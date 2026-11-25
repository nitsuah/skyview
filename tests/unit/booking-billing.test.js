import { describe, it, expect, vi, beforeEach } from 'vitest';

// Unit tests for booking-billing.js (money movement). Mocks db and leaves
// Stripe unset so every function hits the no-op branch.
vi.mock('../../netlify/functions/utils/db.js', () => ({ sql: vi.fn() }));
delete process.env.STRIPE_SECRET_KEY;
const billing = await import('../../netlify/functions/utils/booking-billing.js');

describe('splitTotal', () => {
  it('splits 10000 cents into 15% fee and 85% payout', () => {
    expect(billing.splitTotal(10000)).toEqual({ fee: 1500, payout: 8500 });
  });

  it('splits 333 cents with fee + payout === total and fee === 50', () => {
    const { fee, payout } = billing.splitTotal(333);
    expect(fee + payout).toBe(333);
    expect(fee).toBe(50);
  });
});

describe('MIN_CHARGE_CENTS', () => {
  it('is 50', () => {
    expect(billing.MIN_CHARGE_CENTS).toBe(50);
  });
});

describe('priceBooking', () => {
  it('hourly rate x hours rounds (5000 * 2.5 = 12500)', () => {
    expect(billing.priceBooking({ hourly_rate_cents: 5000, base_rate_cents: 0 }, 2.5)).toBe(12500);
  });

  it('hourly rate with missing hours returns null', () => {
    expect(billing.priceBooking({ hourly_rate_cents: 5000, base_rate_cents: 0 }, null)).toBeNull();
  });

  it('hourly rate with zero hours returns null', () => {
    expect(billing.priceBooking({ hourly_rate_cents: 5000, base_rate_cents: 0 }, 0)).toBeNull();
  });

  it('hourly rate with NaN hours returns null', () => {
    expect(billing.priceBooking({ hourly_rate_cents: 5000, base_rate_cents: 0 }, NaN)).toBeNull();
  });

  it('no hourly rate falls back to base_rate_cents', () => {
    expect(billing.priceBooking({ hourly_rate_cents: null, base_rate_cents: 3000 }, null)).toBe(3000);
  });

  it('no hourly rate with zero base_rate_cents returns null', () => {
    expect(billing.priceBooking({ hourly_rate_cents: null, base_rate_cents: 0 }, null)).toBeNull();
  });

  it('neither rate returns null', () => {
    expect(billing.priceBooking({ hourly_rate_cents: null, base_rate_cents: null }, 2)).toBeNull();
  });
});

describe('paymentsEnabled', () => {
  it('is false when Stripe is not configured', () => {
    expect(billing.paymentsEnabled()).toBe(false);
  });
});

describe('authorizePayment', () => {
  it('resolves null when Stripe is not configured', async () => {
    await expect(billing.authorizePayment({})).resolves.toBeNull();
  });
});

describe('releasePayment', () => {
  it('resolves true when Stripe is not configured', async () => {
    await expect(billing.releasePayment({ stripe_payment_intent_id: 'pi_1' })).resolves.toBe(true);
  });
});

describe('capturePayment', () => {
  it('resolves null when Stripe is not configured', async () => {
    await expect(billing.capturePayment({ stripe_payment_intent_id: 'pi_1' })).resolves.toBeNull();
  });
});

describe('retrievePayment', () => {
  it('resolves null when Stripe is not configured', async () => {
    await expect(billing.retrievePayment({ stripe_payment_intent_id: 'pi_1' })).resolves.toBeNull();
  });
});