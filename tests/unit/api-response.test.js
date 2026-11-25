import { describe, it, expect } from 'vitest';
import {
  CORS_HEADERS,
  json,
  error,
  cors,
  redirect,
  unauthorized,
  forbidden,
  notFound,
  methodNotAllowed,
} from '../../netlify/functions/utils/response.js';

describe('api-response utils', () => {
  describe('CORS_HEADERS', () => {
    it('has Cache-Control no-store', () => {
      expect(CORS_HEADERS['Cache-Control']).toBe('no-store');
    });

    it('has Content-Type application/json', () => {
      expect(CORS_HEADERS['Content-Type']).toBe('application/json');
    });

    it('has allowed methods header listing GET, POST, PUT, DELETE, OPTIONS', () => {
      expect(CORS_HEADERS['Access-Control-Allow-Methods']).toBe('GET, POST, PUT, DELETE, OPTIONS');
    });
  });

  describe('json', () => {
    it('returns 200 with body and CORS headers', async () => {
      const res = json({ a: 1 });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ a: 1 });
      expect(res.headers.get('Cache-Control')).toBe('no-store');
      expect(res.headers.get('Content-Type')).toBe('application/json');
    });

    it('keeps custom status 201', async () => {
      const res = json({}, 201);
      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({});
    });
  });

  describe('error', () => {
    it('returns 400 with error message', async () => {
      const res = error('bad');
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'bad' });
    });

    it('keeps custom status 418', async () => {
      const res = error('x', 418);
      expect(res.status).toBe(418);
      expect(await res.json()).toEqual({ error: 'x' });
    });
  });

  describe('cors', () => {
    it('returns 204 with null body', async () => {
      const res = cors();
      expect(res.status).toBe(204);
      expect(await res.text()).toBe('');
    });
  });

  describe('redirect', () => {
    it('returns 302 with Location header', () => {
      const res = redirect('/x');
      expect(res.status).toBe(302);
      expect(res.headers.get('Location')).toBe('/x');
    });

    it('keeps custom status 301', () => {
      const res = redirect('/x', 301);
      expect(res.status).toBe(301);
      expect(res.headers.get('Location')).toBe('/x');
    });
  });

  describe('unauthorized', () => {
    it('returns 401 with Unauthorized message', async () => {
      const res = unauthorized();
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Unauthorized' });
    });
  });

  describe('forbidden', () => {
    it('returns 403 with Forbidden message', async () => {
      const res = forbidden();
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'Forbidden' });
    });
  });

  describe('notFound', () => {
    it('returns 404 with Not found message', async () => {
      const res = notFound();
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'Not found' });
    });
  });

  describe('methodNotAllowed', () => {
    it('returns 405 with Method not allowed message', async () => {
      const res = methodNotAllowed();
      expect(res.status).toBe(405);
      expect(await res.json()).toEqual({ error: 'Method not allowed' });
    });
  });
});