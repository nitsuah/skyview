# Tasks

**Last Updated:** 2026-04-03 (pmo/q2-2026-planning)

## Done

- [x] Build and ship the core static site experience with responsive layouts and media gallery.
- [x] Add client portal and admin CMS foundations.
- [x] Add Netlify deployment setup and SEO baseline files.
- [x] Add unit and E2E test frameworks.
- [x] Reconcile coverage and metric reporting sections.
  - Completed: 2026-03-27
  - Evidence: `docker compose run --rm unit` now publishes the authoritative 86.56% coverage result in [METRICS.md](METRICS.md).
- [x] Add Docker smoke validation workflow.
  - Completed: 2026-03-27
  - Evidence: `.github/workflows/docker-smoke.yml` now builds the container and verifies HTTP readiness.
- [x] Add launch conversion baseline instrumentation.
  - Completed: 2026-04-05
  - Evidence: `scripts/conversion-tracking.js` now captures privacy-first `landing_view`, `booking_cta_click`, and `contact_submit` events, and `docker compose run --rm unit` validates the coverage path plus the new conversion-tracking tests.

## In Progress

- [ ] Complete the launch checklist with verified production identity data.
  - Priority: P1
  - Problem: launch tasks still reference placeholder domain, contact, and schema values.
  - Acceptance Criteria: production identity fields and search-console tasks are complete and documented.

## Todo

- [ ] Implement advanced client portal controls.
  - Priority: P2
  - Problem: the portal foundation exists, but access lifecycle controls are still limited.
  - Acceptance Criteria: time-bound access links and notification flow are available and documented.

- [ ] Add measurable conversion-funnel instrumentation.
  - Priority: P2
  - Problem: optimization work still lacks business-impact evidence.
  - Acceptance Criteria: visitor-to-contact and visitor-to-booking events are tracked with dashboard visibility and reporting on top of the P1 baseline established above.

