# Skyview Roadmap

**Last Updated:** 2026-04-06 (motion-polish + monitoring evidence)

> **Planning split:** public FE = landing, gallery, booking, contact, and privacy-safe funnel tracking. `/admin` = separate CMS surface. Client delivery / signed-download auth = separate backend workstream, not part of the marketing page bundle.

## 2026 Q1 (Completed)

- [x] Deliver the production-ready static site architecture and deployment configuration.
- [x] Implement the responsive gallery, contact flow, and booking integration.
- [x] Add Playwright and Vitest harnesses plus SEO baseline artifacts.

## 2026 Q2 (In Progress)

- [ ] Execute the production launch checklist with verified business metadata and access boundaries.
  - Remaining blocker: final client-approved phone, email, location, and social values still need to be plugged into the centralized `config.js` identity fields, and `/admin` should stay invite-only / owner-managed for launch.
- [x] Resolve coverage and metric-documentation drift.
- [x] Add an evidence-backed monitoring baseline with Lighthouse and Core Web Vitals snapshots.
  - Evidence: `docs/lighthouse-desktop.report.html` / `docs/lighthouse-desktop.report.json` now capture a verified desktop Lighthouse baseline (92 Performance / 96 Accessibility / 57 Best Practices on local HTTP preview / 100 SEO) alongside the local browser snapshot (~280ms DOM ready, ~1.3s load, 0.002 CLS).
- [x] Add booking-funnel baseline tracking (landing -> gallery proof -> booking/contact intent) with privacy-first event capture.
- [x] Clarify FE vs admin/backend scope in the launch plan.
  - Public FE progress includes the landing experience, gallery, booking/contact flow, and lightweight conversion instrumentation. Admin auth and secure client delivery remain separate workstreams.

## 2026 Q3 (Planned)

- [ ] Harden `/admin` publishing access with an invite-only workflow.
  - Goal: keep CMS auth minimal and separated from any future customer/backend identity system.
- [ ] Build secure client delivery / portal backend separately from the public marketing FE.
  - Goal: signed links, expiry, and delivery controls live outside the landing-page bundle.
- [ ] Expand conversion-funnel reporting beyond the shipped local dashboard.
  - Local milestone complete: `scripts/conversion-tracking.js` now exposes landing / booking / contact totals in a preview dashboard on `localhost` or `?metrics=1`.
  - Remaining stretch: optional shared reporting, funnel-drop-off analysis, and experiment hooks for lead-capture optimization.
- [ ] Improve gallery asset governance for seasonal content updates.

## 2026 Q4 (Exploratory)

- [ ] Evaluate lightweight personalization by campaign or service segment.
- [ ] Evaluate A/B testing for hero messaging and CTA improvements.

