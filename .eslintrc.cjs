/* eslint-env node */
const createAliasSetting = require('@vue/eslint-config-airbnb/createAliasSetting');

module.exports = {
  'root': true,
  'extends': [
    'plugin:vue/vue3-recommended',
    'eslint:recommended',
    'plugin:import/recommended',
    'plugin:jsdoc/recommended',
  ],
  'rules': {
    // ESLint
    'indent': ['warn', 2, { 'SwitchCase': 1 }],
    'comma-dangle': ['warn', 'always-multiline'],
    'no-unused-vars': ['warn', { 'args': 'none' }],
    'semi': 'warn',
    'quotes': ['warn' , 'single'],

    // Vue
    'vue/multi-word-component-names': 'off',
    'vue/require-default-prop': 'off',
    'vue/max-attributes-per-line': ['warn', { singleline: { max: 4 } }],
    'vue/html-self-closing': ['warn', { html: { void: 'always' } }],

    // Imports
    'import/order': 'warn',

    // JSDoc
    'jsdoc/require-jsdoc': 'off',
    'jsdoc/require-returns': 'off',
    'jsdoc/require-param-description': 'off',
  },
  'globals': {
    '__dirname': 'readonly',
    'process': 'readonly',
    'require': 'readonly',
    'module': 'readonly',
    'Buffer': 'readonly',
  },
  'env': {
    'vue/setup-compiler-macros': true,
  },
  'ignorePatterns': [
    'src/assets/i18n/index.mjs', // "assert" syntax is currently unrecognized
  ],
  'parserOptions': {
    'ecmaVersion': 13,
  },
  settings: {
    ...createAliasSetting({
      '@': './src',
    }),
  },
};
