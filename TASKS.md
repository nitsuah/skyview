
# Tasks

**Last Updated:** 2026-09-02

> **Delivery split:** public FE covers the marketing site and funnel. `/admin` is a separate CMS surface. Secure client portal/download auth is a separate backend workstream.

## Done (2026-09 cycle)

- [x] Server-side client-portal token validation — HMAC-SHA256, mandatory `PORTAL_SALT`, fail-closed. See `netlify/functions/api-portal.mjs`, `netlify/functions/utils/portal.js`. Was the top half of "Build secure client delivery backend" below; the remaining half (signed file delivery for `client-gallery.html`) stays open as its own P2 item.
- [x] Drone cursor hover offset (up-and-right of pointer) + transparent spotlight/laser beam from drone to cursor — `scripts/drone-cursor.js`, `styles/style.css`.
- [x] Marketplace platform SPA now built and served by the Docker preview (`Dockerfile`, `config/nginx.conf`) — previously only the Netlify build produced `/app`.
- [x] Identity data config plumbing — `config.js` `contact.address`, `contact.geo`, and `contact.social.facebook` added and wired into the schema.org JSON-LD via `updateStructuredData()`, so populating real values is a single-place edit. See P1 item below for what's still needed from the client.
- [x] Fixed `config/docker-compose.yml` relative-path bug that broke the documented `docker compose -f config/docker-compose.yml run --rm unit` / `... up --build web` commands when run from the repo root (relative paths were resolving against `config/`, not the repo root).

## In Progress

- [ ] Complete the launch checklist with verified production identity data.
  - Priority: P1
  - Blocker: config plumbing is done (see Done above) — this is now purely a data-entry task blocked on the business owner supplying real values. Specifically still needed: **real business phone number**, **real business email** (confirm if `contact@skyviewdynamics.com` is real or a placeholder), **service-area city/region** (or full street address) for `contact.address` in `config.js`, **approximate service-area GPS coordinates** for `contact.geo`, and **real social profile URLs** for `contact.social` (facebook/twitter/instagram/youtube — currently generic homepage URLs, not the business's actual profiles).
  - Acceptance Criteria: production identity fields populated in `config.js`; no placeholder values remain in the rendered page or schema.org JSON-LD; `/admin` invite-only; separation documented.

## Todo

- [ ] Build secure client delivery backend (file delivery half).
  - Priority: P2
  - Context: the login gate is now server-verified (see Done above). What's still a client-side prototype: `client-gallery.html`'s file listing does not verify the `code` param against the server before showing/serving files.
  - Acceptance Criteria: `client-gallery.html` calls a server endpoint (e.g. extending `netlify/functions/api-portal.mjs`) to re-verify the code and fetch the client's actual file manifest; time-bound signed download links; access logging.

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
