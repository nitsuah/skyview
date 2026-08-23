
# Skyview Roadmap

**Last Updated:** 2026-08-22
Next Review: 2026-10-01

> **Planning split:** public FE = landing, gallery, booking, contact, and privacy-safe funnel tracking. `/admin` = separate CMS surface. Client delivery / signed-download auth = separate backend workstream.

## Completed (Q1–Q3 2026) ✅

> Production-ready static site, test harnesses, SEO, Docker smoke, funnel tracking, Lighthouse monitoring, CSP headers, gallery governance, conversion funnel reporting, A/B testing framework, campaign personalization, and client portal hardening (CSP, security headers, and funnel posture) all shipped. Note: server-side portal token validation is a separate in-progress workstream — see In Progress below. See FEATURES.md for full details.

## In Progress (Q3 2026)

- [ ] Build secure client delivery / portal backend separately from the public marketing FE.
  - Next: wire `scripts/portal-token.js` to a Netlify Function or edge middleware with `PORTAL_SALT` secret.
  - Status: platform Netlify Functions scaffolded; portal token validation not yet server-side.

## Q4 2026 (Planned)

- [ ] Multi-segment campaign personalization — expand `scripts/campaign.js` to support service spotlight targeting and additional hero copy variants.
- [ ] Enable A/B experiments — flip `experiments.enabled: true` in `config.js`, wire variants to analytics, analyse results.
- [ ] **Testimonial carousel** — rotating client quote block on the homepage; content managed through a `testimonials` array in `config.js` so it can be updated without touching markup; supports campaign-segment targeting for social proof alignment.
- [ ] **Booking calendar embed** — replace or complement the contact form with an embedded availability widget (Cal.com or similar self-hostable option); reduces booking friction to a single click while keeping conversion events within the existing funnel tracking pipeline.


## Q1 2027 (PM Goals — Client Outcomes)

- [ ] **Blog / news section** — Decap CMS collection for articles; improves SEO long-tail discovery for drone services.
- [ ] **Expanded service pages** — individual landing pages for Real Estate, Events, Cinematography, and Mapping; separate URLs for SEO.
- [ ] **Testimonial section activation** — enable `testimonials: true` in config.js once real client reviews are collected.
- [ ] **Google My Business** — verify listing, link to live site, enable review collection.
- [ ] **Portfolio case studies** — per-project pages with before/after, deliverables, and client outcome blurb.
- [ ] **Analytics activation** — enable Plausible or Netlify Analytics; set conversion goals for booking and contact events.
