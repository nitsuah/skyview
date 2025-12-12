# 🚁 SkyView Dynamics - Cinematic Drone Services

A stunning, high-tech website for professional drone services featuring a minimalist design with full-bleed photography, dark high-contrast aesthetics, and glassmorphic UI elements.

## 🎨 Design Features

- **Color Palette**: Deep charcoal/black (#1A1A1A) with electric blue/cyan (#00FFFF) accents
- **Typography**: Modern Inter font family with bold weights and capitalization
- **Visual Style**: Glassmorphic cards with futuristic HUD-inspired design
- **Animations**: Smooth micro-animations, parallax effects, and glow effects
- **Responsive**: Mobile-first design that adapts beautifully to all screen sizes

## 🏗️ Project Structure

```
skyview/
├── index.html          # Main HTML structure
├── style.css           # Complete design system and styling
├── script.js           # Interactive features and animations
├── assets/
│   ├── hero-bg.jpg     # Hero section background image
│   ├── hero-video.mp4  # (Optional) Hero video loop
│   └── gallery/
│       ├── image1.jpg  # Festival/event photography
│       ├── image2.jpg  # Coastal sunset aerial
│       ├── image3.jpg  # Modern building architecture
│       ├── image4.jpg  # Historic castle
│       ├── image5.jpg  # Construction site
│       └── image6.jpg  # Urban cityscape
└── README.md
```

## 🚀 Quick Start

### Option 1: Simple Local Server (Recommended)

1. **Using Python** (if installed):
   ```bash
   python -m http.server 8000
   ```
   Then open: http://localhost:8000

2. **Using Node.js** (if installed):
   ```bash
   npx serve
   ```

3. **Using VS Code**:
   - Install "Live Server" extension
   - Right-click `index.html` → "Open with Live Server"

### Option 2: Direct File Opening

Simply open `index.html` in your web browser. Note: Some features like video may not work without a server.

## 📋 Setup Checklist

### Required Assets

The website is functional with placeholder images, but for the best experience:

- [ ] **Hero Background**: Replace `assets/hero-bg.jpg` with a high-resolution (1920x1080+) dramatic aerial photo
- [ ] **Hero Video** (Optional): Add `assets/hero-video.mp4` for a cinematic video loop
- [ ] **Gallery Images**: Add 6 high-quality drone photos to `assets/gallery/` (named image1.jpg through image6.jpg)

### Recommended Image Specifications

- **Hero Background**: 1920x1080px or higher, landscape orientation, dramatic/cinematic
- **Hero Video**: MP4 format, 1920x1080px, 10-30 seconds loop, muted
- **Gallery Images**: 1200x900px minimum, 4:3 aspect ratio, high quality

## 🎯 Features Implemented

### ✅ Phase 1 Complete

- [x] **High-Impact Landing Page**
  - Full-screen hero with video/image background
  - Clear value proposition
  - Prominent CTA button with glow effect
  - Smooth scroll indicator

- [x] **Service Showcase**
  - 3 glassmorphic service cards
  - Hover effects with animations
  - Icon-based visual hierarchy
  - Modular, easy-to-update structure

- [x] **Visual Gallery**
  - Responsive 3-column grid (adapts to mobile)
  - Lightbox modal with keyboard navigation
  - Image counter and navigation arrows
  - Smooth transitions

- [x] **3D Preview Placeholder**
  - Dedicated card for future 3D features
  - "Coming Soon" badge
  - Animated floating icon

- [x] **Contact & Scheduling**
  - Clean contact form
  - Project type dropdown
  - Form validation with visual feedback
  - Success/error message system
  - Formspree-ready (just add your endpoint)

- [x] **Navigation & UX**
  - Fixed header with glassmorphic effect
  - Smooth scroll to sections
  - Mobile hamburger menu
  - Responsive design for all devices

## 🎨 Customization Guide

### Colors

Edit CSS variables in `style.css`:

```css
:root {
    --color-primary: #1A1A1A;      /* Main background */
    --color-secondary: #00FFFF;    /* Accent color */
    --color-accent: #00D4FF;       /* Secondary accent */
    --color-text-primary: #FFFFFF; /* Main text */
    --color-text-secondary: #CCCCCC; /* Secondary text */
}
```

### Content

1. **Company Name**: Search and replace "SkyView Dynamics" in `index.html`
2. **Services**: Edit the service cards in the `<section class="services">` section
3. **Contact Info**: Update email and phone in the footer and contact section
4. **Social Links**: Update URLs in the footer social links

### Form Integration

To connect the contact form to Formspree:

1. Sign up at [formspree.io](https://formspree.io)
2. Create a new form
3. Copy your form endpoint
4. In `index.html`, replace:
   ```html
   <form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
   ```

Alternatively, use Netlify Forms by adding `netlify` attribute to the form tag.

### Cache-Busting

The site uses version parameters to prevent browser caching issues. When you update CSS or JS files:

**Manual Method:**
1. Generate a new timestamp: `Get-Date -Format "yyyyMMddHHmmss"` (PowerShell)
2. Update version in `index.html`:
   ```html
   <link rel="stylesheet" href="style.css?v=NEW_VERSION">
   <script src="script.js?v=NEW_VERSION"></script>
   ```

**Automated Method:**
```powershell
.\update-version.ps1
```

See `CACHE-BUSTING.md` for detailed instructions.

## 🌐 Deployment Options

### Netlify (Recommended)

1. Push code to GitHub
2. Connect repository to Netlify
3. Deploy automatically
4. Enable Netlify Forms (no backend needed!)

### GitHub Pages

1. Push code to GitHub
2. Go to Settings → Pages
3. Select branch and deploy

### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow prompts

## 📱 Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🎬 Adding Video

For the hero video:

1. Record or source a 10-30 second aerial drone video
2. Convert to MP4 format (H.264 codec recommended)
3. Optimize for web (compress to ~5-10MB)
4. Save as `assets/hero-video.mp4`
5. The video will auto-play, loop, and be muted

Tools for video optimization:
- [HandBrake](https://handbrake.fr/) (Free)
- [FFmpeg](https://ffmpeg.org/) (Command line)
- Online: [CloudConvert](https://cloudconvert.com/)

## 🔧 Technical Stack

- **HTML5**: Semantic structure with SEO best practices
- **CSS3**: Modern features (Grid, Flexbox, Custom Properties, Backdrop Filter)
- **Vanilla JavaScript**: No dependencies, lightweight and fast
- **Google Fonts**: Inter font family

## 📊 Performance

- Lazy loading for images
- Optimized animations with CSS transforms
- Debounced/throttled scroll events
- Minimal JavaScript bundle
- No external dependencies

## 🎯 SEO Features

- Semantic HTML5 structure
- Meta descriptions and title tags
- Proper heading hierarchy (single H1)
- Alt text for all images
- Descriptive link text
- Mobile-friendly responsive design

## 🚀 Future Enhancements (Phase 2+)

- [ ] Interactive 3D model viewer
- [ ] Video portfolio section
- [ ] Client testimonials
- [ ] Blog/news section
- [ ] Booking system integration
- [ ] Multi-language support
- [ ] Advanced animations with GSAP
- [ ] CMS integration (Contentful, Sanity)

## 📝 License

This is a custom website design. Modify as needed for your business.

## 🤝 Support

For questions or customization requests, contact your development team.

---

**Built with ❤️ for SkyView Dynamics**

*Elevate Your Vision*