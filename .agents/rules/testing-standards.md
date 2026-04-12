---
name: testing-standards
description: >
  Load when writing tests, configuring test runners, setting up mocks, or reviewing test
  coverage. Enforces the test pyramid, coverage targets, naming conventions, test isolation,
  and mocking strategy. Triggers on: test file creation, spec files, coverage config,
  mock setup, test data factories, Playwright config, integration test setup.
---

# Testing Standards

## 1. Test Pyramid

| Level | Percentage | Framework | Location |
|-------|-----------|-----------|----------|
| Unit Tests | 60-70% | Jest (API) / Vitest (Worker, Web, packages) | `*.spec.ts` co-located with source |
| Integration Tests | 20-30% | Jest + Supertest (API) / Vitest (Worker) | `test/` directory |
| E2E Tests | 5-10% | Playwright | `e2e/` directory at repo root |

## 2. Test Frameworks by Package

| Package | Framework | Config |
|---------|-----------|--------|
| `apps/api` | Jest + Supertest | jest config in `package.json` |
| `apps/worker` | Vitest | `vitest.config.ts` |
| `apps/web` | Vitest + React Testing Library | `vitest.config.ts` |
| `packages/database` | Vitest | `vitest.config.ts` |
| `packages/shared` | Vitest | `vitest.config.ts` |
| E2E | Playwright | `playwright.config.ts` |

## 3. Coverage Targets

| Package | Statements | Branches | Functions | Lines |
|---------|-----------|----------|-----------|-------|
| `apps/api` services | 80% | 75% | 80% | 80% |
| `apps/api` controllers | 70% | 60% | 70% | 70% |
| `apps/worker` processors | 80% | 75% | 80% | 80% |
| `apps/worker` services | 85% | 80% | 85% | 85% |
| `packages/shared` | 90% | 85% | 90% | 90% |
| `apps/web` components | 70% | 60% | 70% | 70% |

## 4. Naming Conventions

- File naming: `<name>.spec.ts` for unit tests, `<name>.e2e-spec.ts` for integration tests.
- Describe blocks: `describe('ClassName')` → `describe('methodName')` → `it('should...')`.
- One focused assertion per test. Avoid mega-tests.
- Trace tests to PRD acceptance criteria using IDs: `it('[AC-001.1] should accept YouTube URLs', ...)`.

## 5. Test Isolation Rules

| Rule | Implementation |
|------|---------------|
| Tests create their own data | No dependency on seed data |
| Tests clean up after themselves | `afterAll` / `afterEach` hooks |
| No shared mutable state | Fresh instances per `describe` block |
| Unique emails/slugs per test | Use `uuid()` in factory functions |
| Parallel-safe | No hardcoded IDs or ports |

## 6. Mocking Strategy

| Dependency | Mock in Unit Tests? | Mock in Integration Tests? |
|-----------|--------------------|-----------------------------|
| Prisma (Database) | ✅ Always | ❌ Use test DB |
| Redis / BullMQ | ✅ Always | ⚠️ Use test Redis or mock |
| External APIs (Whisper, LLM) | ✅ Always | ✅ Always |
| Cloud Storage (S3/GCS) | ✅ Always | ✅ Use local storage |
| FFmpeg | ✅ Mock outputs | ⚠️ Use real FFmpeg with test video |
| yt-dlp | ✅ Mock outputs | ✅ Always (never hit real URLs) |
| Platform APIs (TikTok, etc.) | ✅ Always | ✅ Always |

- Use `msw` (Mock Service Worker) for external HTTP API mocking.
- For NestJS unit tests, use `Test.createTestingModule()` with mocked providers.
- For Worker service tests, use `vi.fn()` / `jest.fn()` on the `WorkerContext`.

## 7. Factory Functions

Always use factory functions from `packages/shared/src/test-utils/factories.ts` to generate test data:
- `createTestUser(overrides?)`
- `createTestSource(overrides?)`
- `createTestRenderProfile(overrides?)`

Each factory generates unique IDs and emails using `uuid()`.

## 8. NestJS Unit Test Pattern

```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let prisma: jest.Mocked<PrismaService>;
  let queue: jest.Mocked<any>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ServiceName, /* mocked deps */],
    }).compile();
    service = module.get(ServiceName);
  });

  describe('methodName', () => {
    it('should ...', async () => { ... });
  });
});
```

## 9. E2E Test Requirements

| Test ID | Flow | Priority |
|---------|------|----------|
| E2E-001 | Register → Login → See Dashboard | P0 |
| E2E-002 | Paste URL → See Source → Status updates | P0 |
| E2E-003 | Approve Spikes → Trigger Render → See Asset | P0 |
| E2E-004 | Create Cluster → Add Accounts → Schedule Distribution | P1 |
| E2E-005 | Change Render Profile → Re-render → Compare output | P1 |

## 10. CI Pipeline

- Unit tests run on every push/PR.
- Integration tests require PostgreSQL and Redis service containers.
- E2E tests run after unit and integration tests pass.
- Coverage reports are uploaded as artifacts.
- Build is blocked on high/critical vulnerability audit failures.
