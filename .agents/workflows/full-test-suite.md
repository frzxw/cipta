---
name: Full Test Suite
description: >
  Run complete tests with coverage. Triggers: "run all tests", "run the test suite",
  "check coverage", "CI tests", "verify everything passes".
---

# Full Test Suite

## Steps

### 1. Infrastructure check

```bash
docker compose ps --format "table {{.Name}}\t{{.Status}}" | head -10
# If postgres/redis not Up → docker compose up -d
```

### 2. All checks + coverage

```bash
bash scripts/verify.sh all
# Runs: prisma:generate → lint → check-types → test → build
# Output: one ✅/❌ line per step
```

Unit tests with coverage only (skip lint/build):
```bash
pnpm test --reporter=dot --coverage 2>&1 | tail -30
```

### 3. Integration tests (requires Step 1 infra)

```bash
pnpm --filter api test:e2e 2>&1 | tail -30
```

### 4. E2E (Playwright)

```bash
npx playwright test --reporter=dot 2>&1 | tail -30
```

### 5. Coverage summary

| Package | Status | Coverage |
|---------|--------|----------|
| `@cipta/shared` | ✅/❌ | XX% |
| `@cipta/database` | ✅/❌ | XX% |
| `apps/api` (unit) | ✅/❌ | XX% |
| `apps/api` (e2e) | ✅/❌ | — |
| `apps/worker` | ✅/❌ | XX% |
| `apps/web` | ✅/❌ | XX% |
| E2E (Playwright) | ✅/❌ | — |

Thresholds: services ≥80%, shared ≥90%, components ≥70%.
