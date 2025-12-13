import stylelint from 'stylelint';
import stylelintConfigStandard from 'stylelint-config-standard';

export default [
  {
    files: ['**/*.css'],
    extends: [
      stylelintConfigStandard,
    ],
    plugins: [
      'stylelint-order'
    ],
    ignoreFiles: ['node_modules/**', 'dist/**', 'build/**'],
    rules: {
      'indentation': 2,
      'max-empty-lines': 1,
      'no-descending-specificity': null,
      'order/properties-alphabetical-order': true,
      'selector-class-pattern': [
        '^[a-z][a-zA-Z0-9]*$',
        {
          message: 'Selector class names should be in camelCase.',
        },
      ],
      'declaration-block-no-duplicate-properties': true,
      'declaration-block-no-shorthand-property-overrides': true,
      'selector-max-id': 0,
    },
  },
];