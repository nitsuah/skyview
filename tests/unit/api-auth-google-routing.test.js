import { describe, it, expect, beforeAll } from 'vitest';

// Regression coverage for the routing bug fixed in this PR: api-auth.mjs and
// api-auth-google.mjs used to be two separate Netlify functions claiming
// overlapping paths ('/api/auth/*' and '/api/auth/google*'). Netlify routed
// '/api/auth/google' into api-auth.mjs, whose router had no '/google' case,
// so it fell through to a 404 — even though the endpoint was "configured".
// tests/auth.spec.ts only asserts the frontend <a href>; it never actually
// invokes the Netlify handler, so a routing regression like this could slip
// back in unnoticed. This test imports the real handler and calls it
// directly, so a 404 here means the routing conflict is back.

let handleAuthRequest;

beforeAll(async () => {
  // utils/db.js throws at import time if this is unset; googleRedirect never
  // touches sql, so a dummy value is fine — no real DB connection is made.
  process.env.DATABASE_URL ??= 'postgres://user:pass@localhost:5432/db';
  ({ default: handleAuthRequest } = await import('../../netlify/functions/api-auth.mjs'));
});

describe('api-auth.mjs owns /api/auth/google (no competing function)', () => {
  it('GET /api/auth/google is NOT a 404 when Google OAuth is unconfigured', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    const res = await handleAuthRequest(new Request('http://localhost/api/auth/google'));
    expect(res.status).toBe(503);
    expect(res.status).not.toBe(404);
  });

  it('GET /api/auth/google redirects to Google when configured', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    try {
      const res = await handleAuthRequest(new Request('http://localhost/api/auth/google'));
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toContain('accounts.google.com');
    } finally {
      delete process.env.GOOGLE_CLIENT_ID;
    }
  });

  it('an actually-unknown auth route still 404s', async () => {
    const res = await handleAuthRequest(new Request('http://localhost/api/auth/not-a-real-route'));
    expect(res.status).toBe(404);
  });
});
