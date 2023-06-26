/* eslint-env node */
module.exports = {
  "root": true,
  "extends": [
    "plugin:vue/vue3-recommended",
    "eslint:recommended",
  ],
  "rules": {
    // ESLint
    "indent": ["warn", 2, { "SwitchCase": 1 }],
    "comma-dangle": ["warn", "always-multiline"],

    // Vue
    "vue/multi-word-component-names": "off",
    "vue/require-default-prop": "off",
    "vue/max-attributes-per-line": ["warn", { singleline: { max: 4 } }],
    "vue/html-self-closing": ["warn", { html: { void: "always" } }],
  },
  "globals": {
    "__dirname": "readonly",
    "process": "readonly",
    "require": "readonly",
    "module": "readonly",
  },
  "env": {
    "vue/setup-compiler-macros": true,
  },
  "parserOptions": {
    "ecmaVersion": 13,
  },
}
