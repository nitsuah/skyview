import { describe, it, expect, vi, beforeEach } from 'vitest';

// Handler-level tests for POST /api/operators/:id/verify: approval is bound to
// the certificate revision the administrator reviewed.
const sqlMock = vi.fn();
vi.mock('../../netlify/functions/utils/db.js', () => ({ sql: sqlMock }));
const requireAuthMock = vi.fn();
vi.mock('../../netlify/functions/utils/auth.js', () => ({ requireAuth: requireAuthMock }));
vi.mock('../../netlify/functions/utils/email.js', () => ({ sendOperatorApprovedEmail: vi.fn() }));
vi.mock('../../netlify/functions/utils/stripe.js', () => ({ stripe: null }));

const { default: handler } = await import('../../netlify/functions/api-operators.mjs');

const OP = '11111111-1111-1111-1111-111111111111';
const post = (body) => handler(new Request(`http://localhost/api/operators/${OP}/verify`, { method: 'POST', body: JSON.stringify(body) }));
const text = (call) => call[0].join('?').replace(/\s+/g, ' ');

beforeEach(() => {
  sqlMock.mockReset();
  requireAuthMock.mockReset().mockResolvedValue({ id: 'admin-1', role: 'admin' });
});

describe('POST /api/operators/:id/verify', () => {
  it('requires a certificate revision to approve', async () => {
    const res = await post({ action: 'approve' });
    expect(res.status).toBe(400);
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it('approves a matching revision atomically in one statement', async () => {
    sqlMock.mockResolvedValueOnce([{ user_id: OP }]);
    const res = await post({ action: 'approve', cert_revision: 3 });
    expect(res.status).toBe(200);
    const call = sqlMock.mock.calls[0];
    expect(text(call)).toMatch(/cert_revision = \?/);
    expect(call.slice(1)).toContain(3);
  });

  it('409s when the certificate changed since review', async () => {
    sqlMock.mockResolvedValueOnce([]).mockResolvedValueOnce([{ '?column?': 1 }]);
    const res = await post({ action: 'approve', cert_revision: 2 });
    expect(res.status).toBe(409);
  });

  it('404s for an unknown operator', async () => {
    sqlMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    expect((await post({ action: 'approve', cert_revision: 0 })).status).toBe(404);
  });

  it('does not require a revision to reject or suspend', async () => {
    sqlMock.mockResolvedValue([{ user_id: OP }]);
    expect((await post({ action: 'reject', reason: 'x' })).status).toBe(200);
    expect((await post({ action: 'suspend' })).status).toBe(200);
  });

  it('is admin only', async () => {
    requireAuthMock.mockResolvedValue({ id: 'op', role: 'operator' });
    expect((await post({ action: 'approve', cert_revision: 0 })).status).toBe(403);
  });
});
