import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      'apps/api/src/**/*.spec.ts',
      'apps/api/test/**/*.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'dist/**', '**/*.config.*', '**/*.d.ts', '**/types/**'],
    },
    passWithNoTests: true,
    typecheck: {
      enabled: true,
    },
  },
});
