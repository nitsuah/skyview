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

  it.each([['2027-02-30T09:00:00Z'], ['2027-02-29T09:00:00Z'], ['2027-04-31T09:00:00Z'], ['2027-13-01T09:00:00Z'], ['2027-01-04T25:00:00Z'], ['2027-01-04T09:61:00Z'], ['2027-01-04 09:00'], ['tomorrow'], [12345]])(
    'rejects the impossible or non-ISO scheduled_at %s without querying',
    async (value) => {
      const result = await checkOperatorAvailability('op1', value, 2);
      expect(result.ok).toBe(false);
      expect(sqlMock).not.toHaveBeenCalled();
    },
  );

  it.each([['2028-02-29T09:00:00Z'], ['2027-01-04T09:00:00.000Z'], ['2027-01-04T09:00Z'], ['2027-01-04 09:00:00+00'], ['2027-01-04T09:00:00+05:30'], [new Date('2027-01-04T09:00:00Z')]])(
    'accepts the valid timestamp %s',
    async (value) => {
      queueResult([]); queueResult([]); queueResult([]);
      expect((await checkOperatorAvailability('op1', value, 2)).ok).toBe(true);
    },
  );

  it('rejects a non-positive duration without querying', async () => {
    const result = await checkOperatorAvailability('op1', '2027-01-04T09:00:00Z', 0);
    expect(result.ok).toBe(false);
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it.each([['Infinity'], [Infinity], ['1e400'], [1e12], ['abc'], [-1]])(
    'rejects a non-finite or out-of-range duration (%s) without querying',
    async (duration) => {
      const result = await checkOperatorAvailability('op1', '2027-01-04T09:00:00Z', duration);
      expect(result.ok).toBe(false);
      expect(sqlMock).not.toHaveBeenCalled();
    },
  );

  it('validates the duration even when no time is proposed (it is stored either way)', async () => {
    const tooLong = await checkOperatorAvailability('op1', null, 100);
    expect(tooLong.ok).toBe(false);
    expect(sqlMock).not.toHaveBeenCalled();
    expect(await checkOperatorAvailability('op1', null, 2)).toEqual({ ok: true });
    expect(await checkOperatorAvailability('op1', null, null)).toEqual({ ok: true });
  });

  it.each([[0.001], ['2.005'], [1.999]])(
    'rejects a duration with more than 2 decimal places (%s), which NUMERIC(4,2) would silently round',
    async (duration) => {
      expect((await checkOperatorAvailability('op1', null, duration)).ok).toBe(false);
      expect((await checkOperatorAvailability('op1', '2027-01-04T09:00:00Z', duration)).ok).toBe(false);
      expect(sqlMock).not.toHaveBeenCalled();
    },
  );

  it.each([[0.25], [2.5], ['1.75'], [99.99], [0.01]])('accepts a storable duration (%s)', async (duration) => {
    expect(await checkOperatorAvailability('op1', null, duration)).toEqual({ ok: true });
  });

  it('checks every UTC date the booking touches against blocked dates', async () => {
    queueResult([]);                       // no overlap
    queueResult([{ id: 'blocked-row' }]);   // the 5th is blocked
    // 23:00 on the 4th + 3h runs into the 5th
    const result = await checkOperatorAvailability('op1', '2027-01-04T23:00:00Z', 3);
    expect(result.ok).toBe(false);
    // second sql call is the blocked-date query: [operatorId, firstDate, lastDate]
    const blockedCallValues = sqlMock.mock.calls[1].slice(1);
    expect(blockedCallValues).toEqual(['op1', '2027-01-04', '2027-01-05']);
  });

  it('does not treat a booking ending exactly at midnight as touching the next day', async () => {
    queueResult([]);
    queueResult([]);
    queueResult([]);
    await checkOperatorAvailability('op1', '2027-01-04T22:00:00Z', 2);
    expect(sqlMock.mock.calls[1].slice(1)).toEqual(['op1', '2027-01-04', '2027-01-04']);
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
