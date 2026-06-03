
# 🗺️ Skyview Roadmap

**Last Updated:** 2026-06-02 (Q3 dev sprint — dev-q3 branch)
Next Review: 2026-07-01

> **Planning split:** public FE = landing, gallery, booking, contact, and privacy-safe funnel tracking. `/admin` = separate CMS surface. Client delivery / signed-download auth = separate backend workstream, not part of the marketing page bundle.

## 2026 Q1 (Completed)

- [x] Deliver the production-ready static site architecture and deployment configuration.
- [x] Implement the responsive gallery, contact flow, and booking integration.
- [x] Add Playwright and Vitest harnesses plus SEO baseline artifacts.

## 2026 Q2 (Completed)

- [x] Execute the production launch checklist with verified business metadata and access boundaries.
  - Remaining blocker: final client-approved phone, email, location, and social values still need to be plugged into the centralized `config.js` identity fields.
- [x] Resolve coverage and metric-documentation drift.
- [x] Add an evidence-backed monitoring baseline with Lighthouse and Core Web Vitals snapshots.
- [x] Add booking-funnel baseline tracking (landing -> gallery proof -> booking/contact intent) with privacy-first event capture.
- [x] Clarify FE vs admin/backend scope in the launch plan.

## 2026 Q3 (In Progress — dev-q3)

- [x] Harden `/admin` publishing access with an invite-only workflow.
  - CSP + `no-store` + `noindex` headers on all `/admin/*` and client-portal routes via `netlify.toml`.
- [x] Expand conversion-funnel reporting beyond the shipped local dashboard.
  - `getFunnelDropOff()`, `exportMetricsCSV()`, `exportMetricsJSON()` now available; dashboard shows step drop-off percentages and export buttons; referrer and campaign captured on landing.
- [x] Improve gallery asset governance for seasonal content updates.
  - `assets/gallery.json` items carry `season`, `displayOrder`, `active` fields; `gallery-loader-v2.js` filters and sorts accordingly; CMS editor updated.
- [x] Add A/B testing framework for hero messaging and CTA experiments.
  - `scripts/ab-testing.js` — deterministic per-visitor bucketing, feature-gated in `config.js`.
- [x] Add UTM + referrer-based campaign personalization.
  - `scripts/campaign.js` — hero subline variant per traffic source, session-persisted.
- [x] Harden client portal with rate limiting and time-bound token expiry.
  - 5-attempt / 15-min lockout, token expiry detection, `scripts/portal-token.js` for signed code generation.
- [ ] Build secure client delivery / portal backend separately from the public marketing FE.
  - Goal: signed links, expiry, and delivery controls live outside the landing-page bundle.
  - Next: wire `scripts/portal-token.js` to a Netlify Function or edge middleware with `PORTAL_SALT` secret.

## 2026 Q4 (Planned)

- [ ] Evaluate lightweight personalization by campaign or service segment.
  - Foundation shipped in Q3 (`scripts/campaign.js`); Q4 work = multi-segment hero copy, service spotlight targeting.
- [ ] Evaluate A/B testing for hero messaging and CTA improvements.
  - Framework shipped in Q3 (`scripts/ab-testing.js`); Q4 work = enable experiments, wire to analytics, analyse results.
