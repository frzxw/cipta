# Project Guidelines

## Workspace Overview

- This repository is a pnpm + Turborepo monorepo.
- Active apps in this workspace:
  - `apps/api` (NestJS backend)
  - `apps/web` (Next.js app, port 3000)
  - `apps/docs` (Next.js docs app, port 3001)
- Shared packages used now:
  - `packages/ui`
  - `packages/eslint-config`
  - `packages/typescript-config`

## Build and Test

- Use pnpm only (`pnpm@9`, workspaces enabled).
- Root commands:
  - `pnpm dev`
  - `pnpm build`
  - `pnpm lint`
  - `pnpm check-types`
  - `pnpm format`
- Targeted runs:
  - `pnpm turbo run dev --filter=web`
  - `pnpm turbo run build --filter=api`
  - `pnpm --filter api test`
  - `pnpm --filter api test:e2e`

## Architecture and Boundaries

- Keep changes scoped to the affected app/package; avoid cross-package refactors unless requested.
- Respect shared configuration packages before adding local overrides:
  - `packages/eslint-config`
  - `packages/typescript-config`
- Preserve NestJS decorator metadata settings in `apps/api/tsconfig.json`.
- Treat `docs/ARCHITECTURE.md` as the intended target architecture. Some documented modules/packages (for example worker/database modules) may be planned and not fully scaffolded yet.

## Conventions and Pitfalls

- Node engine is `>=18` (docs currently recommend Node 22 LTS for local setup).
- Lint is strict for web/docs/ui (`--max-warnings 0`), so warnings should be treated as failures.
- Do not use npm/yarn commands for install or scripts in this repo.
- `apps/api` dev server and `apps/docs` dev server both default to port 3001; avoid running both on the same port simultaneously.
- Turborepo task dependencies (`^build`, `^lint`, `^check-types`) can fail downstream tasks when an upstream package is broken.

## Link to Existing Docs

- Primary docs index: `docs/README.md`
- Architecture: `docs/ARCHITECTURE.md`
- Contributing and local setup: `docs/CONTRIBUTING.md`
- Testing strategy: `docs/TESTING.md`
- API contract: `docs/API.md`
- Configuration: `docs/CONFIG.md`
- Security: `docs/SECURITY.md`
- Ops runbooks: `docs/runbooks/README.md`
