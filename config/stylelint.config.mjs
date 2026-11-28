/** @type {import('stylelint').Config} */
export default {
    extends: ['stylelint-config-standard'],
    ignoreFiles: ['node_modules/**', '**/node_modules/**', 'dist/**', '**/dist/**', 'build/**', 'coverage/**', 'playwright-report/**'],
    rules: {
        // BEM (block__element--modifier) and camelCase: these names are referenced
        // from the HTML and JS, so the rule follows the codebase.
        'selector-class-pattern': [
            '^[a-z][a-zA-Z0-9]*(-[a-zA-Z0-9]+)*(__[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*)?(--[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*)?$',
            {
                message: 'Selector class names should be kebab-case, camelCase or BEM.',
            },
        ],
        'keyframes-name-pattern': [
            '^[a-z][a-zA-Z0-9]*(-[a-zA-Z0-9]+)*$',
            {
                message: 'Keyframe names should be kebab-case or camelCase.',
            },
        ],
        // Older Safari needs the -webkit- forms and prefix media queries;
        // the marketing site has no build step to add them back.
        'property-no-vendor-prefix': [true, { ignoreProperties: ['-webkit-background-clip', '-webkit-appearance'] }],
        'media-feature-range-notation': 'prefix',
        // Chrome on macOS has historically matched this font keyword by exact case.
        'value-keyword-case': ['lower', { ignoreKeywords: ['BlinkMacSystemFont'] }],
        'no-descending-specificity': null,
        'declaration-block-no-duplicate-properties': true,
    },
};
