import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['.vite/', 'out/', 'coverage/', 'models/', 'node_modules/', 'docs/'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // Type-aware linting: each file is matched against these projects in
        // order (projectService can't be used here — it only auto-discovers
        // configs literally named tsconfig.json, and this repo splits into
        // renderer/node/test configs). tsconfig.json must come first so src
        // files use it; test files fall through to tsconfig.test.json.
        project: ['./tsconfig.json', './tsconfig.node.json', './tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TODO(lint): zustand actions are plain functions typed as methods on
      // the store; destructuring or selecting them trips this rule everywhere
      // despite being safe to call unbound.
      '@typescript-eslint/unbound-method': 'off',
      // TODO(lint): repositories and stores keep async signatures without
      // awaiting so the localStorage backend can become IPC/async later
      // without an API break (deliberate, see docs/code-review-2026-07.md).
      '@typescript-eslint/require-await': 'off',
      // Async JSX event handlers are safe: React ignores the returned promise.
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },

  // Renderer: browser globals, React hooks rules, accessibility rules.
  {
    ...reactHooks.configs.flat.recommended,
    files: ['src/**/*.{ts,tsx}'],
  },
  {
    ...jsxA11y.flatConfigs.recommended,
    files: ['src/**/*.{ts,tsx}'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Deliberate: DashboardScreen reads Date.now() during render to filter
      // upcoming appointments. Every compliant rewrite freezes the timestamp
      // (per mount or per data change) instead of refreshing on each render,
      // which is a real semantic change — so this stays a visible warning.
      'react-hooks/purity': 'warn',
    },
  },

  // AudioWorklet code runs in the AudioWorkletGlobalScope, not the window.
  {
    files: ['src/lib/speech/whisper/pcm-worklet.js'],
    languageOptions: {
      globals: {
        AudioWorkletProcessor: 'readonly',
        registerProcessor: 'readonly',
        sampleRate: 'readonly',
        currentTime: 'readonly',
        currentFrame: 'readonly',
      },
    },
  },

  // Electron main/preload, build scripts, and root config files: Node globals.
  {
    files: ['electron/**/*.ts', '*.config.{ts,mts}', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Tests: jest globals; relax rules that fight common test idioms.
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test-utils/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.jest },
    },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/only-throw-error': 'off',
    },
  },

  // Plain JS/MJS files can't be type-checked.
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
