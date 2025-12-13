# Skyview Roadmap

This roadmap outlines the path to building a professional, high-impact drone services website. The goal is to provide a stunning visual experience while ensuring the site is easy to manage for the owner.

## Phase 1: Core Foundation & Aesthetics (Completed)
*Focus: Getting the site live with professional content and structure.*

- [x] **Site Structure & Navigation**
    - [x] ensure smooth navigation between Home, Services, Gallery, and Contact.
    - [x] Review `index.html` structure for SEO semantics.
- [x] **Services Section**
    - [x] Define clear service packages (e.g., Real Estate, Events, Inspections).
    - [x] Create a pricing/package display component.
- [x] **High-Performance Gallery**
    - [x] Optimize initial drone footage loading (lazy loading, poster images).
    - [x] Ensure specific "Best Of" shots are front and center.
- [x] **Contact & Leads**
    - [x] Connect Contact Form (Netlify Forms recommended for simplicity).
    - [x] Ensure mobile responsiveness for the contact flow.

## Phase 2: Dynamic Content & Management (Completed)
*Focus: Making it easy for the owner to update content without coding.*

- [x] **Dynamic Gallery System**
    - [x] **Asset Pool Connection**: Connected to `assets/gallery.json` managed by Decap CMS.
    - [x] **Goal**: Allow adding new photos/videos by simply uploading them to a folder or service, rather than editing HTML.
- [x] **Lightweight Admin / Login**
    - [x] **Netlify Identity**: Implemented for Admin login.
    - [x] **Dashboard**: Set up Decap CMS at `/admin` to manage gallery assets.
- [ ] **Client Deliverables**
    - [ ] Simple password-protected pages for clients to view their specific footage? (TBD).

## Phase 3: Business Automation (Long Term)
*Focus: Scaling the business side.*

- [ ] **Booking System**
    - [ ] Integrate Calendly or similar for "Consultation Requests".
- [ ] **Notifications**
    - [ ] Automated email responses upon form submission.
- [ ] **Analytics**
    - [ ] Basic privacy-friendly analytics to track visitor interest.

## Notes & Ideas
- **Assets**: Currently using local assets. Need to transition to a cloud-hosted solution for easier scaling.
- **Drone Footage**: Prioritize video performance. Use WebP/WebM where possible.
