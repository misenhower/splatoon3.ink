import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import pluginJsdoc from 'eslint-plugin-jsdoc';
import importAlias from '@dword-design/eslint-plugin-import-alias';
import globals from 'globals';

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  pluginJsdoc.configs['flat/recommended'],

  // Global settings
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // ESLint
      'indent': ['warn', 2, { 'SwitchCase': 1 }],
      'comma-dangle': ['warn', 'always-multiline'],
      'no-unused-vars': ['warn', { 'args': 'none' }],
      'semi': 'warn',
      'quotes': ['warn', 'single'],
      'object-curly-spacing': ['warn', 'always'],

      // Vue
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
      'vue/max-attributes-per-line': ['warn', { singleline: { max: 4 } }],
      'vue/html-self-closing': ['warn', { html: { void: 'always' } }],

      // JSDoc
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/require-param-description': 'off',
    },
  },

  // Import alias for src files
  {
    files: ['src/**'],
    plugins: {
      '@dword-design/import-alias': importAlias.configs.recommended.plugins['@dword-design/import-alias'],
    },
    rules: {
      '@dword-design/import-alias/prefer-alias': ['warn', { 'alias': {
        '@': './src',
      } }],
    },
  },

  // Ignored files
  {
    ignores: [
      'dist/**',
      'src/assets/i18n/index.mjs',
    ],
  },
];
