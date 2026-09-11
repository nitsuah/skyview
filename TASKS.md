
# Tasks

**Last Updated:** 2026-09-02

> **Delivery split:** public FE covers the marketing site and funnel. `/admin` is a separate CMS surface. Secure client portal/download auth is a separate backend workstream.

## Done (2026-09 cycle)

- [x] Server-side client-portal token validation — HMAC-SHA256, mandatory `PORTAL_SALT`, fail-closed. See `netlify/functions/api-portal.mjs`, `netlify/functions/utils/portal.js`. Was the top half of "Build secure client delivery backend" below; the remaining half (signed file delivery for `client-gallery.html`) stays open as its own P2 item.
- [x] Drone cursor hover offset (up-and-right of pointer) + transparent spotlight/laser beam from drone to cursor — `scripts/drone-cursor.js`, `styles/style.css`.
- [x] Marketplace platform SPA now built and served by the Docker preview (`Dockerfile`, `config/nginx.conf`) — previously only the Netlify build produced `/app`.
- [x] Identity data config plumbing — `config.js` `contact.address`, `contact.geo`, and `contact.social.facebook` added and wired into the schema.org JSON-LD via `updateStructuredData()`, so populating real values is a single-place edit. See P1 item below for what's still needed from the client.
- [x] Fixed `config/docker-compose.yml` relative-path bug that broke the documented `docker compose -f config/docker-compose.yml run --rm unit` / `... up --build web` commands when run from the repo root (relative paths were resolving against `config/`, not the repo root).
- [x] Fixed Vitest 5 regression (dependabot PR #127, `@vitest/coverage-v8` 4→5) that broke 4 test files: `window.pageYOffset`/`window.scrollY` became getter-only in Vitest 5's jsdom/happy-dom environment, so direct assignment (`window.pageYOffset = X`) silently no-oped instead of throwing, making scroll-dependent assertions fail. Switched to `vi.stubGlobal('pageYOffset', X)` (auto-restored, works regardless of whether the property is a getter) across `tests/unit/{integration,smooth-scroll,ui}.test.js`. Also fixed a related ordering bug in `performance-monitor.test.js`: `delete global.performance` before the dynamic `import()` broke Vitest's own module-transform instrumentation (which calls `performance.now()` internally); reordered to import first, then `vi.stubGlobal('performance', undefined)` only around the function call under test. All 103 tests passing.

## In Progress

- [ ] Complete the launch checklist with verified production identity data.
  - Priority: P1
  - Blocker: config plumbing is done (see Done above) — this is now purely a data-entry task blocked on the business owner supplying real values. Specifically still needed: **real business phone number**, **real business email** (confirm if `contact@skyviewdynamics.com` is real or a placeholder), **service-area city/region** (or full street address) for `contact.address` in `config.js`, **approximate service-area GPS coordinates** for `contact.geo`, and **real social profile URLs** for `contact.social` (facebook/twitter/instagram/youtube — currently generic homepage URLs, not the business's actual profiles).
  - Acceptance Criteria: production identity fields populated in `config.js`; no placeholder values remain in the rendered page or schema.org JSON-LD; `/admin` invite-only; separation documented.

## Todo

- [ ] Build secure client delivery backend (file delivery half).
  - Priority: P2
  - Context: the login gate is now server-verified (see Done above). What's still a client-side prototype: `client-gallery.html`'s file listing does not verify the `code` param against the server before showing/serving files. Separately, CodeRabbit flagged (PR #121, 2026-09-10, CWE-598) that the access token travels in the URL query string end-to-end (email link -> login page -> gallery redirect), which can leak into browser history and HTTP request/referrer logs; exploitability rated "Difficult" but real, and worth fixing alongside this work rather than as a second pass through the same auth surface. Not rushed now — the gallery is still mocked/hardcoded, so no real client files are actually exposed via this vector yet.
  - Acceptance Criteria: `client-gallery.html` calls a server endpoint (e.g. extending `netlify/functions/api-portal.mjs`) to re-verify the code and fetch the client's actual file manifest; time-bound signed download links; access logging. While rebuilding this flow, stop passing the raw access token as a URL query param after the initial login submission — deliver it via URL fragment (never sent to the server or logged) or exchange it for a short-lived session token at login, then use that session (not the original code) for the gallery-to-server calls. Update the e2e test so it doesn't assert a `code=` query param on the gallery URL.

- [ ] Activate marketplace platform in production (Calendly cutover). See ROADMAP.md "Marketplace Platform / Calendly Cutover" for full context.
  - Priority: P2
  - Acceptance Criteria: `db:migrate` run against production Neon DB; Stripe/Resend/JWT/PORTAL_SALT env vars set in Netlify; `features.platform: true` in `config.js`; Calendly script/CSP removed once verified working end-to-end.

## Maintenance

- [ ] Activate analytics provider (Plausible or Netlify Analytics) and set conversion goals.
  - Priority: P2
  - Acceptance Criteria: page view, booking, and contact-form events tracked in dashboard.

- [ ] Enable testimonials section once real client reviews are collected.
  - Priority: P3
  - Acceptance Criteria: `testimonials: true` in config.js; at least 3 verified reviews displayed.

- [ ] Activate A/B experiments.
  - Priority: P3
  - Acceptance Criteria: `experiments.enabled: true` in config.js; variant assignment wired to analytics; results analysed after 2 weeks.

- [ ] Dependency audit and update.
  - Priority: P3
  - Progress: netlify-cli upgraded (extract-zip vulnerability fix, PR #120, 2026-09-02).
  - Acceptance Criteria: `npm audit` clean; Playwright, Vitest, and netlify-cli on latest minor versions.
