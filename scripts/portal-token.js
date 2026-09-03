/**
 * Client Portal Token Generator
 *
 * Usage (Node.js):
 *   PORTAL_SALT=<secret> node scripts/portal-token.js --client wedding-johnson --days 30
 *
 * Format: base64url(clientId).expiry_unix.HMAC-SHA256(clientB64.expiry, PORTAL_SALT)
 * The token is verified server-side by netlify/functions/api-portal.mjs, which
 * checks the signature and expiry before granting portal access — see
 * netlify/functions/utils/portal.js for the shared implementation.
 *
 * PORTAL_SALT has no fallback. Generating a token without it set is refused,
 * matching the fail-closed behavior of the verification endpoint.
 */

import { generatePortalToken } from '../netlify/functions/utils/portal.js';

function parseArgs(argv) {
    const args = {};
    for (let i = 2; i < argv.length; i++) {
        if (argv[i].startsWith('--')) {
            const key = argv[i].slice(2);
            args[key] = argv[i + 1] || true;
            i++;
        }
    }
    return args;
}

const salt = process.env.PORTAL_SALT;
if (!salt) {
    console.error('ERROR: PORTAL_SALT environment variable is required — there is no dev fallback.');
    console.error('Set it to a strong, random secret (the same value configured in Netlify) before running:');
    console.error('  PORTAL_SALT=$(openssl rand -hex 32) node scripts/portal-token.js --client <id> --days 30');
    process.exit(1);
}

const args = parseArgs(process.argv);
const clientId = args.client || 'demo-client';
const days = Number.parseInt(args.days, 10) || 30;

const token = generatePortalToken(clientId, days, salt);
const expiryDate = new Date((Math.floor(Date.now() / 1000) + days * 86400) * 1000);

console.log('');
console.log('=== Skyview Client Portal Token ===');
console.log(`Client:  ${clientId}`);
console.log(`Expires: ${expiryDate.toDateString()} (${days} days)`);
console.log(`Token:   ${token}`);
console.log('');
console.log('Portal URL:');
console.log(`  https://skyviewdynamics.com/pages/client-portal.html?code=${encodeURIComponent(token)}`);
console.log('');
console.log('NOTE: PORTAL_SALT must match the value set in the Netlify site environment');
console.log('      variables — otherwise this token will fail server-side verification.');
console.log('');
