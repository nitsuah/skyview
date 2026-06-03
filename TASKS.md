
# Tasks

**Last Updated:** 2026-06-02 (Q3 dev sprint — dev-q3 branch)

Compliance: Overseer/PM task tracking validated for Q2 2026

> **Delivery split:** the public FE covers the marketing site and funnel. `/admin` is a separate CMS surface, and any secure client portal/download auth is a separate backend task.

## Done

- [x] Build and ship the core static site experience with responsive layouts and media gallery.
- [x] Add client portal and admin CMS foundations.
- [x] Add Netlify deployment setup and SEO baseline files.
- [x] Add unit and E2E test frameworks.
- [x] Reconcile coverage and metric reporting sections.
  - Completed: 2026-03-27
- [x] Add Docker smoke validation workflow.
  - Completed: 2026-03-27
- [x] Add launch conversion baseline instrumentation.
  - Completed: 2026-04-05
- [x] Refresh the launch visual identity and dark-mode booking embed.
  - Completed: 2026-04-06
- [x] Add cinematic motion polish and cursor-follow drone accent.
  - Completed: 2026-04-06
- [x] Capture an evidence-backed browser monitoring baseline.
  - Completed: 2026-04-06
- [x] Add local conversion reporting visibility.
  - Completed: 2026-04-06
- [x] Harden `/admin` publishing auth.
  - Completed: 2026-06-02 (dev-q3)
  - Evidence: `netlify.toml` now enforces CSP, `X-Robots-Tag: noindex,nofollow`, and `Cache-Control: no-store` on all `/admin/*` and client-portal routes. Invite-only workflow is documented in `docs/admin-auth.md`.
- [x] Expand conversion-funnel reporting beyond the local preview dashboard.
  - Completed: 2026-06-02 (dev-q3)
  - Evidence: `scripts/conversion-tracking.js` now exports `getFunnelDropOff()`, `exportMetricsCSV()`, and `exportMetricsJSON()`; dashboard shows drop-off percentages and CSV/JSON export buttons; referrer + campaign metadata captured on `landing_view`; 90/90 tests green via `docker compose run --rm unit`.
- [x] Add A/B testing framework.
  - Completed: 2026-06-02 (dev-q3)
  - Evidence: `scripts/ab-testing.js` provides deterministic per-visitor bucket assignment; hero headline and CTA variants configured in `config.js`; feature-gated behind `experiments.enabled: false` by default; 4 unit tests pass.
- [x] Add campaign/UTM personalization.
  - Completed: 2026-06-02 (dev-q3)
  - Evidence: `scripts/campaign.js` parses UTM params and referrer source, applies hero subline variants per traffic source, persists to sessionStorage; 5 unit tests pass.
- [x] Improve gallery asset governance for seasonal content.
  - Completed: 2026-06-02 (dev-q3)
  - Evidence: `assets/gallery.json` items now carry `season`, `displayOrder`, and `active` fields; `gallery-loader-v2.js` respects active status and sorts by `displayOrder`; `admin/config.yml` exposes all new fields in the CMS editor.
- [x] Harden client portal with rate limiting and token expiry.
  - Completed: 2026-06-02 (dev-q3)
  - Evidence: `client-portal.html` now enforces 5-attempt / 15-min lockout via localStorage, detects expired time-bound tokens, and shows clear expiry messaging; `scripts/portal-token.js` generates signed access codes with configurable TTL.

## In Progress

- [ ] Complete the launch checklist with verified production identity data and access boundaries.
  - Priority: P1
  - Problem: final client-approved phone, email, location, and social/schema values are still pending even though the site identity is now centralized in `config.js`, and the CMS/client-delivery boundary should stay explicit for launch.
  - Acceptance Criteria: production identity fields are complete, `/admin` remains invite-only, and the separation is documented.

## Todo

- [ ] Build secure client delivery backend / advanced portal controls.
  - Priority: P2
  - Problem: portal now has client-side rate limiting and token expiry. Backend signed-link delivery should be a separate service layer.
  - Acceptance Criteria: time-bound access links or signed downloads plus notification flow, backed by a server-side secret (see `scripts/portal-token.js`).
