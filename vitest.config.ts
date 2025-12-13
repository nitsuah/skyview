import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Enable globals for easier testing (e.g., describe, it)
    globals: true,

    // Use happy-dom, primarily for any potential light JS interaction.
    // Consider 'node' if solely focusing on linting/style checks.
    environment: 'happy-dom',

    // Setup for coverage reports - relevant if any JS is present
    coverage: {
      provider: 'v8', // Or 'istanbul'
      reporter: ['text', 'json', 'html'], // Generate text, json, and html reports

      // Define where coverage reports should be outputted
      reportsDirectory: './coverage',

      // Exclude files and directories from coverage reports.  Adjust as needed.
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '.storybook/',
        '.next/',
        // Add any other directories or files that should be excluded.
      ],

      // Coverage thresholds to enforce code coverage standards. Adjust as needed.
      // Since this is primarily a CSS project, coverage may be less relevant,
      // especially if there's minimal JavaScript.  Adjust these values if JavaScript is present.
      thresholds: {
        // TODO: Set appropriate coverage thresholds for your JavaScript code, if any.
        // global: {
        //   statements: 80,
        //   branches: 80,
        //   functions: 80,
        //   lines: 80,
        // },
      },
    },

    // Configuration for CSS-specific testing (e.g., linters).
    // This section is crucial for CSS projects.  You'll need to configure it
    // based on the linters you are using (e.g., stylelint).
    // Example using setupFiles:
    setupFiles: ['./test/setup.ts'],

    // Timeout for each test. Increase if tests are slow.
    timeout: 10000, // 10 seconds

    // Add any transformations or plugins needed for your CSS or JS files.
    // transform: {
    //   '^.+\\.css$': 'path/to/your/css/transformer',
    // },

    // Add any reporters you want to use.
    // reporters: ['default', 'verbose'],
  },
});