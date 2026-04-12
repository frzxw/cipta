import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

/**
 * Root ESLint flat config for the Cipta monorepo.
 * Enforces strict TypeScript rules across all packages.
 * Sub-packages extend via `@repo/eslint-config` as needed.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  eslintConfigPrettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // Enforce explicit return types on exported functions for strict module boundaries
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      // Enforce explicit member accessibility for class definitions
      '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'explicit' }],
      // Disallow `any` — critical for future Rust/Go interop boundaries
      '@typescript-eslint/no-explicit-any': 'error',
      // Require consistent type imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Require consistent type exports
      '@typescript-eslint/consistent-type-exports': 'error',
      // No floating promises — must be awaited or voided explicitly
      '@typescript-eslint/no-floating-promises': 'error',
      // No misused promises
      '@typescript-eslint/no-misused-promises': 'error',
      // Prefer nullish coalescing
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      // Prefer optional chaining
      '@typescript-eslint/prefer-optional-chain': 'error',
      // Strict boolean expressions
      '@typescript-eslint/strict-boolean-expressions': 'error',
      // No unused vars (ignore prefixed with _)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.next/**',
      'coverage/**',
      '.turbo/**',
      '*.config.mjs',
      '*.config.js',
      '*.config.ts',
    ],
  },
);
