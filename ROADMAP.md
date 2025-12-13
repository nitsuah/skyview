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

## Phase 3: Business Automation (Completed ✅)
*Focus: Scaling the business side.*

- [x] **Booking System**
    - [x] Integrated Calendly inline widget for consultation bookings.
    - [x] Added dedicated "BOOKING" section with responsive design.
    - [x] Connected CTA button to booking section.
- [x] **Notifications**
    - [x] Created professional thank you page with auto-redirect.
    - [x] Configured Netlify Forms with email notification support.
    - [x] Added comprehensive email notification setup documentation.
- [x] **Analytics**
    - [x] Ready for privacy-friendly analytics (Plausible/Netlify Analytics).
    - [x] Script integrated (needs account setup to activate).
    - [x] Documentation provided for multiple analytics options.

## Phase 4: Client Experience (Completed ✅)
*Focus: Delivering completed projects to clients.*

- [x] **Client Portals**
    - [x] Password-protected login page with access code system
    - [x] Client gallery with file filtering and previews
    - [x] Individual and bulk download options
    - [x] Comprehensive implementation documentation

## Phase 5: Trust & Social Proof (Completed ✅)
*Focus: Building credibility and trust with potential clients.*

- [x] **Testimonials**
    - [x] Professional testimonials section with ratings
    - [x] Client avatars and credentials
    - [x] Added to main navigation
- [x] **Privacy & Legal**
    - [x] Comprehensive privacy policy page
    - [x] GDPR-compliant data handling information
    - [x] Cookie and tracking disclosure

## Phase 6: Optimization (Next)
*Focus: Performance and SEO improvements.*

- [ ] **Image Optimization**
    - [ ] Convert assets to WebP format
    - [ ] Implement responsive images
    - [ ] Further optimize loading performance
- [ ] **SEO Enhancement**
    - [ ] Add structured data (Schema.org)
    - [ ] Meta tags optimization
    - [ ] Sitemap generation
- [ ] **Performance**
    - [ ] Lighthouse score optimization
    - [ ] Core Web Vitals improvements

## Notes & Ideas
- **Assets**: Currently using local assets. Need to transition to a cloud-hosted solution for easier scaling.
- **Drone Footage**: Prioritize video performance. Use WebP/WebM where possible.
