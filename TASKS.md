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

## In Progress

- [ ] Complete the launch checklist with verified production identity data.
  - Priority: P1
  - Problem: launch tasks still reference placeholder domain, contact, and schema values.
  - Acceptance Criteria: production identity fields and search-console tasks are complete and documented.

- [ ] Add launch conversion baseline instrumentation.
  - Priority: P1
  - Problem: launch optimization lacks a measurable baseline for visitor-to-contact and visitor-to-booking transitions.
  - Acceptance Criteria: privacy-first event metrics are captured for landing, contact submit, and booking CTA actions; baseline numbers are documented in METRICS.md.

## Todo

- [ ] Implement advanced client portal controls.
  - Priority: P2
  - Problem: the portal foundation exists, but access lifecycle controls are still limited.
  - Acceptance Criteria: time-bound access links and notification flow are available and documented.

- [ ] Add measurable conversion-funnel instrumentation.
  - Priority: P2
  - Problem: optimization work still lacks business-impact evidence.
  - Acceptance Criteria: visitor-to-contact and visitor-to-booking events are tracked with dashboard visibility.

