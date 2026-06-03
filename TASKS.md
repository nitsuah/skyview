
# Tasks

**Last Updated:** 2026-04-13 (Overseer/PM compliance review)

Compliance: Overseer/PM task tracking validated for Q2 2026

> **Delivery split:** the public FE covers the marketing site and funnel. `/admin` is a separate CMS surface, and any secure client portal/download auth is a separate backend task.

## Done

- [x] Build and ship the core static site experience with responsive layouts and media gallery.
- [x] Add client portal and admin CMS foundations.
- [x] Add Netlify deployment setup and SEO baseline files.
- [x] Add unit and E2E test frameworks.
- [x] Reconcile coverage and metric reporting sections.
  - Completed: 2026-03-27
  - Evidence: `docker compose -f config/docker-compose.yml run --rm unit` remains the authoritative coverage source reflected in [METRICS.md](METRICS.md).
- [x] Add Docker smoke validation workflow.
  - Completed: 2026-03-27
  - Evidence: `.github/workflows/docker-smoke.yml` now builds the container and verifies HTTP readiness.
- [x] Add launch conversion baseline instrumentation.
  - Completed: 2026-04-05
  - Evidence: `scripts/conversion-tracking.js` now captures privacy-first `landing_view`, `gallery_engagement`, `booking_cta_click`, and `contact_submit` events, and `docker compose -f config/docker-compose.yml run --rm unit` validates the coverage path plus the conversion-tracking tests.
- [x] Refresh the launch visual identity and dark-mode booking embed.
  - Completed: 2026-04-06
  - Evidence: the browser preview at `http://127.0.0.1:8080` confirms the updated hero, services, gallery, dark Calendly embed, and curated reel presentation, while `docker compose -f config/docker-compose.yml run --rm unit` stays green.
- [x] Add cinematic motion polish and cursor-follow drone accent.
  - Completed: 2026-04-06
  - Evidence: `scripts/drone-cursor.js` and `scripts/interactive-polish.js` are live in the Docker preview, and the current Docker-backed validation suite remains green.
- [x] Capture an evidence-backed browser monitoring baseline.
  - Completed: 2026-04-06
  - Evidence: `docs/lighthouse-desktop.report.html` / `.json` now capture a Lighthouse desktop baseline (92 Performance / 96 Accessibility / 57 Best Practices / 100 SEO), and the local browser snapshot records ~280ms DOM ready, ~1.3s load complete, and 0.002 CLS.
- [x] Add local conversion reporting visibility.
  - Completed: 2026-04-06
  - Evidence: `scripts/conversion-tracking.js` now renders a preview-only dashboard on `localhost` or `?metrics=1` for landing, gallery proof, booking, and contact totals, and `docker compose -f config/docker-compose.yml run --rm unit` now passes 17/17 files and 75/75 tests.

## In Progress

- [ ] Complete the launch checklist with verified production identity data and access boundaries.
  - Priority: P1
  - Problem: final client-approved phone, email, location, and social/schema values are still pending even though the site identity is now centralized in `config.js`, and the CMS/client-delivery boundary should stay explicit for launch.
  - Acceptance Criteria: production identity fields are complete, `/admin` remains invite-only, and the separation is documented.

## Todo

- [ ] Harden `/admin` publishing auth.
  - Priority: P1
  - Problem: the CMS exists, but launch should keep it owner/invite-only and clearly separate from customer-facing flows.
  - Acceptance Criteria: Netlify Identity / Git Gateway settings are documented as invite-only with no public signup.

- [ ] Build secure client delivery backend / advanced portal controls.
  - Priority: P2
  - Problem: the portal foundation exists, but authenticated delivery should be built as a separate backend/service layer rather than mixed into the public landing page.
  - Acceptance Criteria: time-bound access links or signed downloads plus notification flow are available and documented.

- [ ] Expand conversion-funnel reporting beyond the local preview dashboard.
  - Priority: P2
  - Problem: privacy-first event capture and local dashboard visibility are now live, but a shared external reporting surface is still optional.
  - Acceptance Criteria: a hosted analytics dashboard or reporting export is documented if the client wants broader marketing visibility.

