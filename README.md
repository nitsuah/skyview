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

```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx serve

# Option 3: VS Code Live Server extension
```

Then open: http://localhost:8000

### Direct File Opening

Simply open `index.html` in your browser (some features like video may not work without a server).

## 🎯 Customization

### Update Company Info

In `index.html`, find and replace:
- `SkyView Dynamics` → Your company name
- `contact@skyviewdynamics.com` → Your email
- `+1 (555) 123-4567` → Your phone

### Update Images

- **Hero Background**: Replace `assets/hero-bg.jpg` (1920x1080px+)
- **Gallery Images**: Replace `assets/gallery/image1-6.jpg` (1200x900px recommended)
- **Hero Video** (Optional): Add `assets/hero-video.mp4` (MP4, 1920x1080px, 10-30s loop)

### Connect Contact Form

**Option A: Formspree**
1. Sign up at [formspree.io](https://formspree.io)
2. Create a form and get your ID
3. In `index.html`, replace `YOUR_FORM_ID` in the form action

**Option B: Netlify Forms**
Add `netlify` attribute to the form tag and deploy to Netlify

### Cache-Busting

When you update CSS or JS, change the version parameter:

```html
<link rel="stylesheet" href="style.css?v=20241211225000">
<script src="scripts/main.js?v=20241211225000"></script>
```

Use current timestamp (format: YYYYMMDDHHMMSS)

## 📋 Pre-Launch Checklist

- [ ] Replace placeholder images
- [ ] Update company info
- [ ] Configure contact form
- [ ] Update social media links
- [ ] Test on mobile devices
- [ ] Update version parameters

## 🌐 Deployment

### Netlify (Recommended - Easiest)

**No build process needed!** Just push and deploy:

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Netlify:**
   - Go to [netlify.com](https://netlify.com) and sign up/login
   - Click "Add new site" → "Import an existing project"
   - Choose "Deploy with GitHub"
   - Select your `skyview` repository
   - **Build settings:** Leave empty (no build needed!)
   - Click "Deploy site"

3. **Done!** Your site will be live at `your-site-name.netlify.app`

**Optional Enhancements:**
- **Custom Domain:** Site settings → Domain management
- **Netlify Forms:** Already configured! Form submissions will appear in Netlify dashboard
- **HTTPS:** Enabled automatically

### Vercel
```bash
npm i -g vercel
vercel
```

### GitHub Pages
1. Push to GitHub
2. Settings → Pages → Deploy

## 🆘 Troubleshooting

**Images not showing?** Use a local server and hard refresh (Ctrl+Shift+R)

**Video not playing?** Add MP4 file and use local server

**Form not working?** Replace `YOUR_FORM_ID` in form action

**Styles broken?** Clear cache or update version parameters

## 🔧 Technical Stack

- **HTML5**: Semantic structure with SEO best practices
- **CSS3**: Modern features (Grid, Flexbox, Custom Properties, Backdrop Filter)
- **Vanilla JavaScript**: Modular ES6 modules, no dependencies
- **Google Fonts**: Inter font family

## 📊 Performance

- Lazy loading for images
- Throttled scroll events
- Minimal JavaScript bundle
- No external dependencies

## 🎯 Features

- ✅ Full-screen hero with parallax
- ✅ Glassmorphic service cards
- ✅ Responsive gallery with lightbox
- ✅ Contact form with validation
- ✅ Mobile hamburger menu
- ✅ Smooth scroll navigation

---

**Built with ❤️ for SkyView Dynamics**

*Elevate Your Vision*