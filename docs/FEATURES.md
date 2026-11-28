# Skyview Features

> 🧭 [skyview](../README.md) · **Features** · [Roadmap](./ROADMAP.md) · [Tasks](./TASKS.md) · [Changelog](./CHANGELOG.md) · [Metrics](../METRICS.md) <!-- nav -->

**Last Validated:** 2026-11-28

## Core Experiences

- **Immersive Hero Section** — full-screen drone video background with cinematic motion polish and cursor-follow drone accent that hovers offset up-and-right of the pointer, connected by a transparent spotlight beam (`scripts/drone-cursor.js`)
- **Dynamic Gallery** — grid/masonry layout with lazy loading; seasonal filtering, display-order sorting, and active/inactive governance via `assets/gallery.json`
- **Service Packages** — card-based display of offerings (Real Estate, Events, Cinematography, Mapping)
- **Responsive Design** — mobile-first layout using CSS variables, Flexbox, and Grid

## Marketing & Personalization

- **Campaign Personalization** — UTM param + referrer detection applies per-source hero subline variants on page load; data session-persisted (`scripts/campaign.js`)

## Funnel Reporting

- **Local Dashboard** — in-browser conversion dashboard for the landing → gallery → booking/contact funnel, with step-by-step drop-off percentages (owner-only: hidden by default; shown to a logged-in admin, or on `localhost` with `?metrics=1`)
- **CSV / JSON Export** — `exportMetricsCSV()` and `exportMetricsJSON()` for offline analysis

## Client Portal

- **Rate Limiting** — 5-attempt / 15-minute lockout enforced client-side via localStorage
- **Time-Bound Token Expiry** — access codes are signed and verified server-side; expired ones are rejected with a clear message to the client
- **Token Generator** — `scripts/portal-token.js` Node.js CLI produces signed `clientId.expiry_unix.hmac` codes with configurable TTL, sharing the same signing implementation as the verification endpoint

## Marketplace Platform

- **Two-Sided Marketplace** — Netlify Functions + Neon DB + Stripe Connect + React SPA at `/app` matching clients to drone operators; the marketing site's booking CTAs (hero → `/app/register`, "Find a drone operator" / "Post a job" / "List as an operator") point into it
- **Native Operator Scheduling** — recurring weekly availability windows and blocked dates (migration `006_operator_availability.sql`); `checkOperatorAvailability()` enforces no overlaps at booking creation and confirmation, backed by a DB-level exclusion constraint; onboarding Availability step and a booking modal that proposes a date/time with a live availability hint

## Planned

- **Per-Client Protected Delivery** — signed-token verification and a server-provided manifest with signed download links are shipped, but every verified session gets the same demo manifest pointing at publicly served `/assets/gallery` files; private per-client storage (Netlify Blobs/S3) is the remaining work (2027 Q1)
- **Marketplace Production Go-Live** — the platform SPA, scheduling, and Calendly cutover are shipped; production activation (Neon migrations through 006, Stripe/Resend/JWT/`PORTAL_SALT` env vars, one live end-to-end pass) remains (2027 Q1)
- **Multi-Segment Personalization** — expand campaign variants to cover service spotlight targeting (2027 Q1)
- **Live A/B Experiments** — enable framework already shipped; wire to analytics and analyse results (2027 Q1)
