import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'happy-dom',
        include: ['tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        coverage: {
            include: ['scripts/**/*.js'],
            exclude: [
                'scripts/convert-to-webp.js', // Node.js build script, not browser code
                'scripts/conversion-tracking.js', // Better validated through integration flows
                'scripts/drone-cursor.js', // Visual polish validated via browser behavior
                'scripts/form.js', // Form flow covered in integration/e2e checks
                'scripts/gallery-loader-v2.js', // Runtime DOM-heavy module covered via browser tests
                'scripts/interactive-polish.js', // Visual polish validated via browser behavior
                'scripts/gallery.js', // Lightbox interaction tested via browser behavior
                'scripts/parallax.js', // Motion effect validated via browser behavior
                'scripts/performance-monitor.js', // Dev-only diagnostics
                'scripts/scroll-effects.js', // Scroll animation helpers validated via E2E/manual checks
                'scripts/webp-loader.js' // Browser capability branch behavior validated in runtime tests
            ],
            reporter: ['text', 'json', 'html'],
        },
    },
});
