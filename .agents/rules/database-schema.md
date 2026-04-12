---
name: database-schema
description: >
  Load when writing Prisma schema changes, database queries, migrations, or any code that
  interacts with the database. Enforces workspace scoping, UUID conventions, status enums,
  and the canonical schema structure. Triggers on: Prisma usage, SQL queries, migration
  creation, DB-related service methods, workspaceId handling.
---

# Database Schema Rules

## 1. ORM & Database

- Always use **Prisma** as the ORM. The schema lives in `packages/database/prisma/schema.prisma`.
- Database engine is **PostgreSQL 16+**.
- The Prisma Client is generated into `packages/database/src/generated/client`.
- Re-export types from `packages/database/src/index.ts`.

## 2. UUID Primary Keys — ALWAYS

- All tables use `String @id @default(uuid()) @db.Uuid` for primary keys.
- Never use auto-incrementing integers.
- Rationale: safe for distributed systems, no info leakage, merge-friendly.

## 3. Workspace-Level Multi-Tenancy — CRITICAL

- **EVERY** data table (except `User`) includes a `workspaceId` foreign key with a corresponding index.
- **EVERY** database query **MUST** include `workspaceId` filtering.
- Enforce at three levels:
  1. **Service level**: all methods receive and use `workspaceId`.
  2. **Guard level**: verify workspace membership before the controller.
  3. **Prisma middleware (safety net)**: log warnings if `workspaceId` is missing.
- Never write a query that returns data across workspaces.

## 4. Status Enums

Always use the following status flow for processing entities:

```
Source:       PENDING → DOWNLOADING → DOWNLOADED → TRANSCRIBING → ANALYZING → READY | FAILED
Transcript:   PENDING → PROCESSING → COMPLETED | FAILED
Chunk:        PENDING → EXTRACTING → READY | FAILED
Asset:        PENDING → RENDERING → RENDERED | FAILED
Variation:    PENDING → PROCESSING → READY | FAILED
Distribution: SCHEDULED → PUBLISHING → PUBLISHED | FAILED | CANCELLED
Job:          QUEUED → ACTIVE → COMPLETED | FAILED | STALLED
```

Any stage can transition to `FAILED` from any active state.

## 5. JSON Columns

- `captionStyle`, `brollConfig`, `frameConfig`, `guardianParams`, `scheduleConfig`, `credentials`, `settings`, `metadata`, `words` use `Json` columns.
- These are configuration blobs. Validate their shapes at the application layer (zod or class-validator), not in the schema.
- Never store secrets in JSON columns unless AES-256-GCM encrypted.

## 6. Index Strategy

Always create indexes on:
- All `workspaceId` columns (multi-tenancy filter).
- Compound indexes on `(workspaceId, status)` for dashboard queries.
- `scheduledAt` for distribution scheduling queries.
- Unique constraints on business-logic uniqueness: `email`, `slug`, `md5Hash`, `(workspaceId, platform, platformAccountId)`.

## 7. Migration Rules

- Generate migrations via: `pnpm --filter @cipta/database exec prisma migrate dev --name <descriptive_name>`
- Apply in production: `pnpm --filter @cipta/database exec prisma migrate deploy`
- Migration naming: `YYYYMMDDHHMMSS_<descriptive_name>` (e.g., `20260411_init_core_schema`)
- After any schema change, regenerate: `pnpm --filter @cipta/database exec prisma generate`

## 8. SQL Safety

- Prisma parameterizes all queries by default — prefer Prisma methods over raw SQL.
- If raw SQL is needed, **always** use `$queryRaw` with tagged template literals (parameterized).
- **NEVER** use `$queryRawUnsafe` with string interpolation.

## 9. Canonical Entities

The database contains these models:
`User`, `Workspace`, `WorkspaceMember`, `Project`, `Source`, `Transcript`, `ViralSpike`, `Chunk`, `RenderProfile`, `Asset`, `Variation`, `Account`, `Cluster`, `ClusterAccount`, `DistributionRule`, `Distribution`, `Job`.

See `docs/ERD.md` for the full Prisma schema and ER diagram.
