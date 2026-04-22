# CLAUDE.md

Guidance for Claude Code in this repo.

## What is Cipta

AI platform. Automated social-video production + distribution. Spec-driven. Pre-implementation phase.

## Stack

- Monorepo: pnpm@9 workspaces + Turborepo
- Node: 22 LTS (engines `>=18`)
- API: NestJS 11 (`apps/api`) — REST + Swagger + BullMQ + Passport/JWT
- Web: Next.js 16 App Router + React 19 + Tailwind v4 + ShadcnUI (`apps/web`)
- Docs site: Next.js (`apps/docs`)
- Worker: Node.js + BullMQ (`apps/worker`) — **planned, not scaffolded**
- DB: PostgreSQL 16 + Prisma 6 (`packages/database`)
- Broker: Redis 7 + BullMQ
- Shared: `packages/shared` (types, constants, enums), `packages/ui`, `packages/eslint-config`, `packages/typescript-config`

## SSoT

`docs/` is the single source of truth. Read relevant doc before touching code.

- Start: `docs/README.md`
- Core: `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/ERD.md`, `docs/PRD.md`, `docs/DESIGN.md`
- Module specs: `docs/specs/{INGESTOR,FACTORY,GUARDIAN,FLEET,WORKER,AUTH}.md`
- Standards: `docs/TESTING.md`, `docs/SECURITY.md`, `docs/OBSERVABILITY.md`, `docs/CONFIG.md`, `docs/INFRASTRUCTURE.md`
- Runbooks: `docs/runbooks/*.md`

If code ≠ spec: spec wins. Flag mismatch, propose fix — no silent divergence.

## Agent rules (MUST)

`.agents/` is operating root. Load order per task:

1. `.agents/rules/core-conventions.md` (every task)
2. Task-specific rule in `.agents/rules/*.md` (api-contracts, database-schema, frontend-conventions, worker-constraints, monorepo-architecture, security-standards, observability-standards, testing-standards, centralized-scripts)
3. Matching `docs/specs/*.md` for module behavior
4. Matching `docs/runbooks/*.md` for ops

Skills in `.agents/skills/**/SKILL.md`. Workflows in `.agents/workflows/*.md` — use them for scaffolding, migrations, PR prep.

## Centralized scripts (MUST use — no ad-hoc chains)

```bash
bash scripts/verify.sh [all|ci|lint|types|test|build|format|format:check|prisma]
bash scripts/branch.sh <issue-number> ["title"]   # outputs branch + "Closes #N"
bash scripts/spec.sh <doc> [section]              # ≤60 lines, never cat full specs
```

Prohibited: `pnpm lint && pnpm check-types && pnpm test`, manual `git checkout -b`, `cat docs/specs/*.md`.

## Commands

Root (Turborepo):

```bash
pnpm dev            # all apps
pnpm build
pnpm lint           # strict: --max-warnings 0 on web/docs/ui
pnpm check-types
pnpm format
pnpm test           # vitest
pnpm test:e2e       # playwright
```

Filtered:

```bash
pnpm --filter api dev
pnpm --filter api test
pnpm --filter api test:e2e
pnpm --filter web dev
pnpm --filter @cipta/database db:generate
pnpm --filter @cipta/database db:migrate:dev --name <name>
pnpm --filter @cipta/database db:studio
```

Infra:

```bash
docker compose up -d    # postgres:5432 + redis:6379
```

## Ports

- `apps/web`: 3000
- `apps/api`: 3001 (Swagger at `/v1/docs`, JSON at `/v1/docs-json`)
- `apps/docs`: 3001 per rules (dev-time conflict possible — check when running both)
- Prisma Studio: 5555
- Bull Board: `apps/api` at `/admin/queues`

## Architecture boundaries (HARD)

- `apps/web` → never imports `apps/api` or `apps/worker`
- `apps/api` → never imports `apps/worker`
- `apps/worker` → never imports `apps/api`, zero NestJS imports (must stay replaceable)
- API ↔ Worker: BullMQ only. Shared job payload types via `@cipta/shared/types/jobs`
- API/Worker ↔ DB: `@cipta/database` (Prisma client). Never edit `packages/database/src/generated/**`
- Workspace-scoped multi-tenancy: every query MUST filter by `workspaceId`

## API code organization

- Domain/business logic → `apps/api/src/modules/**` (one feature module per domain)
- Cross-cutting reusable only → `apps/api/src/common/**` (response envelope, DTO normalizers, global guards/interceptors/filters/pipes, logging/error/pagination/request-context helpers)
- Current modules: `auth/`, `ingestor/`, `workspace/`. Planned: `factory`, `guardian`, `fleet`, `chunk`, `asset`, `account`, `job`

## NestJS rules

- Feature-module architecture. Constructor injection only.
- DTOs with `class-validator` for all inputs. No business logic in controllers.
- Endpoint add/change → Swagger stays accurate at `/v1/docs` + `/v1/docs-json`
- Preserve decorator metadata (shared tsconfig in `apps/api/tsconfig.json`)

## Next.js rules (`apps/web`)

- Server Components by default. `'use client'` only when needed.
- Fetch in Server Components for initial data.
- Every route: `loading.tsx` + `error.tsx`.
- Use ShadcnUI primitives from `@cipta/ui` — no custom primitives unless missing.

## Worker rules (`apps/worker`, planned)

- Zero NestJS imports. Standalone Node.
- Thin processors, heavy logic in services.
- Always `job.updateProgress(%)` + DB status transitions.
- Catch all errors → `Job.error` field.

## TypeScript rules

- `strict: true` everywhere. No `any` — use `unknown` + narrow.
- No `as` unless unavoidable; document inline why.
- `interface` for shapes, `type` for unions/intersections. Use `satisfies`.
- Prisma enums = TS enums exactly.

## Domain vocabulary (use exactly, no synonyms)

Source · Transcript · Viral Spike · Chunk · Asset · Variation · Cluster · Render Profile · Distribution Rule · Ingestor · Factory · Guardian · Fleet · Worker · Orchestrator · Control Tower.

## Git + PRs

- Branches: `feat/<slug>`, `fix/<slug>`, `docs/<slug>`, `refactor/<slug>` → merge into `develop`. `develop` → `main` via release PR.
- Current branch: `develop`. PRs `--base develop` + `--body-file`.
- Conventional Commits: `<type>(<scope>): <desc>`
  - types: feat, fix, docs, refactor, test, chore, perf, style
  - scopes: api, web, worker, database, shared, ui, docs, infra
- PR desc: reference spec/feature (`Implements F-001 (PRD.md)`). Footer `Closes #N` from `branch.sh`.
- No `--no-verify`, no force-push to `main`/`develop`, no amending published commits.

## Workflow protocol

1. Build Context Pack (scope, rules, docs, code refs) before editing
2. Plan scoped to affected files
3. Minimal reversible edit
4. Verify: `bash scripts/verify.sh <step>` — smallest meaningful first
5. Report: changed files, commands run, residual risk

Don't touch unrelated files. Don't claim success without verification evidence. State blocker + safe next command if verify can't run.

## Doc sync

Behavior/API/schema change → check impact on: `docs/API.md`, `docs/ERD.md`, `docs/ARCHITECTURE.md`, `docs/CONFIG.md`, `docs/TESTING.md`, relevant `docs/specs/*.md`. If deferred, list files + reason in report.

## Library docs

Use `ctx7` CLI (per global rule) before answering questions about any library/framework/SDK/API. Don't fall back to training data silently.

## Caveman mode

`.agents/skills/caveman/SKILL.md`. Chat style only — code, commits, PRs stay normal.
