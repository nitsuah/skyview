import { describe, it, expect, vi, beforeEach } from 'vitest';

// checkOperatorAvailability's SQL text itself is verified against a real
// Postgres in a separate local run (the neon() HTTP driver this app uses
// can't be pointed at a plain local Postgres, so that check isn't
// reproducible here) — this file covers the JS-level branching: early
// returns, validation, and which query result flips the outcome.
const sqlMock = vi.fn();
vi.mock('../../netlify/functions/utils/db.js', () => ({ sql: sqlMock }));

const { checkOperatorAvailability } = await import('../../netlify/functions/utils/scheduling.js');

// sqlMock is called as a tagged template: sql`...`(strings, ...values).
// Each queueResult() sets up the next call's resolved rows.
function queueResult(rows) {
  sqlMock.mockImplementationOnce(() => Promise.resolve(rows));
}

beforeEach(() => {
  sqlMock.mockReset();
});

describe('checkOperatorAvailability', () => {
  it('is ok with no query when no time is proposed yet', async () => {
    const result = await checkOperatorAvailability('op1', null, 2);
    expect(result).toEqual({ ok: true });
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it('rejects an unparseable scheduled_at without querying', async () => {
    const result = await checkOperatorAvailability('op1', 'not-a-date', 2);
    expect(result.ok).toBe(false);
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it('rejects a non-positive duration without querying', async () => {
    const result = await checkOperatorAvailability('op1', '2027-01-04T09:00:00Z', 0);
    expect(result.ok).toBe(false);
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it('rejects when the operator already has an overlapping booking', async () => {
    queueResult([{ id: 'existing-booking' }]); // overlap query finds a match
    const result = await checkOperatorAvailability('op1', '2027-01-04T09:00:00Z', 2);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/overlap/i);
    expect(sqlMock).toHaveBeenCalledTimes(1); // short-circuits before blocked/weekly checks
  });

  it('rejects a blocked date even with no scheduling conflict', async () => {
    queueResult([]);                        // no overlap
    queueResult([{ id: 'blocked-row' }]);    // blocked date matches
    const result = await checkOperatorAvailability('op1', '2027-01-05T09:00:00Z', 2);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/unavailable/i);
    expect(sqlMock).toHaveBeenCalledTimes(2);
  });

  it('is ok when the operator has declared no availability at all (no restriction)', async () => {
    queueResult([]); // no overlap
    queueResult([]); // not blocked
    queueResult([]); // zero weekly rows — opt-in feature, not required
    const result = await checkOperatorAvailability('op1', '2027-01-04T09:00:00Z', 2);
    expect(result).toEqual({ ok: true });
  });

  it('rejects a time outside the operator\'s declared weekly window', async () => {
    queueResult([]); // no overlap
    queueResult([]); // not blocked
    // 2027-01-04 is a Monday (day_of_week 1); declare Tuesday only
    queueResult([{ day_of_week: 2, start_time: '09:00:00', end_time: '17:00:00' }]);
    const result = await checkOperatorAvailability('op1', '2027-01-04T09:00:00Z', 2);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/outside/i);
  });

  it('accepts a time inside the operator\'s declared weekly window', async () => {
    queueResult([]); // no overlap
    queueResult([]); // not blocked
    queueResult([{ day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00' }]); // Monday
    const result = await checkOperatorAvailability('op1', '2027-01-04T10:00:00Z', 2);
    expect(result).toEqual({ ok: true });
  });

  it('rejects a booking that would run past the end of the declared window', async () => {
    queueResult([]);
    queueResult([]);
    queueResult([{ day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00' }]);
    // starts in-window but a 9-hour job runs to 19:00, past the 17:00 close
    const result = await checkOperatorAvailability('op1', '2027-01-04T16:00:00Z', 3);
    expect(result.ok).toBe(false);
  });
});
