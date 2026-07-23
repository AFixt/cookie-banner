import js from '@eslint/js';
import globals from 'globals';
import sonarjs from 'eslint-plugin-sonarjs';
import security from 'eslint-plugin-security';
import unicorn from 'eslint-plugin-unicorn';
import { importX } from 'eslint-plugin-import-x';
import promise from 'eslint-plugin-promise';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import noSecrets from 'eslint-plugin-no-secrets';

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  sonarjs.configs.recommended,
  promise.configs['flat/recommended'],
  importX.flatConfigs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.jest,
      },
    },
    plugins: {
      'no-secrets': noSecrets,
    },
    rules: {
      // Code quality
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-prototype-builtins': 'warn',
      'no-setter-return': 'warn',

      // Security
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-secrets/no-secrets': ['error', { tolerance: 4.5 }],

      // Best practices
      eqeqeq: ['error', 'always'],
      curly: ['warn', 'all'],

      // Import hygiene (resolution is exercised by Jest and Rollup; the
      // lint-time resolver does not understand explicit .js ESM specifiers)
      'import-x/no-unresolved': 'off',
      'import-x/order': ['warn', { 'newlines-between': 'ignore' }],

      // sonarjs adjustments: duplication is enforced by jscpd with thresholds,
      // and the cognitive-complexity budget mirrors the complexity rule below
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/no-duplicate-string': 'off',

      // The library returns its promise chains to the caller; the final
      // then() legitimately produces no value.
      'promise/always-return': ['error', { ignoreLastCallback: true }],
    },
  },
  {
    // Test-suite pragmatics: the Playwright visual tests wait on fixed
    // timers for render stability by design, and consolidating similar
    // cases into parameterized tests is a style choice, not a defect.
    files: ['test/**/*.js'],
    rules: {
      'sonarjs/no-fixed-wait-in-tests': 'off',
      'sonarjs/parameterized-tests': 'off',
      'sonarjs/todo-tag': 'warn',
    },
  },
  {
    // Source-only rules: the published library code is held to a stricter
    // bar than tests and config (see #62/#69).
    files: ['src/**/*.js'],
    plugins: {
      security,
      unicorn,
      jsdoc: jsdocPlugin,
    },
    rules: {
      // Size and complexity limits (see #62/#69). Source only — test files
      // legitimately hold long describe blocks and fixture-heavy functions.
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 75, skipBlankLines: true, skipComments: true }],
      complexity: ['error', 10],
      'max-depth': ['error', 4],
      'max-params': ['error', 4],
      'max-nested-callbacks': ['error', 3],

      // Node/browser security smells
      ...security.configs.recommended.rules,
      // The blocker modules match cookie names against fixed pattern tables;
      // there is no user-controlled RegExp construction.
      'security/detect-non-literal-regexp': 'off',
      'security/detect-object-injection': 'off',

      // Modern JS patterns — targeted subset; the full unicorn preset is too
      // opinionated for this codebase (abbreviations, null usage, etc.)
      'unicorn/prefer-query-selector': 'warn',
      'unicorn/prefer-add-event-listener': 'error',
      'unicorn/no-array-for-each': 'off',
      'unicorn/prefer-modern-dom-apis': 'warn',
      'unicorn/no-document-cookie': 'off', // cookie interception is the product
      'unicorn/explicit-length-check': 'off',

      // Documentation: every exported/public function keeps meaningful JSDoc
      ...jsdocPlugin.configs['flat/recommended'].rules,
      'jsdoc/require-jsdoc': [
        'warn',
        { publicOnly: false, require: { FunctionDeclaration: true } },
      ],
      'jsdoc/require-param-description': 'warn',
      'jsdoc/require-returns-description': 'warn',
      'jsdoc/tag-lines': 'off',
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.min.js',
      'docs/**',
      'reports/**',
      'playwright-visual-report/**',
    ],
  },
];
