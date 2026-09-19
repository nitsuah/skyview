
# Tasks

**Last Updated:** 2026-09-11

> **Delivery split:** public FE covers the marketing site and funnel. `/admin` is a separate CMS surface. Secure client portal/download auth is a separate backend workstream.

## Done (2026-09 cycle)

- [x] Native operator scheduling — the marketplace matched clients to operators but had no working date/availability handling: the booking modal never sent a `scheduled_at`, so nothing checked whether a proposed time actually worked for the operator or prevented double-booking. Added `operator_availability` / `operator_blocked_dates` (migration `006_operator_availability.sql`) and `netlify/functions/utils/scheduling.js`'s `checkOperatorAvailability()`, enforced on both booking creation and confirmation (`api-bookings.mjs`). `OperatorOnboarding.jsx` gained a weekly-hours + blocked-dates step; `OperatorProfile.jsx`'s booking modal now proposes and sends a real date/time with a live availability hint. Also fixed `scripts/migrate.js` calling `sql(stmt)`, which the installed Neon driver rejects for non-tagged-template calls (`sql.query(stmt)` is required) — `db:migrate` was broken before this fix, for every migration, not just the new one. See ROADMAP.md "Marketplace Platform / Calendly Cutover" for full context; `features.platform` still defaults to `false` pending the production migration/env-var prerequisites below.
- [x] Server-side client-portal token validation — HMAC-SHA256, mandatory `PORTAL_SALT`, fail-closed. See `netlify/functions/api-portal.mjs`, `netlify/functions/utils/portal.js`. Was the top half of "Build secure client delivery backend"; the remaining half (signed file delivery for `client-gallery.html`) is the entry directly below.
- [x] Build secure client delivery backend (file delivery half). `netlify/functions/utils/portal.js` gained `generateSessionToken`/`verifySessionToken` (1-hour, domain-separated `sess.` tokens, HMAC-SHA256/PORTAL_SALT, fail-closed) and `generateSignedDownloadToken`/`verifySignedDownloadToken` (5-minute, single-file-scoped `dl.` tokens) plus `logPortalAccess()`. `api-portal.mjs` now exchanges a valid access code for a session token in `/verify`, and adds `/files` (session-gated manifest fetch, `netlify/functions/utils/portal-manifest.js`), `/download` (mints a signed link), and `/file` (verifies the signed link, 302s to the real asset). CWE-598 fix (PR #121, CodeRabbit, 2026-09-10): `client-portal.html` now redirects to the gallery via URL fragment (`#session=<token>`), never a query param, and the gallery reads it once, scrubs it from the address bar via `history.replaceState`, and caches it in `sessionStorage` for the tab; the original 30-day access code is never reused after login. `client-gallery.html` fully rebuilt to fetch the manifest and download links from the server instead of hardcoded/mock data. Unit tests added in `tests/unit/portal-token.test.js`; `tests/drone-and-portal.spec.ts` updated to mock `/api/portal/files` and assert no `code=`/`session=` ever appears in the gallery URL. Still open: the manifest itself is a single shared demo manifest, not a real per-client storage backend, and bulk ZIP download remains a placeholder — see `docs/CLIENT_PORTAL.md`. Also flagged by CodeRabbit on PR #131 (2026-09-11): today's demo files live under `/assets/gallery`, the site's own public marketing gallery (already served statically with no auth), so the signed-link flow doesn't yet demonstrate real access control end-to-end — a real per-client store must serve files that live outside any statically-published directory, read as bytes (or via a private-bucket presigned URL) rather than a redirect to a public path.
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

- [ ] Activate marketplace platform in production (Calendly cutover). See ROADMAP.md "Marketplace Platform / Calendly Cutover" for full context.
  - Priority: P2
  - Acceptance Criteria: `db:migrate` run against production Neon DB (now includes migration 006, operator availability); Stripe/Resend/JWT/PORTAL_SALT env vars set in Netlify; `features.platform: true` in `config.js`; Calendly script/CSP removed once verified working end-to-end.
  - Code side is done (native scheduling shipped this cycle, see Done above) — what's left is entirely environment/ops, not a code change.

- [ ] Verify production auth/env end-to-end (left open by the 2026-09 auth + scheduling pass; nothing here could be checked without Netlify/Google/Resend access).
  - Priority: P1
  - Acceptance Criteria: (a) confirm `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`DATABASE_URL`/`JWT_SECRET`/`RESEND_API_KEY` are set in Netlify; (b) Google Cloud Console has `https://skyviewd.netlify.app/api/auth/google/callback` as an authorized redirect URI; (c) a human completes one real "Continue with Google" sign-in on production (the routing 404 is fixed and unit-tested, but the OAuth round trip itself was never exercised); (d) a real password-reset email is sent, received, and its link works (confirm the `noreply@skyviewdynamics.com` sender domain is verified in Resend).

- [ ] Publish the Calendly account, or keep Calendly disabled until the cutover.
  - Priority: P1 while `features.platform` is `false` (Calendly is the live booking CTA)
  - `calendly.com/skyviewdynamics` and `/consultation` both 404 from Calendly's servers, so the "Schedule a consultation" widget is currently broken for visitors. Either publish the event at that URL, or flip `features.calendly: false` (hides the section and nav link) until the marketplace cutover above lands.

- [ ] Native scheduling hardening (follow-ups to the availability work; none block the cutover).
  - Priority: P2
  - Overlap check and booking insert are not atomic: two clients booking the same operator/time at the same instant can both pass `checkOperatorAvailability` (the confirm-time recheck catches it before acceptance, but a DB-level exclusion constraint on `(operator_id, tstzrange)` would close it fully).
  - Availability is interpreted in UTC and windows must fit within one UTC day. Operators need a stored timezone (and cross-midnight windows) before this is correct outside a single timezone.
  - `updateAvailability` is delete-then-insert without a transaction; a failure mid-way can leave an operator with no availability (which reads as "unrestricted").
  - The public operator profile does not yet display availability, and the operator dashboard doesn't flag pending requests that conflict with each other.
  - No test exercises the real handlers against a database: the Neon HTTP driver can't talk to plain local Postgres, so SQL was verified via `pg` and JS logic via mocks. Add a Neon-branch (or driver-compatible proxy) integration test.

## Maintenance

- [ ] Test and tooling debt surfaced by the 2026-09 auth + scheduling pass.
  - Priority: P3
  - `npm run lint:js` is broken: `eslint` is not in `package.json`, so linting has never run in CI (stylelint likewise unverified).
  - `tests/site.spec.ts` "gallery interaction" times out intermittently under heavy parallel load (passes alone and with `--workers=2`); CI uses 1 worker, so low risk, but worth de-flaking.
  - Platform form labels (`Login.jsx`, `ResetPassword.jsx`, etc.) aren't associated with their inputs (no `htmlFor`/`id`), so `getByLabel` fails and screen readers lose the label; e2e specs currently select by placeholder. Fix the markup, then switch tests to `getByLabel`.
  - `vite preview` logs `/api/notifications` proxy errors during e2e (the `Layout` bell polls an unmocked endpoint); mock it in the specs to quiet the noise.
  - Add a tablet-width check for the Services cards (only desktop and 375px mobile were measured).
  - CodeRabbit was rate-limited on the native-scheduling PR (#139), so that PR never received an automated review; run one on `main` once capacity resets.

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
