import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { generatePortalToken, verifyPortalToken } from '../../netlify/functions/utils/portal.js';

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
