module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off', // Allow console for debugging
    'no-debugger': 'warn',
    'prefer-const': 'warn',
    'no-var': 'error',
  },
  globals: {
    // Playwright test globals
    test: 'readonly',
    expect: 'readonly',
    page: 'readonly',
    browser: 'readonly',
    context: 'readonly',
  },
};