// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Handler-level tests for /api/uploads with sql, auth and Netlify Blobs mocked.
const sqlMock = vi.fn();
vi.mock('../../netlify/functions/utils/db.js', () => ({ sql: sqlMock }));

const requireAuthMock = vi.fn();
vi.mock('../../netlify/functions/utils/auth.js', () => ({ requireAuth: requireAuthMock }));

const setMock = vi.fn();
vi.mock('@netlify/blobs', () => ({ getStore: () => ({ set: setMock }) }));

const { default: handler } = await import('../../netlify/functions/api-uploads.mjs');

const OPERATOR = { id: 'op-1', role: 'operator' };
const OTHER_OPERATOR = { id: 'op-2', role: 'operator' };
const CLIENT = { id: 'client-1', role: 'client' };
const ADMIN = { id: 'admin-1', role: 'admin' };

let responses;
const normalize = (strings) => strings.join('?').replace(/\s+/g, ' ').trim();
sqlMock.mockImplementation((strings, ...values) => {
  const text = normalize(strings);
  for (const [pattern, result] of responses) {
    if (pattern.test(text)) return Promise.resolve(typeof result === 'function' ? result(values) : result);
  }
  return Promise.resolve([]);
});
const queries = () => sqlMock.mock.calls.map(([strings, ...values]) => ({ text: normalize(strings), values }));

const call = async (method, path, body) => {
  const res = await handler(
    new Request(`http://localhost/api/uploads${path}`, { method, ...(body === undefined ? {} : { body }) }),
  );
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
};
const formWith = (field, file) => {
  const form = new FormData();
  if (file) form.set(field, file);
  return form;
};
const pdf = (name = 'cert.pdf') => new File(['x'], name, { type: 'application/pdf' });

beforeEach(() => {
  sqlMock.mockClear();
  setMock.mockReset();
  requireAuthMock.mockReset();
  requireAuthMock.mockResolvedValue(OPERATOR);
  responses = [];
});

describe('routing', () => {
  it('answers OPTIONS with 204', async () => {
    expect((await call('OPTIONS', '/cert')).status).toBe(204);
  });

  it('returns 404 for unknown routes', async () => {
    expect((await call('POST', '/nope', formWith('cert', pdf()))).status).toBe(404);
  });
});

describe('POST /api/uploads/cert', () => {
  it('requires authentication', async () => {
    requireAuthMock.mockResolvedValue(null);
    expect((await call('POST', '/cert', formWith('cert', pdf()))).status).toBe(401);
  });

  it('rejects clients', async () => {
    requireAuthMock.mockResolvedValue(CLIENT);
    expect((await call('POST', '/cert', formWith('cert', pdf()))).status).toBe(403);
  });

  it('rejects a non-multipart body', async () => {
    const { status, body } = await call('POST', '/cert', 'plain text');
    expect(status).toBe(400);
    expect(body.error).toBe('Expected multipart/form-data');
  });

  it('rejects a missing cert field', async () => {
    const { status, body } = await call('POST', '/cert', formWith('other', pdf()));
    expect(status).toBe(400);
    expect(body.error).toBe('cert field must be a file');
  });

  it('rejects a disallowed file type', async () => {
    const file = new File(['x'], 'cert.txt', { type: 'text/plain' });
    const { status, body } = await call('POST', '/cert', formWith('cert', file));
    expect(status).toBe(400);
    expect(body.error).toContain('cert must be a PDF or image');
  });

  it('rejects files over 5 MB', async () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.pdf', { type: 'application/pdf' });
    const { status, body } = await call('POST', '/cert', formWith('cert', big));
    expect(status).toBe(400);
    expect(body.error).toContain('under 5MB');
  });

  it('returns 422 when there is no operator profile', async () => {
    const { status } = await call('POST', '/cert', formWith('cert', pdf()));
    expect(status).toBe(422);
    expect(setMock).not.toHaveBeenCalled();
  });

  it('stores the cert under the user id with a sanitised name and updates the profile', async () => {
    responses = [
      [/SELECT id FROM operator_profiles/, [{ id: 'profile-1' }]],
      [/UPDATE operator_profiles/, [{ id: 'profile-1' }]],
    ];
    const { status, body } = await call('POST', '/cert', formWith('cert', pdf('my cert!.pdf')));
    expect(status).toBe(200);
    expect(body.message).toContain('Certificate uploaded');
    expect(setMock).toHaveBeenCalledTimes(1);
    const [key, , options] = setMock.mock.calls[0];
    expect(key).toMatch(/^op-1\/\d+-my_cert_\.pdf$/);
    expect(options.metadata).toMatchObject({ userId: 'op-1', fileName: 'my cert!.pdf', mimeType: 'application/pdf' });
    expect(queries().some((q) => /UPDATE operator_profiles/.test(q.text))).toBe(true);
  });

  it('returns 422 when the UPDATE matches no row', async () => {
    responses = [[/SELECT id FROM operator_profiles/, [{ id: 'profile-1' }]]];
    const { status } = await call('POST', '/cert', formWith('cert', pdf()));
    expect(status).toBe(422);
  });
});

describe('POST /api/uploads/deliverable', () => {
  const booking = { id: 'booking-1', operator_id: OPERATOR.id };
  const video = () => new File(['x'], 'clip.mp4', { type: 'video/mp4' });

  beforeEach(() => {
    responses = [[/SELECT \* FROM bookings/, [booking]]];
  });

  it('rejects clients', async () => {
    requireAuthMock.mockResolvedValue(CLIENT);
    expect((await call('POST', '/deliverable?booking_id=booking-1', formWith('file', video()))).status).toBe(403);
  });

  it('requires booking_id', async () => {
    expect((await call('POST', '/deliverable', formWith('file', video()))).status).toBe(400);
  });

  it('returns 404 for an unknown booking', async () => {
    responses = [];
    expect((await call('POST', '/deliverable?booking_id=nope', formWith('file', video()))).status).toBe(404);
  });

  it('rejects an operator who does not own the booking', async () => {
    requireAuthMock.mockResolvedValue(OTHER_OPERATOR);
    expect((await call('POST', '/deliverable?booking_id=booking-1', formWith('file', video()))).status).toBe(403);
  });

  it('lets an admin upload for any booking', async () => {
    requireAuthMock.mockResolvedValue(ADMIN);
    responses.push([/INSERT INTO deliverables/, [{ id: 'd1' }]]);
    expect((await call('POST', '/deliverable?booking_id=booking-1', formWith('file', video()))).status).toBe(201);
  });

  it('rejects an unsupported type', async () => {
    const exe = new File(['x'], 'a.exe', { type: 'application/x-msdownload' });
    const { status, body } = await call('POST', '/deliverable?booking_id=booking-1', formWith('file', exe));
    expect(status).toBe(400);
    expect(body.error).toContain('Unsupported file type');
  });

  it.each([
    ['clip.mp4', 'video/mp4'],
    ['bundle.zip', 'application/zip'],
  ])('accepts %s and returns the inserted deliverable', async (name, type) => {
    responses.push([/INSERT INTO deliverables/, [{ id: 'd1', file_name: name }]]);
    const file = new File(['x'], name, { type });
    const { status, body } = await call('POST', '/deliverable?booking_id=booking-1', formWith('file', file));
    expect(status).toBe(201);
    expect(body).toEqual({ id: 'd1', file_name: name });
    expect(setMock).toHaveBeenCalledTimes(1);
    expect(setMock.mock.calls[0][0]).toMatch(new RegExp(`^booking-1/\\d+-${name.replace('.', '\\.')}$`));
  });
});
