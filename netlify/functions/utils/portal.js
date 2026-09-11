/**
 * Client portal access token: generation + verification.
 *
 * Token format: `<clientId base64url>.<expiry unix seconds>.<HMAC-SHA256 hex>`
 *
 * The signature is an HMAC-SHA256 over `${clientB64}.${expiryUnix}` keyed by
 * PORTAL_SALT — not a truncated SHA-256 checksum. Verification always uses a
 * timing-safe comparison and fails closed (denies access) whenever the salt
 * is not configured, so a misconfigured deploy can never accept every code.
 *
 * This module is shared by the Netlify Function that verifies codes
 * server-side (netlify/functions/api-portal.mjs) and the CLI that generates
 * them for clients (scripts/portal-token.js) — one implementation, so the
 * generator and verifier can never drift out of sync.
 */

import { createHmac, timingSafeEqual } from 'crypto';

const SESSION_TTL_SECONDS = 60 * 60; // 1 hour
const DOWNLOAD_TTL_SECONDS = 5 * 60; // 5 minutes

function sign(clientB64, expiryUnix, salt) {
    return createHmac('sha256', salt)
        .update(`${clientB64}.${expiryUnix}`)
        .digest('hex');
}

/**
 * @param {string} clientId
 * @param {number} expiryDays
 * @param {string} salt - PORTAL_SALT; required, no fallback.
 * @returns {string} token
 */
export function generatePortalToken(clientId, expiryDays, salt) {
    if (!salt) {
        throw new Error('PORTAL_SALT is required to generate a portal token — no fallback is permitted.');
    }
    if (!clientId) {
        throw new Error('clientId is required to generate a portal token.');
    }

    const durationDays = Number.isFinite(expiryDays) ? Math.max(1, expiryDays || 30) : 30;
    const expiryUnix = Math.floor(Date.now() / 1000 + durationDays * 86400);
    const clientB64 = Buffer.from(clientId).toString('base64url');
    const signature = sign(clientB64, expiryUnix, salt);

    return `${clientB64}.${expiryUnix}.${signature}`;
}

/**
 * @param {string} code
 * @param {string|undefined} salt - PORTAL_SALT from the runtime environment.
 * @returns {{ valid: boolean, reason?: string, clientId?: string, expiresAt?: number }}
 */
export function verifyPortalToken(code, salt) {
    // Fail closed: without a configured secret, nothing can be trusted.
    if (!salt) {
        return { valid: false, reason: 'not_configured' };
    }

    if (typeof code !== 'string' || code.length === 0 || code.length > 512) {
        return { valid: false, reason: 'malformed' };
    }

    const parts = code.split('.');
    if (parts.length !== 3) {
        return { valid: false, reason: 'malformed' };
    }

    const [clientB64, expiryStr, signature] = parts;
    const expiryUnix = Number.parseInt(expiryStr, 10);
    if (!Number.isFinite(expiryUnix) || !/^[A-Za-z0-9_-]+$/.test(clientB64) || !/^[a-f0-9]+$/i.test(signature)) {
        return { valid: false, reason: 'malformed' };
    }

    const expectedSignature = sign(clientB64, expiryUnix, salt);
    const provided = Buffer.from(signature, 'utf8');
    const expected = Buffer.from(expectedSignature, 'utf8');

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
        return { valid: false, reason: 'invalid_signature' };
    }

    if (Math.floor(Date.now() / 1000) > expiryUnix) {
        return { valid: false, reason: 'expired' };
    }

    let clientId;
    try {
        clientId = Buffer.from(clientB64, 'base64url').toString('utf8');
    } catch {
        return { valid: false, reason: 'malformed' };
    }

    return { valid: true, clientId, expiresAt: expiryUnix };
}

/**
 * Client-portal session tokens.
 *
 * Exchanged for the original access code immediately after login (CWE-598
 * fix — PR #121 review) so the long-lived (30-day) access code never has to
 * be reused on subsequent gallery-to-server calls, and never has to travel
 * as a URL query param after the initial login submission. Session tokens
 * are short-lived (1 hour) and domain-separated from access codes: the
 * `sess` literal is embedded both in the token layout (4 parts instead of
 * 3) and in the signed message, so a session token can never be replayed
 * at the access-code endpoint, or vice versa, even though both are
 * HMAC-SHA256 over the same PORTAL_SALT.
 *
 * Format: `sess.<clientId base64url>.<expiry unix seconds>.<HMAC-SHA256 hex>`
 */

function signSession(clientB64, expiryUnix, salt) {
    return createHmac('sha256', salt)
        .update(`sess.${clientB64}.${expiryUnix}`)
        .digest('hex');
}

/**
 * @param {string} clientId
 * @param {string} salt - PORTAL_SALT; required, no fallback.
 * @param {number} [ttlSeconds]
 * @returns {{ token: string, expiresAt: number }}
 */
export function generateSessionToken(clientId, salt, ttlSeconds = SESSION_TTL_SECONDS) {
    if (!salt) {
        throw new Error('PORTAL_SALT is required to generate a session token — no fallback is permitted.');
    }
    if (!clientId) {
        throw new Error('clientId is required to generate a session token.');
    }

    const expiryUnix = Math.floor(Date.now() / 1000 + ttlSeconds);
    const clientB64 = Buffer.from(clientId).toString('base64url');
    const signature = signSession(clientB64, expiryUnix, salt);

    return { token: `sess.${clientB64}.${expiryUnix}.${signature}`, expiresAt: expiryUnix };
}

/**
 * @param {string} token
 * @param {string|undefined} salt - PORTAL_SALT from the runtime environment.
 * @returns {{ valid: boolean, reason?: string, clientId?: string, expiresAt?: number }}
 */
