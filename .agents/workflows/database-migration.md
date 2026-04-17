---
name: Database Migration
description: >
  Run the full Prisma migration workflow: edit schema, generate migration, regenerate
  client, and verify. Use when the user says "add a field", "change the schema",
  "create a migration", "update the database", or "add a new model".
---

# Database Migration

Runs the complete Prisma migration cycle after any schema change.

## Trigger

User modifies the Prisma schema or asks to add/change database models or fields.

## Required Input

- **What changed** in the schema (new model, new field, renamed column, etc.)
- **Migration name** (descriptive, e.g., `add_refresh_tokens`, `add_project_description`)

## Steps

### 1. Edit the schema

Make the requested changes to `packages/database/prisma/schema.prisma`.

Follow these rules:
- All IDs: `String @id @default(uuid()) @db.Uuid`
- All data tables (except User) must have `workspaceId String @db.Uuid` with `@@index([workspaceId])`
- Use Prisma enums for status fields
- Add `@@map("snake_case_plural")` to every model
- Add `@@index` on frequently queried columns
- Add unique constraints for business-logic uniqueness

### 2. Generate migration

// turbo
```
pnpm --filter @cipta/database exec prisma migrate dev --name {migration_name}
```

If the migration requires data backfill or is destructive, review the generated SQL in `packages/database/prisma/migrations/` before proceeding.

### 3. Regenerate Prisma Client

// turbo
```
pnpm --filter @cipta/database exec prisma generate
```

### 4. Update shared types (if needed)

If new models or enums were added that are used in job payloads or cross-package types, update `packages/shared/src/types/` accordingly.

### 5. Verify builds and tests

// turbo
```
bash scripts/verify.sh all
```

Runs: `prisma generate` → `lint` → `check-types` → `test` → `build`.
Fix any type errors or failing tests caused by schema changes (usually mock data shape changes).

## Expected Output

Migration applied, Prisma Client regenerated, all packages build and tests pass.
