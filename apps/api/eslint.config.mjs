// @ts-check
import { nestJsConfig } from '@cipta/eslint-config/nestjs';

export default [
  {
    ignores: ['eslint.config.mjs'],
  },
  ...nestJsConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
