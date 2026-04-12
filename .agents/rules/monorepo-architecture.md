---
name: monorepo-architecture
description: >
  Load when creating, modifying, or importing code across packages in the Cipta monorepo.
  Enforces strict decoupling rules, import boundaries, and the queue-driven architecture.
  Triggers on: cross-package imports, new module creation, BullMQ usage, Turborepo config.
---

# Monorepo Architecture Rules

## 1. Import Boundary Rules — NEVER VIOLATE

| Source Package | May Import From | MUST NEVER Import From |
|---------------|-----------------|----------------------|
| `apps/web` | `packages/ui`, `packages/shared` | `apps/api`, `apps/worker` |
| `apps/api` | `packages/database`, `packages/shared` | `apps/worker`, `apps/web` |
| `apps/worker` | `packages/database`, `packages/shared` | `apps/api`, `apps/web` |
| `packages/ui` | `packages/shared` (types only) | `apps/*`, `packages/database` |
| `packages/shared` | (none — leaf package) | `apps/*`, `packages/database` |
| `packages/database` | (none — leaf package) | `apps/*`, `packages/shared` |

## 2. Worker Isolation — CRITICAL

- The Worker (`apps/worker`) must have **ZERO NestJS imports**. Never import `@nestjs/*` packages.
- The Worker communicates with the system exclusively via BullMQ job queues and direct Prisma DB access.
- The Worker is designed to be replaceable by a Rust or Go implementation without touching the API or Frontend.
- Worker processors are thin dispatchers. Delegate heavy logic to dedicated service classes.

## 3. Shared Package as API Contract

- `packages/shared` is the **only coupling point** between `apps/api` and `apps/worker`.
- All BullMQ job payloads are defined as TypeScript interfaces in `packages/shared/src/types/jobs.ts`.
- All queue names are defined as constants in `packages/shared/src/constants/queues.ts`.
- Both the API (producer) and Worker (consumer) import from this shared package.
- Never place business logic in `packages/shared` — only types, constants, and pure utility functions.

## 4. Queue-Driven Processing — ALWAYS

- The API **never** processes media directly. Every long-running operation is a BullMQ job.
- The API dispatches jobs and returns immediately. Processing happens asynchronously in the Worker.
- Use the pattern: API Service → `queue.add(jobName, payload)` → Worker Processor → Service.

## 5. Prisma Shared Schema

- The Prisma schema lives exclusively in `packages/database/prisma/schema.prisma`.
- Both `apps/api` and `apps/worker` consume the generated Prisma Client as a dependency.
- Never duplicate or redefine database types — always import from `@cipta/database`.
- Generate the Prisma Client via: `pnpm --filter @cipta/database exec prisma generate`

## 6. NestJS Feature Module Architecture

- `apps/api` organizes code by **feature** (not by technical layer).
- Each domain concept is a self-contained NestJS module: `auth`, `ingestor`, `factory`, `guardian`, `fleet`, `workspace`, `source`, `chunk`, `asset`, `account`, `job`.
- Module structure: `<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts`, `dto/`, `guards/` (if applicable).
- Always use **constructor injection**. Never use property injection.
- Controllers call services only — no business logic in controllers.

## 7. Frontend Architecture

- `apps/web` uses the Next.js App Router with Server Components by default.
- Only add `'use client'` when client-side interactivity is required.
- Route groups: `(auth)` for login/register, `(dashboard)` for the main dashboard.
- Fetch initial data in Server Components. Use React Query for client-side state management.
- Every route must have `loading.tsx` and `error.tsx` boundaries.

## 8. Turborepo

- All pipelines (build, dev, test, lint) are configured in `turbo.json` at the repo root.
- Use `pnpm --filter <package>` for running commands on specific packages.
- Never `cd` into a package directory to run commands — always filter from the root.
