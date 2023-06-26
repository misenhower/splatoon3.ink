/* eslint-env node */
module.exports = {
  "root": true,
  "extends": [
    "plugin:vue/vue3-essential",
    "eslint:recommended",
  ],
  "rules": {
    // ESLint
    "indent": ["warn", 2, { "SwitchCase": 1 }],
    "comma-dangle": ["warn", "always-multiline"],

    // Vue
    "vue/multi-word-component-names": "off",
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
