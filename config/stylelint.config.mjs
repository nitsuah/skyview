/** @type {import('stylelint').Config} */
export default {
    extends: ['stylelint-config-standard'],
    ignoreFiles: ['node_modules/**', 'dist/**', 'build/**'],
    rules: {
        'selector-class-pattern': [
            '^[a-z][a-zA-Z0-9-]*$',
            {
                message: 'Selector class names should be in kebab-case or camelCase.',
            },
        ],
        'no-descending-specificity': null,
        'declaration-block-no-duplicate-properties': true,
    },
};
