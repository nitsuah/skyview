# 🚁 SkyView Dynamics - Cinematic Drone Services

[![Deploy Status](https://github.com/nitsuah/skyview/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/nitsuah/skyview/actions)

A stunning, high-tech website for professional drone services featuring a minimalist design with full-bleed photography, dark high-contrast aesthetics, and glassmorphic UI elements.

## 🎨 Design Features

- **Color Palette**: Deep charcoal/black (#1A1A1A) with electric blue/cyan (#00FFFF) accents
- **Typography**: Modern Inter font family with bold weights and capitalization
- **Visual Style**: Glassmorphic cards with futuristic HUD-inspired design
- **Animations**: Smooth micro-animations, parallax effects, and glow effects
- **Responsive**: Mobile-first design that adapts beautifully to all screen sizes

## 🚀 Quick Start

### Run Locally

You will need a local server to properly load JSON and modules.

```bash
# Using Node.js (Recommended)
npx http-server . -p 3000

# Using Python
python -m http.server 3000
```

Then open: [localhost:3000](http://localhost:3000)

## 🔧 Technical Stack

- **HTML5**: Semantic structure.
- **CSS3**: Modern variables, flexbox/grid, glassmorphism.
- **JavaScript**: ES6 Modules (`scripts/`).
- **CMS**: Decap CMS (git-based content management).
- **Testing**:
  - **E2E**: Playwright (`npx playwright test`)
  - **Unit**: Vitest (`npx vitest run`)
- **Netlify**: Hosting, Forms, and Identity.

## 🎯 Features

### Core Features
- ✅ Full-screen hero with video background
- ✅ Glassmorphic service cards
- ✅ Dynamic gallery with lightbox
- ✅ Contact form with Netlify Forms
- ✅ Calendly booking integration
- ✅ Mobile hamburger menu
- ✅ Smooth scroll navigation
- ✅ WebP images with fallbacks
- ✅ Performance monitoring

### Business Features
- ✅ Privacy policy page (GDPR-compliant)
- ✅ Testimonials section
- ✅ Client portal prototype
- ✅ Admin CMS (Decap CMS)
- ✅ Feature flags system
- ✅ Email notifications

## 📦 NPM Scripts

```bash
# Development
npm run serve          # Start dev server on port 8080

# Testing
npm test              # Run Playwright E2E tests
npx vitest run        # Run unit tests

# Optimization
npm run optimize:images  # Convert images to WebP
```

## 📚 Documentation

- 📖 [Quick Start Guide](QUICKSTART.md) - 5-minute setup
- 📖 [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) - Production deployment
- 📖 [Feature Flags](docs/CONFIG.md) - Toggle features on/off
- 📖 [WebP Optimization](docs/WEBP_OPTIMIZATION.md) - Image optimization
- 📖 [Performance Checklist](docs/PERFORMANCE_CHECKLIST.md) - Speed optimization
- 📖 [Manual Setup](docs/MANUAL_SETUP.md) - Configuration steps
- 📖 [Project Status](PROJECT_STATUS.md) - Complete overview

## ⚙️ Configuration

### Feature Flags
Edit `config.js` to enable/disable features:

```javascript
features: {
    testimonials: false,    // Testimonials section
    contactForm: false,     // Contact form
    calendly: true,         // Booking widget
    clientPortal: false,    // Client file access
    adminCMS: true,         // Admin dashboard
    preview3D: false,       // 3D preview (future)
    analytics: false        // Analytics tracking
}
```

### Quick Setup
1. Update Calendly URL in `config.js`
2. Enable features you want
3. Run `npm run optimize:images`
4. Deploy to Netlify

See [MANUAL_SETUP.md](docs/MANUAL_SETUP.md) for detailed steps.

## 🚀 Deployment

### Deploy to Netlify
1. Push to GitHub
2. Connect to Netlify
3. Deploy! (automatic)

See [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for complete instructions.

### Performance
- ✅ WebP images (30-40% smaller)
- ✅ Lazy loading
- ✅ Optimized assets
- ✅ CDN delivery
- 🎯 Lighthouse Score: 90+

---

> **Built with ❤️ for SkyView Dynamics by nitsuah**
