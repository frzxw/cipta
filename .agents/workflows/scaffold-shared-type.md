---
name: Scaffold Shared Package Type
description: >
  Add a new shared type, constant, or utility to packages/shared with proper exports.
  Use when the user says "add a shared type", "create a job payload type",
  "add a queue constant", "add a shared enum", or "create a shared utility".
---

# Scaffold Shared Package Type

Adds a new type definition, constant, or utility to `packages/shared` and ensures it is properly exported.

## Trigger

User asks to add a new shared type, constant, enum, or utility function used across apps.

## Required Input

- **What to add**: type interface, constant, enum, or utility function
- **Category**: `types`, `constants`, or `utils`
- **Name**: e.g., `RenderJobPayload`, `QUEUE_NAMES`, `formatDuration`

## Steps

### 1. Determine target file

| Category | Directory | Example File |
|----------|-----------|--------------|
| Job payload types | `src/types/` | `jobs.ts` |
| Entity-related types | `src/types/` | `entities.ts` |
| Queue constants | `src/constants/` | `queues.ts` |
| Status enums | `src/constants/` | `statuses.ts` |
| Utility functions | `src/utils/` | `{name}.util.ts` |

### 2. Add the definition

Write the type, constant, or utility in the appropriate file.

**Rules:**
- Types: use `interface` for object shapes, `type` for unions
- Constants: use `as const` for literal types
- Enums: prefer string enum or `as const` objects over TypeScript enums
- Utilities: pure functions only — no side effects, no imports from `apps/*`
- Never import from `apps/*` or `packages/database` — shared is a leaf package

### 3. Update barrel exports

Ensure the new definition is exported from `src/index.ts`:

```typescript
export * from './types/jobs';
export * from './constants/queues';
export * from './utils/{name}.util';
```

### 4. Regenerate (if needed)

// turbo
```
pnpm --filter @cipta/shared build
```

### 5. Verify consumers build

// turbo
```
pnpm build
```

This ensures both `apps/api` and `apps/worker` can import the new type.

## Expected Output

New type/constant/utility is defined, exported, and importable from `@cipta/shared` across all consuming packages.
