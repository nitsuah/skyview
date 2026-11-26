import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createContext, runInContext } from 'node:vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Check if a contact object contains placeholder values
 * @param {Object} contact - The contact object from SKYVIEW_CONFIG
 * @returns {string[]} Array of field names that are still placeholders
 */
export function findPlaceholders(contact) {
    const placeholders = [];

    // phone or phoneE164 containing 555 followed by 123 (test digits only)
    if (contact.phone) {
        const digits = contact.phone.replace(/\D/g, '');
        if (digits.includes('555123')) {
            placeholders.push('phone');
        }
    }
    if (contact.phoneE164) {
        const digits = contact.phoneE164.replace(/\D/g, '');
        if (digits.includes('555123')) {
            placeholders.push('phoneE164');
        }
    }

    // address.locality === 'Your City'
    if (contact.address?.locality === 'Your City') {
        placeholders.push('address.locality');
    }

    // address.region === 'State'
    if (contact.address?.region === 'State') {
        placeholders.push('address.region');
    }

    // geo.latitude or geo.longitude equal to '0.0'
    if (contact.geo?.latitude === '0.0') {
        placeholders.push('geo.latitude');
    }
    if (contact.geo?.longitude === '0.0') {
        placeholders.push('geo.longitude');
    }

    // social.<name> whose URL has no path (e.g., https://facebook.com)
    if (contact.social) {
        for (const [name, url] of Object.entries(contact.social)) {
            if (url) {
                try {
                    const parsed = new URL(url);
                    // Check if path is empty or just '/'
                    if (!parsed.pathname || parsed.pathname === '/') {
                        placeholders.push(`social.${name}`);
                    }
                } catch {
                    // Invalid URL, treat as placeholder
                    placeholders.push(`social.${name}`);
                }
            }
        }
    }

    // email cannot be judged by a script: leave it out

    return placeholders;
}

/**
 * Load contact object from config.js text by executing it in a vm context
 * @param {string} source - The text content of config.js
 * @returns {Object} The contact object from window.SKYVIEW_CONFIG.contact
 */
export function loadContact(source) {
    const context = {
        window: {},
        console: console,
        document: {
            querySelector: () => null,
            querySelectorAll: () => [],
            addEventListener: () => {},
            createElement: () => ({ setAttribute: () => {}, appendChild: () => {} }),
            head: { appendChild: () => {} },
            body: { innerHTML: '' },
            title: '',
        },
        location: { href: 'http://localhost' },
    };

    // Run the config.js in the context
    runInContext(source, createContext(context));

    // Return the contact object
    return context.window.SKYVIEW_CONFIG?.contact || {};
}

// When run directly, read config.js and check for placeholders
if (import.meta.url === `file://${process.argv[1]}`) {
    const configPath = join(__dirname, '..', 'config.js');
    const source = readFileSync(configPath, 'utf-8');
    const contact = loadContact(source);
    const placeholders = findPlaceholders(contact);

    if (placeholders.length > 0) {
        for (const p of placeholders) {
            console.log(p);
        }
        process.exit(1);
    } else {
        process.exit(0);
    }
}