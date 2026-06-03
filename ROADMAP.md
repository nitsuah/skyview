
# Skyview Roadmap

**Last Updated:** 2026-06-03
Next Review: 2026-07-01

> **Planning split:** public FE = landing, gallery, booking, contact, and privacy-safe funnel tracking. `/admin` = separate CMS surface. Client delivery / signed-download auth = separate backend workstream.

## Completed (Q1–Q3 2026)

- Production-ready static site, responsive gallery, booking integration, contact flow
- Playwright + Vitest test harnesses, SEO baseline, Docker smoke validation
- Funnel baseline tracking (landing → gallery → booking/contact intent), privacy-first event capture
- Lighthouse + Core Web Vitals monitoring baseline
- CSP + Permissions-Policy headers; `no-store` + `noindex` on `/admin/*` and client-portal routes
- Gallery governance: `season`, `displayOrder`, `active` fields in `assets/gallery.json`; CMS editor updated; `gallery-loader-v2.js` filters and sorts accordingly
- Conversion funnel reporting: `getFunnelDropOff()`, `exportMetricsCSV()`, `exportMetricsJSON()`; dashboard shows drop-off % and export buttons; referrer + campaign captured on `landing_view`
- A/B testing framework (`scripts/ab-testing.js`): deterministic per-visitor bucketing, feature-gated in `config.js`
- Campaign personalization (`scripts/campaign.js`): UTM + referrer → hero subline variants, session-persisted
- Client portal hardening: 5-attempt / 15-min lockout, time-bound token expiry, `scripts/portal-token.js` for signed code generation

## Open (Q3 2026)

- [ ] Build secure client delivery / portal backend separately from the public marketing FE.
  - Next: wire `scripts/portal-token.js` to a Netlify Function or edge middleware with `PORTAL_SALT` secret.

## Q4 2026 (Planned)

- [ ] Multi-segment campaign personalization — expand `scripts/campaign.js` to support service spotlight targeting and additional hero copy variants.
- [ ] Enable A/B experiments — flip `experiments.enabled: true` in `config.js`, wire variants to analytics, analyse results.
