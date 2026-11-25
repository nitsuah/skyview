import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

// Every HTML page the site serves (docs/ and promo/ are not deployed).
const SERVED_HTML = [
    ...readdirSync('.').filter((f) => f.endsWith('.html')),
    ...readdirSync('pages').filter((f) => f.endsWith('.html')).map((f) => `pages/${f}`),
    'platform/index.html',
];

/** Attribute name -> unquoted value ('' when the attribute has no value). */
function parseAttributes(attrs) {
    const out = new Map();
    for (const m of attrs.matchAll(/([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
        out.set(m[1].toLowerCase(), m[2] ?? m[3] ?? m[4] ?? '');
    }
    return out;
}

/** Opening <script> tags that would execute inline code (no src, not JSON data). */
function inlineScripts(html) {
    return [...html.matchAll(/<script\b([^>]*)>/gi)]
        .map((m) => m[1])
        .filter((attrs) => {
            const a = parseAttributes(attrs);
            const type = (a.get('type') ?? '').trim().toLowerCase();
            return !a.has('src') && type !== 'application/ld+json' && type !== 'application/json';
        });
}

/** Inline event-handler attributes such as onclick="..." inside tags. */
function inlineHandlers(html) {
    return [...html.matchAll(/<[a-z][^>]*\s(on[a-z]+)\s*=/gi)].map((m) => m[1]);
}

function netlifyCsp() {
    const toml = readFileSync(resolve('netlify.toml'), 'utf-8');
    const cspHeaders = [];
    let current = null;

    for (const line of toml.split('\n')) {
        const trimmed = line.trim();
        if (trimmed === '[[headers]]') {
            current = { for: '', csp: null };
            continue;
        }
        if (trimmed.startsWith('for =') && current) {
            current.for = trimmed.match(/for\s*=\s*"([^"]*)"/)[1];
            continue;
        }
        if (trimmed.startsWith('Content-Security-Policy') && current) {
            current.csp = trimmed.match(/Content-Security-Policy\s*=\s*"([^"]*)"/)[1];
            cspHeaders.push({ ...current });
            current = null;
            continue;
        }
    }

    return cspHeaders;
}

function scriptSrcContainsUnsafeInline(csp) {
    const match = csp.match(/script-src\s+([^;]+)/);
    if (!match) return false;
    return match[1].includes("'unsafe-inline'");
}

describe('CSP sanitization (#213)', () => {
    describe('netlify.toml script-src', () => {
        it('removes unsafe-inline from script-src in all CSP blocks', () => {
            const headers = netlifyCsp();
            expect(headers.length).toBeGreaterThan(0);

            for (const header of headers) {
                if (!header.csp) continue;

                expect(scriptSrcContainsUnsafeInline(header.csp)).toBe(false);
            }
        });

        it('keeps Plausible and Stripe script sources', () => {
            const headers = netlifyCsp();
            const globalCsp = headers.find(h => h.for === '/*')?.csp;
            const appCsp = headers.find(h => h.for === '/app/*')?.csp;

            expect(globalCsp).toContain('https://plausible.io');
            expect(appCsp).toContain('https://js.stripe.com');
        });
    });

    it('scans the served pages', () => {
        expect(SERVED_HTML).toEqual(expect.arrayContaining([
            'index.html', 'pages/client-portal.html', 'pages/client-gallery.html',
        ]));
    });

    describe('served HTML has no inline script or handlers', () => {
        SERVED_HTML.forEach((file) => {
            it(`${file}`, () => {
                const html = readFileSync(resolve(file), 'utf-8');
                expect(inlineScripts(html)).toEqual([]);
                expect(inlineHandlers(html)).toEqual([]);
            });
        });
    });

    it('detects what it is meant to catch', () => {
        expect(inlineScripts('<script>alert(1)</script>')).toHaveLength(1);
        expect(inlineScripts('<script type="module">x()</script>')).toHaveLength(1);
        expect(inlineScripts('<script src="/a.js"></script><script type="application/ld+json">{}</script>')).toEqual([]);
        // data-src / data-type are not src / type: these still run inline
        expect(inlineScripts('<script data-src="/a.js">alert(1)</script>')).toHaveLength(1);
        expect(inlineScripts('<script data-type="application/json">x()</script>')).toHaveLength(1);
        expect(inlineScripts('<script SRC=/a.js referrerpolicy="no-referrer"></script>')).toEqual([]);
        expect(inlineHandlers('<button onclick="x()">')).toEqual(['onclick']);
    });
});
