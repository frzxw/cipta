# Project Guidelines

## Workspace Overview
- This repository is a pnpm + Turborepo monorepo.
- Apps:
  - `apps/api`: NestJS backend.
  - `apps/web`: Next.js frontend (port 3000).
  - `apps/docs`: Next.js docs site (port 3001).
- Shared packages:
  - `packages/ui`: shared React UI components (`@repo/ui`).
  - `packages/eslint-config`: shared ESLint configs.
  - `packages/typescript-config`: shared tsconfig presets.

## Build and Test
- Use pnpm only (workspace is configured for pnpm workspaces).
- Root commands:
  - `pnpm dev`
  - `pnpm build`
  - `pnpm lint`
  - `pnpm check-types`
  - `pnpm format`
- Target one project with Turborepo filters, for example:
  - `pnpm turbo run dev --filter=web`
  - `pnpm turbo run build --filter=api`
  - `pnpm turbo run test --filter=api`

## Code and Tooling Conventions
- Node version is `>=18`.
- Keep changes scoped to the affected app/package; avoid cross-package refactors unless requested.
- Respect shared configs before adding local overrides:
  - ESLint defaults come from `packages/eslint-config`.
  - TypeScript defaults come from `packages/typescript-config`.
- Lint is strict for web/docs/ui (`--max-warnings 0`), so warnings should be treated as failures.
- API uses NestJS decorators and emits metadata; preserve decorator-related tsconfig settings in `apps/api`.

## Common Pitfalls
- Do not use npm/yarn commands for install or script execution in this repo.
- The web and docs apps have fixed default dev ports (3000 and 3001).
- Turborepo task dependencies (`^build`, `^lint`, `^check-types`) can cause downstream failures if an upstream package is broken.

## Link to Existing Docs
- Root overview and Turborepo starter notes: `README.md`
- API app notes and test commands: `apps/api/README.md`
- Web app notes: `apps/web/README.md`
- Docs app notes: `apps/docs/README.md`
