---
name: Full Test Suite
description: >
  Run the complete test suite in the correct order with coverage reporting.
  Use when the user says "run all tests", "run the test suite", "check coverage",
  "CI tests", or "verify everything passes".
---

# Full Test Suite

Runs unit, integration, and E2E tests across the entire monorepo in the correct dependency order.

## Trigger

User wants to run the full test suite, check coverage, or verify before a PR/merge.

## Steps

### 1. Check infrastructure

Verify PostgreSQL and Redis are running (needed for integration tests):

```
docker compose ps
```

If not running:

```
docker compose up -d
```

### 2. Ensure Prisma client is generated

// turbo
```
pnpm --filter @cipta/database exec prisma generate
```

### 3. Run shared package tests

// turbo
```
pnpm --filter @cipta/shared test
```

### 4. Run database package tests

// turbo
```
pnpm --filter @cipta/database test
```

### 5. Run API unit tests with coverage

// turbo
```
pnpm --filter api test -- --coverage
```

### 6. Run Worker unit tests with coverage

// turbo
```
pnpm --filter worker test -- --coverage
```

### 7. Run Web unit tests with coverage

// turbo
```
pnpm --filter web test -- --coverage
```

### 8. Run API integration tests

// turbo
```
pnpm --filter api test:e2e
```

### 9. Run E2E tests (Playwright)

// turbo
```
npx playwright test
```

### 10. Report results

Summarize the results:

| Package | Status | Coverage |
|---------|--------|----------|
| `@cipta/shared` | ✅/❌ | XX% |
| `@cipta/database` | ✅/❌ | XX% |
| `apps/api` (unit) | ✅/❌ | XX% |
| `apps/api` (e2e) | ✅/❌ | — |
| `apps/worker` | ✅/❌ | XX% |
| `apps/web` | ✅/❌ | XX% |
| E2E (Playwright) | ✅/❌ | — |

Flag any package below coverage thresholds:
- Services: 80%
- Shared: 90%
- Components: 70%

## Expected Output

All tests pass, coverage report is printed, any failures are clearly listed with file:line references.
