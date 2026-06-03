/**
 * Client Portal Token Generator
 *
 * Usage (Node.js):
 *   node scripts/portal-token.js --client wedding-johnson --days 30
 *
 * Format: base64(clientId).expiry_unix.checksum
 * The portal validates that the expiry has not passed before granting access.
 * For a real backend, replace the checksum with an HMAC-SHA256 using a server secret.
 */

import { createHash } from 'crypto';

const INTERNAL_SALT = process.env.PORTAL_SALT || 'skyview-portal-dev-salt-change-in-prod';

function generateToken(clientId, expiryDays = 30) {
    const expiryUnix = Math.floor(Date.now() / 1000) + expiryDays * 86400;
    const clientB64 = Buffer.from(clientId).toString('base64url');
    const checksum = createHash('sha256')
        .update(`${clientB64}:${expiryUnix}:${INTERNAL_SALT}`)
        .digest('hex')
        .slice(0, 12);

    return `${clientB64}.${expiryUnix}.${checksum}`;
}

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

const args = parseArgs(process.argv);
const clientId = args.client || 'demo-client';
const days = parseInt(args.days, 10) || 30;

const token = generateToken(clientId, days);
const expiryDate = new Date((Math.floor(Date.now() / 1000) + days * 86400) * 1000);

console.log('');
console.log('=== Skyview Client Portal Token ===');
console.log(`Client:  ${clientId}`);
console.log(`Expires: ${expiryDate.toDateString()} (${days} days)`);
console.log(`Token:   ${token}`);
console.log('');
console.log('Portal URL:');
console.log(`  https://skyviewdynamics.com/client-portal.html?code=${encodeURIComponent(token)}`);
console.log('');
console.log('NOTE: Set PORTAL_SALT env var to a secret value before generating production tokens.');
console.log('');
