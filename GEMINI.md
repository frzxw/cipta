# GEMINI.md

Guidance for Gemini operations within the Cipta repository.

## 1) Project Overview: Cipta

AI platform for automated social-video production and distribution. Spec-driven. Currently in the pre-implementation phase.

### The Stack

- **Monorepo:** pnpm@9 workspaces + Turborepo
- **Runtime:** Node 22 LTS (engines `>=18`)
- **API:** NestJS 11 (`apps/api`) — REST, Swagger, BullMQ, Passport/JWT
- **Web:** Next.js 16 App Router, React 19, Tailwind v4, ShadcnUI (`apps/web`)
- **Docs Site:** Next.js (`apps/docs`)
- **Worker (Planned):** Node.js + BullMQ (`apps/worker`) — _not scaffolded yet_
- **Database:** PostgreSQL 16 + Prisma 6 (`packages/database`)
- **Broker:** Redis 7 + BullMQ
- **Shared Packages:** `packages/shared` (types, constants, enums), `packages/ui`, `packages/eslint-config`, `packages/typescript-config`

---

## 2) Single Source of Truth (SSoT) & Knowledge Root

`docs/` is the strict single source of truth for engineering and product intent. `.agents/` is the agentic knowledge root for rules, skills, and workflows.

**Mandatory Reading Order Before Execution:**

1. `docs/README.md`
2. `.agents/rules/core-conventions.md` (applies to every task)
3. Task-specific rules in `.agents/rules/*.md`
4. Document directly related to the requested change (e.g., `docs/specs/*.md` for module behavior, `docs/runbooks/*.md` for operations)
5. Core architectural docs (`ARCHITECTURE.md`, `API.md`, `ERD.md`, `PRD.md`, `DESIGN.md`)

### Source Priority and Conflict Resolution

If sources disagree, resolve conflicts in this order (1 being highest):

1. Current user request.
2. `.agents/rules/*.md` (most specific first).
3. `docs/specs/*.md` for module behavior.
4. Core docs (`API.md`, `ERD.md`, `ARCHITECTURE.md`, `CONFIG.md`, `TESTING.md`).
5. Existing code as implementation evidence.

**Crucial:** If code differs from the spec, the spec wins. Mark the mismatch explicitly and propose a corrective direction. Never silently overwrite authoritative intent with inferred behavior.

---

## 3) Pre-Execution Protocol

### Docs/Context Pack (Required)

Before making edits to code or documentation, build a Context Pack. Do not edit until the pack is complete unless explicitly asked for a fast draft.
A complete pack MUST contain:

- Change objective and audience.
- Canonical source docs to trust.
- Impacted sibling docs and backlinks.
- Code/schema/API artifacts used as evidence.

### Workflow Protocol

1. **Context:** Build Context Pack (scope, rules, docs, code refs).
2. **Plan:** Scope changes to affected files only. Do not touch unrelated files.
3. **Execute:** Make minimal, reversible edits.
4. **Verify:** Use `bash scripts/verify.sh <step>`. Run the smallest meaningful check first.
5. **Report:** Detail changed files, commands run, and any residual risk. State blockers and safe next commands if verification fails.

---

## 4) Architecture Boundaries (HARD RULES)

- **`apps/web`**: NEVER imports `apps/api` or `apps/worker`.
- **`apps/api`**: NEVER imports `apps/worker`.
- **`apps/worker`**: NEVER imports `apps/api`. Zero NestJS imports (must remain replaceable).
- **Communication:** API ↔ Worker via BullMQ only. Share job payload types via `@cipta/shared/types/jobs`.
- **Database Access:** API/Worker ↔ DB via `@cipta/database` (Prisma client). NEVER manually edit `packages/database/src/generated/**`.
- **Multi-tenancy:** Every query MUST filter by `workspaceId` (Workspace-scoped).

---

## 5) Coding Standards

### NestJS Rules (`apps/api`)

- **Structure:** Domain/business logic lives in `apps/api/src/modules/**` (one feature module per domain: `auth/`, `ingestor/`, `workspace/`).
- **Common Logic:** `apps/api/src/common/**` is strictly for cross-cutting reusable concerns (response envelopes, DTO normalizers, global guards/interceptors/filters/pipes, logging/error/pagination utilities).
- **Injection:** Constructor injection only.
- **Validation:** Use `class-validator` in DTOs for all inputs. No business logic in controllers.
- **Swagger:** Endpoint additions/changes must keep Swagger accurate at `/v1/docs` and `/v1/docs-json`. Preserve decorator metadata.

### Next.js Rules (`apps/web`)

- Server Components by default. Use `'use client'` strictly when needed.
- Fetch in Server Components for initial data.
- Include `loading.tsx` and `error.tsx` in every route.
- Use ShadcnUI primitives from `@cipta/ui`. No custom primitives unless the component is missing.

