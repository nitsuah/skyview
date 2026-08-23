
# Tasks

**Last Updated:** 2026-08-22

> **Delivery split:** public FE covers the marketing site and funnel. `/admin` is a separate CMS surface. Secure client portal/download auth is a separate backend workstream.

## In Progress

- [ ] Complete the launch checklist with verified production identity data.
  - Priority: P1
  - Blocker: client-approved phone, email, location, and social/schema values still pending — fields are centralized in `config.js` and ready to receive them.
  - Acceptance Criteria: production identity fields populated, `/admin` invite-only, separation documented.

## Todo

- [ ] Build secure client delivery backend.
  - Priority: P2
  - Context: portal has client-side rate limiting and time-bound token expiry (`client-portal.html`, `scripts/portal-token.js`). Backend signed-link delivery needs a separate service layer.
  - Acceptance Criteria: Netlify Function or edge middleware validates tokens server-side using `PORTAL_SALT` secret; time-bound access links and/or signed downloads; notification flow.


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
  - Acceptance Criteria: `npm audit` clean; Playwright, Vitest, and netlify-cli on latest minor versions.

- [ ] Populate production identity fields (phone, email, social URLs, schema coordinates).
  - Priority: P1
  - Context: all fields centralised in `config.js` and `index.html`; placeholders still present.
  - Acceptance Criteria: no placeholder contact values remain on the live site.
