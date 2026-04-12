import tseslint from 'typescript-eslint';
import globals from 'globals';
import { config as baseConfig } from './base.js';

/**
 * A custom ESLint configuration for libraries that use NestJS.
 *
 * @type {import("eslint").Linter.Config[]} */
export const nestJsConfig = [
  ...baseConfig,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module',
    },
  },
  {
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off', // Optional: 'error' if strict
    },
  },
];
