# Contributing to SkyView Dynamics

Thank you for your interest in contributing to SkyView Dynamics! We welcome contributions to make this drone services site even better.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)

## 🤝 Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Details can be found in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## 🚀 Getting Started

1. **Fork the repository**
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/skyview.git
   cd skyview
   ```

## 🛠️ Development Setup

SkyView Dynamics is a static site built with HTML, CSS, and Vanilla JavaScript.

### Prerequisites

- Node.js (recommended for tools) or Python
- A text editor (VS Code recommended)
- Sharp library (for image optimization): `npm install`

### Running Locally

```bash
# Install dependencies
npm install

# Start dev server
npm run serve
# OR
npx http-server . -p 3000

# Convert images to WebP
npm run optimize:images
```

### Testing

```bash
# Run E2E tests
npm test

# Run unit tests
npx vitest run

# Run with coverage
npx vitest run --coverage
```

## 📝 Coding Standards

- **HTML**: Semantic HTML5 with ARIA labels for accessibility
- **CSS**: Pure CSS with CSS Variables (no preprocessors)
  - Use BEM-like naming conventions
  - Mobile-first responsive design
  - Glassmorphic design system
- **JavaScript**: Vanilla ES6 modules (no frameworks)
  - Use modern features (async/await, destructuring)
  - Feature detection for browser compatibility
  - Document functions with JSDoc comments
- **Images**: 
  - Always optimize with `npm run optimize:images`
  - Use WebP format with JPG/PNG fallbacks
  - Include alt text for accessibility
- **Videos**:
  - Use MP4/MOV formats
  - Add poster images (same name as video, .jpg extension)
  - Include `type: "video"` in gallery.json

## 🎨 Design System

```css
/* Color Palette */
--color-primary: #0a0e27;      /* Dark blue background */
--color-secondary: #00d4ff;    /* Cyan accent */
--color-accent: #ff4444;       /* Red CTA buttons */

/* Typography */
--font-primary: 'Inter', sans-serif;

/* Glassmorphic Effects */
--glass-bg: rgba(255, 255, 255, 0.05);
--glass-blur: blur(10px);
```

## 📁 Project Structure

```
/
├── index.html          # Main page
├── config.js           # Feature flags & settings
├── assets/
│   └── gallery/        # Images and videos
├── scripts/            # ES6 modules
│   ├── main.js         # Entry point
│   ├── gallery-loader-v2.js  # Gallery system
│   └── ...             # Other modules
├── styles/
│   └── style.css       # All styles
├── docs/               # Documentation
└── tests/              # Test files
```

## 🐛 Reporting Bugs

Please include:
- Description of the issue.
- Browser/Device details (important for responsive issues).
- Screenshots if possible.

Thank you for helping build Skyview!
