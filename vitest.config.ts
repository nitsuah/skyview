import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'happy-dom',
        include: ['tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        coverage: {
            include: ['scripts/**/*.js'],
            exclude: ['scripts/convert-to-webp.js'], // Node.js build script, not browser code
            reporter: ['text', 'json', 'html'],
        },
    },
});