### Worker Rules (`apps/worker` - Planned)

- Standalone Node.js. No NestJS imports.
- Thin processors; keep heavy logic in services.
- Always use `job.updateProgress(%)` and database status transitions.
- Catch all errors and pipe to a `Job.error` field.

### TypeScript Rules

- `strict: true` everywhere.
- No `any` — use `unknown` and narrow the type.
- Avoid `as` assertions unless unavoidable (must document inline why).
- Use `interface` for shapes; use `type` for unions/intersections. Utilize `satisfies`.
- Prisma enums must exactly match TS enums.

---

## 6) Operations & Commands

### Centralized Scripts (MUST USE - No Ad-Hoc Chains)

Prohibited: Manual chains like `pnpm lint && pnpm check-types && pnpm test`, manual `git checkout -b`, or `cat docs/specs/*.md`.

```bash
bash scripts/verify.sh [all|ci|lint|types|test|build|format|format:check|prisma]
bash scripts/branch.sh <issue-number> ["title"]   # Outputs branch + "Closes #N"
bash scripts/spec.sh <doc> [section]              # ≤60 lines, never cat full specs
```

### Turborepo Commands

```bash
pnpm dev            # Starts all apps
pnpm build
pnpm lint           # Strict: --max-warnings 0 on web/docs/ui
pnpm check-types
pnpm format
pnpm test           # Vitest
pnpm test:e2e       # Playwright
```

### Filtered Commands

```bash
pnpm --filter api dev
pnpm --filter api test
pnpm --filter api test:e2e
pnpm --filter web dev
pnpm --filter @cipta/database db:generate
pnpm --filter @cipta/database db:migrate:dev --name <name>
pnpm --filter @cipta/database db:studio
```

### Infrastructure

```bash
docker compose up -d    # postgres:5432 + redis:6379
```

### Ports

- `apps/web`: 3000
- `apps/api`: 3001
- `apps/docs`: 3001 (Check for dev-time conflicts)
- Prisma Studio: 5555
- Bull Board: `apps/api` at `/admin/queues`

---

## 7) Documentation Engineering & Integrity

### Editing Rules

- Prefer surgical edits over broad rewrites. Preserve structure unless a restructure is requested.
- Update cross-references when moving/renaming. Use links to canonical docs instead of duplicating content.
- Keep examples consistent with real workspace commands (pnpm + turbo).
- Do not add undocumented assumptions as facts. Mark unknowns as open questions/TODOs with clear owners.
- Every normative statement MUST map to at least one source reference.
- For behavior changes, state the effect, scope, and constraints clearly. Do not blur roadmap vs. current state.

### Cross-Doc Synchronization

After modifying code or docs, verify if siblings require updates:

- **API changes** -> `docs/API.md`, Swagger config, related module specs.
- **Schema changes** -> `docs/ERD.md`, `docs/CONFIG.md`, module specs.
- **Arch changes** -> `docs/ARCHITECTURE.md`, impacted specs, runbooks.
- **Ops changes** -> relevant runbooks.
  _If syncs are deferred, list exact files and the reason in your final output._

---

## 8) Domain Vocabulary

Use these exact terms. Do not use synonyms:
Source · Transcript · Viral Spike · Chunk · Asset · Variation · Cluster · Render Profile · Distribution Rule · Ingestor · Factory · Guardian · Fleet · Worker · Orchestrator · Control Tower.

---

## 9) Git & PR Standards

- **Branches:** Format as `type/<slug>`. Types: `feat`, `fix`, `docs`, `refactor`.
- **Flow:** Merge branches into `develop`. `develop` merges into `main` via release PR.
- **Target:** Always base PRs on `develop` (`--base develop` + `--body-file`).
- **Commits:** Conventional Commits required (`<type>(<scope>): <desc>`). Scopes: `api`, `web`, `worker`, `database`, `shared`, `ui`, `docs`, `infra`.
- **PR Description:** Must reference spec/feature (e.g., `Implements F-001 (PRD.md)`). Footer must contain `Closes #N` from `branch.sh`.
- **Restrictions:** No `--no-verify`, no force-pushing to `main`/`develop`, no amending published commits.

---

## 10) Special Capabilities

- **Library Knowledge:** Use the `ctx7` CLI (per global rule) before answering questions about any external library, framework, SDK, or API. Do not silently fall back to training data.
- **Caveman Mode:** Refer to `.agents/skills/caveman/SKILL.md`. Applies to chat style only—code, commits, and PRs must remain standard.

---

## 11) Final Output Expectations

For all tasks, your final response MUST summarize:

- What changed.
- Why the change was necessary.
- Which sources were used.
- What remains uncertain or unresolved.
- Any suggested follow-up docs to update (never claim full alignment unless a cross-doc sync check is entirely complete).
