# Skyview Roadmap

This roadmap outlines the path to building a professional, high-impact drone services website. The goal is to provide a stunning visual experience while ensuring the site is easy to manage for the owner.

## Phase 1: Core Foundation & Aesthetics (Immediate)
*Focus: Getting the site live with professional content and structure.*

- [ ] **Site Structure & Navigation**
    - ensure smooth navigation between Home, Services, Gallery, and Contact.
    - [ ] Review `index.html` structure for SEO semantics.
- [ ] **Services Section**
    - [ ] Define clear service packages (e.g., Real Estate, Events, Inspections).
    - [ ] Create a pricing/package display component.
- [ ] **High-Performance Gallery**
    - [ ] Optimize initial drone footage loading (lazy loading, poster images).
    - [ ] Ensure specific "Best Of" shots are front and center.
- [ ] **Contact & Leads**
    - [ ] Connect Contact Form (Netlify Forms recommended for simplicity).
    - [ ] Ensure mobile responsiveness for the contact flow.

## Phase 2: Dynamic Content & Management (Short Term)
*Focus: Making it easy for the owner to update content without coding.*

- [ ] **Dynamic Gallery System**
    - [ ] **Asset Pool Connection**: Investigate connecting to a dynamic source (e.g., Cloudinary, Google Drive, or a simple JSON manifest) to load gallery images.
    - [ ] **Goal**: Allow adding new photos/videos by simply uploading them to a folder or service, rather than editing HTML.
- [ ] **Lightweight Admin / Login (Optional but Streamlined)**
    - [ ] Explore **Netlify Identity** for simple "Admin" login.
    - [ ] Create a secure "Upload" or "Dashboard" page to view contact submissions or manage assets.
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