export function verifySessionToken(token, salt) {
    if (!salt) {
        return { valid: false, reason: 'not_configured' };
    }

    if (typeof token !== 'string' || token.length === 0 || token.length > 512) {
        return { valid: false, reason: 'malformed' };
    }

    const parts = token.split('.');
    if (parts.length !== 4 || parts[0] !== 'sess') {
        return { valid: false, reason: 'malformed' };
    }

    const [, clientB64, expiryStr, signature] = parts;
    const expiryUnix = Number.parseInt(expiryStr, 10);
    if (!Number.isFinite(expiryUnix) || !/^[A-Za-z0-9_-]+$/.test(clientB64) || !/^[a-f0-9]+$/i.test(signature)) {
        return { valid: false, reason: 'malformed' };
    }

    const expectedSignature = signSession(clientB64, expiryUnix, salt);
    const provided = Buffer.from(signature, 'utf8');
    const expected = Buffer.from(expectedSignature, 'utf8');

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
        return { valid: false, reason: 'invalid_signature' };
    }

    if (Math.floor(Date.now() / 1000) > expiryUnix) {
        return { valid: false, reason: 'expired' };
    }

    let clientId;
    try {
        clientId = Buffer.from(clientB64, 'base64url').toString('utf8');
    } catch {
        return { valid: false, reason: 'malformed' };
    }

    return { valid: true, clientId, expiresAt: expiryUnix };
}

/**
 * Time-bound signed download links for individual deliverables.
 *
 * Scoped to one clientId + one fileId with a short TTL (5 minutes by
 * default) — the same presigned-URL pattern as S3/Cloudinary. Unlike the
 * access code or session token, this one is expected to travel in a URL
 * query string: it is single-file-scoped, short-lived, and useless for any
 * other file or client once expired, so a logged or leaked link has
 * minimal blast radius.
 *
 * Format: `dl.<clientId base64url>.<fileId base64url>.<expiry unix seconds>.<HMAC-SHA256 hex>`
 */

function signDownload(clientB64, fileB64, expiryUnix, salt) {
    return createHmac('sha256', salt)
        .update(`dl.${clientB64}.${fileB64}.${expiryUnix}`)
        .digest('hex');
}

/**
 * @param {string} clientId
 * @param {string} fileId
 * @param {string} salt - PORTAL_SALT; required, no fallback.
 * @param {number} [ttlSeconds]
 * @returns {{ token: string, expiresAt: number }}
 */
export function generateSignedDownloadToken(clientId, fileId, salt, ttlSeconds = DOWNLOAD_TTL_SECONDS) {
    if (!salt) {
        throw new Error('PORTAL_SALT is required to generate a download token — no fallback is permitted.');
    }
    if (!clientId || !fileId) {
        throw new Error('clientId and fileId are required to generate a download token.');
    }

    const expiryUnix = Math.floor(Date.now() / 1000 + ttlSeconds);
    const clientB64 = Buffer.from(clientId).toString('base64url');
    const fileB64 = Buffer.from(fileId).toString('base64url');
    const signature = signDownload(clientB64, fileB64, expiryUnix, salt);

    return { token: `dl.${clientB64}.${fileB64}.${expiryUnix}.${signature}`, expiresAt: expiryUnix };
}

/**
 * @param {string} token
 * @param {string|undefined} salt - PORTAL_SALT from the runtime environment.
 * @returns {{ valid: boolean, reason?: string, clientId?: string, fileId?: string, expiresAt?: number }}
 */
export function verifySignedDownloadToken(token, salt) {
    if (!salt) {
        return { valid: false, reason: 'not_configured' };
    }

    if (typeof token !== 'string' || token.length === 0 || token.length > 1024) {
        return { valid: false, reason: 'malformed' };
    }

    const parts = token.split('.');
    if (parts.length !== 5 || parts[0] !== 'dl') {
        return { valid: false, reason: 'malformed' };
    }

    const [, clientB64, fileB64, expiryStr, signature] = parts;
    const expiryUnix = Number.parseInt(expiryStr, 10);
    if (
        !Number.isFinite(expiryUnix) ||
        !/^[A-Za-z0-9_-]+$/.test(clientB64) ||
        !/^[A-Za-z0-9_-]+$/.test(fileB64) ||
        !/^[a-f0-9]+$/i.test(signature)
    ) {
        return { valid: false, reason: 'malformed' };
    }

    const expectedSignature = signDownload(clientB64, fileB64, expiryUnix, salt);
    const provided = Buffer.from(signature, 'utf8');
    const expected = Buffer.from(expectedSignature, 'utf8');

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
        return { valid: false, reason: 'invalid_signature' };
    }

    if (Math.floor(Date.now() / 1000) > expiryUnix) {
        return { valid: false, reason: 'expired' };
    }

    let clientId, fileId;
    try {
        clientId = Buffer.from(clientB64, 'base64url').toString('utf8');
        fileId = Buffer.from(fileB64, 'base64url').toString('utf8');
    } catch {
        return { valid: false, reason: 'malformed' };
    }

    return { valid: true, clientId, fileId, expiresAt: expiryUnix };
}

/**
 * Access logging for the file-delivery flow.
 *
 * Deliberately a structured console.log line (captured by Netlify's
 * function log viewer) rather than a new database table: the portal is
 * otherwise fully stateless with no DB dependency, and per-request logging
 * is enough to answer "did this client access their files, and when"
 * without adding new infrastructure for a still-mocked file backend.
 *
 * @param {string} action
 * @param {Record<string, unknown>} [details]
 */
export function logPortalAccess(action, details = {}) {
    console.log(JSON.stringify({
        scope: 'client-portal',
        action,
        timestamp: new Date().toISOString(),
        ...details,
    }));
}
