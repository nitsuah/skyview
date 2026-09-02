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

    const expiryUnix = Math.floor(Date.now() / 1000) + Math.max(1, expiryDays || 30) * 86400;
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
