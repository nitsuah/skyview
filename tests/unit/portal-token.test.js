import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import {
    generatePortalToken,
    verifyPortalToken,
    generateSessionToken,
    verifySessionToken,
    generateSignedDownloadToken,
    verifySignedDownloadToken,
} from '../../netlify/functions/utils/portal.js';

const SALT = 'test-salt-do-not-use-in-prod';

describe('portal token (HMAC-SHA256, fail-closed)', () => {
    describe('generatePortalToken', () => {
        it('throws when no salt is provided (no dev fallback)', () => {
            expect(() => generatePortalToken('client-1', 30, undefined)).toThrow(/PORTAL_SALT/);
        });

        it('throws when no clientId is provided', () => {
            expect(() => generatePortalToken('', 30, SALT)).toThrow(/clientId/);
        });

        it('produces a three-part clientB64.expiry.signature token', () => {
            const token = generatePortalToken('wedding-johnson', 30, SALT);
            const parts = token.split('.');
            expect(parts).toHaveLength(3);
            expect(Number.isFinite(Number.parseInt(parts[1], 10))).toBe(true);
            // HMAC-SHA256 hex digest is 64 chars — not a truncated checksum.
            expect(parts[2]).toHaveLength(64);
        });
    });

    describe('verifyPortalToken', () => {
        it('fails closed when the salt is missing, even for an otherwise valid token', () => {
            const token = generatePortalToken('client-1', 30, SALT);
            const result = verifyPortalToken(token, undefined);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('not_configured');
        });

        it('accepts a freshly generated token and recovers the client id', () => {
            const token = generatePortalToken('wedding-johnson', 30, SALT);
            const result = verifyPortalToken(token, SALT);
            expect(result.valid).toBe(true);
            expect(result.clientId).toBe('wedding-johnson');
            expect(result.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
        });

        it('rejects a token signed with a different salt', () => {
            const token = generatePortalToken('client-1', 30, SALT);
            const result = verifyPortalToken(token, 'a-different-salt');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('invalid_signature');
        });

        it('rejects a tampered signature', () => {
            const token = generatePortalToken('client-1', 30, SALT);
            const [clientB64, expiry] = token.split('.');
            const tampered = `${clientB64}.${expiry}.${'0'.repeat(64)}`;
            const result = verifyPortalToken(tampered, SALT);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('invalid_signature');
        });

        it('rejects a tampered clientId even if the original signature is reused', () => {
            const token = generatePortalToken('client-1', 30, SALT);
            const [, expiry, signature] = token.split('.');
            const forgedClient = Buffer.from('a-different-client').toString('base64url');
            const forged = `${forgedClient}.${expiry}.${signature}`;
            const result = verifyPortalToken(forged, SALT);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('invalid_signature');
        });

        it('rejects an expired token', () => {
            const pastExpiry = Math.floor(Date.now() / 1000) - 3600;
            const clientB64 = Buffer.from('client-1').toString('base64url');
            const signature = createHmac('sha256', SALT).update(`${clientB64}.${pastExpiry}`).digest('hex');
            const expiredToken = `${clientB64}.${pastExpiry}.${signature}`;

            const result = verifyPortalToken(expiredToken, SALT);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('expired');
        });

        it('rejects malformed input', () => {
            expect(verifyPortalToken('', SALT).reason).toBe('malformed');
            expect(verifyPortalToken('not-a-token', SALT).reason).toBe('malformed');
            expect(verifyPortalToken('a.b', SALT).reason).toBe('malformed');
            expect(verifyPortalToken(null, SALT).reason).toBe('malformed');
            expect(verifyPortalToken('a'.repeat(600), SALT).reason).toBe('malformed');
        });
    });
});

describe('session token (CWE-598 fix: exchanged for the access code at login)', () => {
    describe('generateSessionToken', () => {
        it('throws when no salt is provided', () => {
            expect(() => generateSessionToken('client-1', undefined)).toThrow(/PORTAL_SALT/);
        });

        it('throws when no clientId is provided', () => {
            expect(() => generateSessionToken('', SALT)).toThrow(/clientId/);
        });

        it('produces a sess.<clientB64>.<expiry>.<signature> token', () => {
            const { token, expiresAt } = generateSessionToken('wedding-johnson', SALT);
            const parts = token.split('.');
            expect(parts).toHaveLength(4);
            expect(parts[0]).toBe('sess');
            expect(Number.isFinite(Number.parseInt(parts[2], 10))).toBe(true);
            expect(parts[3]).toHaveLength(64);
            expect(expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
        });

        it('defaults to a short (1 hour) TTL, much shorter than an access code', () => {
            const { expiresAt } = generateSessionToken('client-1', SALT);
            const secondsUntilExpiry = expiresAt - Math.floor(Date.now() / 1000);
            expect(secondsUntilExpiry).toBeLessThanOrEqual(3600);
            expect(secondsUntilExpiry).toBeGreaterThan(3500);
        });
    });

    describe('verifySessionToken', () => {
        it('fails closed when the salt is missing', () => {
            const { token } = generateSessionToken('client-1', SALT);
            expect(verifySessionToken(token, undefined)).toEqual({ valid: false, reason: 'not_configured' });
        });

        it('accepts a freshly generated session token and recovers the client id', () => {
            const { token } = generateSessionToken('wedding-johnson', SALT);
            const result = verifySessionToken(token, SALT);
            expect(result.valid).toBe(true);
            expect(result.clientId).toBe('wedding-johnson');
        });

        it('rejects a token signed with a different salt', () => {
            const { token } = generateSessionToken('client-1', SALT);
            const result = verifySessionToken(token, 'a-different-salt');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('invalid_signature');
        });

        it('rejects an expired session token', () => {
            const { token } = generateSessionToken('client-1', SALT, -10);
            const result = verifySessionToken(token, SALT);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('expired');
        });

        it('rejects malformed input', () => {
            expect(verifySessionToken('', SALT).reason).toBe('malformed');
            expect(verifySessionToken('not-a-session-token', SALT).reason).toBe('malformed');
            expect(verifySessionToken(null, SALT).reason).toBe('malformed');
        });

        it('never validates as an access code (domain separation)', () => {
            const { token } = generateSessionToken('client-1', SALT);
            // A session token has 4 dot-separated parts; verifyPortalToken
            // only ever accepts exactly 3, so it is rejected as malformed
            // rather than accidentally accepted.
            expect(verifyPortalToken(token, SALT).valid).toBe(false);
        });

        it('an access code never validates as a session token (domain separation)', () => {
            const accessToken = generatePortalToken('client-1', 30, SALT);
            expect(verifySessionToken(accessToken, SALT).valid).toBe(false);
        });
    });
});

describe('signed download token (time-bound, single-file-scoped)', () => {
    describe('generateSignedDownloadToken', () => {
        it('throws when no salt is provided', () => {
            expect(() => generateSignedDownloadToken('client-1', 'file-1', undefined)).toThrow(/PORTAL_SALT/);
        });

        it('throws when clientId or fileId is missing', () => {
            expect(() => generateSignedDownloadToken('', 'file-1', SALT)).toThrow(/clientId/);
            expect(() => generateSignedDownloadToken('client-1', '', SALT)).toThrow(/clientId/);
        });

        it('produces a dl.<clientB64>.<fileB64>.<expiry>.<signature> token', () => {
            const { token } = generateSignedDownloadToken('client-1', 'aerial-waterfront', SALT);
            const parts = token.split('.');
            expect(parts).toHaveLength(5);
            expect(parts[0]).toBe('dl');
            expect(parts[4]).toHaveLength(64);
        });

        it('defaults to a short (5 minute) TTL', () => {
            const { expiresAt } = generateSignedDownloadToken('client-1', 'file-1', SALT);
            const secondsUntilExpiry = expiresAt - Math.floor(Date.now() / 1000);
            expect(secondsUntilExpiry).toBeLessThanOrEqual(300);
            expect(secondsUntilExpiry).toBeGreaterThan(250);
        });
    });

    describe('verifySignedDownloadToken', () => {
        it('fails closed when the salt is missing', () => {
            const { token } = generateSignedDownloadToken('client-1', 'file-1', SALT);
            expect(verifySignedDownloadToken(token, undefined)).toEqual({ valid: false, reason: 'not_configured' });
        });

        it('accepts a freshly generated token and recovers client id + file id', () => {
            const { token } = generateSignedDownloadToken('wedding-johnson', 'aerial-waterfront', SALT);
            const result = verifySignedDownloadToken(token, SALT);
            expect(result.valid).toBe(true);
            expect(result.clientId).toBe('wedding-johnson');
            expect(result.fileId).toBe('aerial-waterfront');
        });

        it('rejects an expired download link', () => {
            const { token } = generateSignedDownloadToken('client-1', 'file-1', SALT, -10);
            const result = verifySignedDownloadToken(token, SALT);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('expired');
        });

        it('rejects a token forged for a different file', () => {
            const { token } = generateSignedDownloadToken('client-1', 'file-1', SALT);
            const [prefix, clientB64, , expiry, signature] = token.split('.');
            const forgedFileB64 = Buffer.from('file-2').toString('base64url');
            const forged = `${prefix}.${clientB64}.${forgedFileB64}.${expiry}.${signature}`;
            const result = verifySignedDownloadToken(forged, SALT);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('invalid_signature');
        });

        it('rejects malformed input', () => {
            expect(verifySignedDownloadToken('', SALT).reason).toBe('malformed');
            expect(verifySignedDownloadToken('not-a-download-token', SALT).reason).toBe('malformed');
            expect(verifySignedDownloadToken(null, SALT).reason).toBe('malformed');
        });
    });
});
