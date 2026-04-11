# Cipta — Testing Strategy & Standards

> **Version:** 0.1.0-alpha  
> **Philosophy:** Test-Driven Development (TDD) — tests are first-class citizens  
> **Last Updated:** 2026-04-11

---

## 1. Testing Pyramid

```
                    ┌──────────┐
                    │   E2E    │  ← Few, slow, high confidence
                    │ Playwright│
                   ─┤  5-10%   ├─
                  / └──────────┘ \
                 /                 \
                ┌──────────────────┐
                │   Integration    │  ← Moderate, medium speed
                │ Supertest/BullMQ │
               ─┤    20-30%       ├─
              / └──────────────────┘ \
             /                        \
            ┌──────────────────────────┐
            │       Unit Tests         │  ← Many, fast, focused
            │    Jest / Vitest         │
            │       60-70%             │
            └──────────────────────────┘
```

---

## 2. Test Infrastructure by Package

| Package | Framework | Runner | Config File |
|---------|-----------|--------|-------------|
| `apps/api` | Jest + Supertest | `jest` | `jest` config in `package.json` |
| `apps/worker` | Vitest | `vitest` | `vitest.config.ts` |
| `apps/web` | Vitest + React Testing Library | `vitest` | `vitest.config.ts` |
| `packages/database` | Vitest | `vitest` | `vitest.config.ts` |
| `packages/shared` | Vitest | `vitest` | `vitest.config.ts` |
| E2E (cross-cutting) | Playwright | `playwright` | `playwright.config.ts` |

### Turborepo Task Configuration

```jsonc
// turbo.json
{
  "tasks": {
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "test/**", "vitest.config.*", "jest.config.*"],
      "outputs": ["coverage/**"]
    },
    "test:e2e": {
      "dependsOn": ["build"],
      "inputs": ["e2e/**", "playwright.config.*"],
      "cache": false
    }
  }
}
```

---

## 3. Coverage Targets

| Package | Statement | Branch | Function | Line |
|---------|-----------|--------|----------|------|
| `apps/api` services | 80% | 75% | 80% | 80% |
| `apps/api` controllers | 70% | 60% | 70% | 70% |
| `apps/worker` processors | 80% | 75% | 80% | 80% |
| `apps/worker` services | 85% | 80% | 85% | 85% |
| `packages/shared` | 90% | 85% | 90% | 90% |
| `packages/database` | 60% | 50% | 60% | 60% |
| `apps/web` components | 70% | 60% | 70% | 70% |

**Enforcement:**
```jsonc
// Jest (apps/api)
{
  "coverageThreshold": {
    "global": {
      "statements": 75,
      "branches": 65,
      "functions": 75,
      "lines": 75
    }
  }
}
```

---

## 4. Unit Testing

### 4.1 Convention

- File naming: `<name>.spec.ts` (co-located with source)
- Describe blocks: `describe('ClassName')` → `describe('methodName')` → `it('should...')`
- One assertion per test (prefer focused tests over mega-tests)
- No real I/O: mock DB, HTTP, filesystem, Redis

### 4.2 NestJS Service Unit Test Pattern

```typescript
// apps/api/src/modules/ingestor/ingestor.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { IngestorService } from './ingestor.service';
import { PrismaService } from '../../config/prisma.service';

describe('IngestorService', () => {
  let service: IngestorService;
  let prisma: jest.Mocked<PrismaService>;
  let queue: jest.Mocked<any>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestorService,
        {
          provide: PrismaService,
          useValue: {
            source: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: getQueueToken('cipta:ingestor'),
          useValue: {
            add: jest.fn().mockResolvedValue({ id: 'job_123' }),
          },
        },
      ],
    }).compile();

    service = module.get(IngestorService);
    prisma = module.get(PrismaService);
    queue = module.get(getQueueToken('cipta:ingestor'));
  });

  describe('createSource', () => {
    it('should create a source record and dispatch a download job', async () => {
      const dto = { url: 'https://youtube.com/watch?v=test123', quality: 'highest' as const };
      const mockUser = { id: 'usr_1', workspaceId: 'ws_1' };
      const mockSource = { id: 'src_1', ...dto, status: 'PENDING' };

      prisma.source.create.mockResolvedValue(mockSource as any);

      const result = await service.createSource(dto, mockUser as any);

      expect(prisma.source.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ url: dto.url, workspaceId: 'ws_1' }),
        }),
      );
      expect(queue.add).toHaveBeenCalledWith('download', expect.objectContaining({
        sourceId: 'src_1',
        url: dto.url,
      }), expect.any(Object));
      expect(result.status).toBe('PENDING');
    });

    it('should reject invalid URLs', async () => {
      const dto = { url: 'not-a-valid-url' };
      const mockUser = { id: 'usr_1', workspaceId: 'ws_1' };

      await expect(service.createSource(dto as any, mockUser as any))
        .rejects.toThrow();
    });
  });
});
```

### 4.3 Worker Service Unit Test Pattern

```typescript
// apps/worker/src/services/downloader.service.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloaderService } from './downloader.service';

describe('DownloaderService', () => {
  let service: DownloaderService;
  let mockContext: any;

  beforeEach(() => {
    mockContext = {
      prisma: {
        source: { update: vi.fn() },
      },
      storage: {
        upload: vi.fn().mockResolvedValue('https://storage/path'),
      },
      logger: {
        info: vi.fn(),
        error: vi.fn(),
      },
      config: {
        tempDir: '/tmp/cipta-test',
        ffmpeg: { path: 'ffmpeg' },
      },
    };
    service = new DownloaderService(mockContext);
  });

  describe('buildYtDlpCommand', () => {
    it('should construct correct yt-dlp arguments for YouTube URLs', () => {
      const args = service.buildYtDlpCommand(
        'https://youtube.com/watch?v=test123',
        'highest',
        '/tmp/output',
      );

      expect(args).toContain('--format');
      expect(args).toContain('--merge-output-format');
      expect(args).toContain('mp4');
      expect(args).toContain('--no-playlist');
    });

    it('should limit quality when 720p is requested', () => {
      const args = service.buildYtDlpCommand(
        'https://youtube.com/watch?v=test123',
        '720p',
        '/tmp/output',
      );

      expect(args.join(' ')).toContain('720');
    });
  });

  describe('parseProgress', () => {
    it('should extract percentage from yt-dlp output', () => {
      const line = '[download]  45.2% of 1.23GiB at 12.5MiB/s ETA 00:42';
      expect(service.parseProgress(line)).toBeCloseTo(45.2);
    });

    it('should return -1 for non-progress lines', () => {
      expect(service.parseProgress('[info] Downloading video')).toBe(-1);
    });
  });
});
```

### 4.4 React Component Unit Test Pattern

```typescript
// apps/web/app/components/StatusBadge.test.tsx

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders READY status with success styling', () => {
    render(<StatusBadge status="READY" />);
    const badge = screen.getByText('READY');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('status-success');
  });

  it('renders FAILED status with error styling', () => {
    render(<StatusBadge status="FAILED" />);
    const badge = screen.getByText('FAILED');
    expect(badge).toHaveClass('status-error');
  });

  it('renders ACTIVE status with spinner icon', () => {
    render(<StatusBadge status="ACTIVE" />);
    expect(screen.getByTestId('spinner-icon')).toBeInTheDocument();
  });
});
```

---

## 5. Integration Testing

### 5.1 API Integration Tests (Supertest)

Test the full request cycle: HTTP → Controller → Service → DB → Response.

```typescript
// apps/api/test/ingestor.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/config/prisma.service';

describe('Ingestor (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Create test user and get auth token
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'test@test.com', password: 'Test@1234', displayName: 'Test' });
    authToken = res.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.user.deleteMany({ where: { email: 'test@test.com' } });
    await app.close();
  });

  describe('POST /sources', () => {
    it('should create a source and return 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/sources')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ url: 'https://youtube.com/watch?v=dQw4w9WgXcQ' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.jobId).toBeDefined();
    });

    it('should reject invalid URLs with 400', async () => {
      await request(app.getHttpServer())
        .post('/v1/sources')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ url: 'not-a-url' })
        .expect(400);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/v1/sources')
        .send({ url: 'https://youtube.com/watch?v=test' })
        .expect(401);
    });
  });

  describe('GET /sources', () => {
    it('should return only sources from the user workspace', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/sources')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // Every returned source should belong to the test workspace
      res.body.data.forEach((source: any) => {
        expect(source.workspaceId).toBeDefined();
      });
    });
  });
});
```

### 5.2 Worker Integration Tests

Test job processing with real (or near-real) dependencies:

```typescript
// apps/worker/test/ingestor.integration-spec.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Queue, Worker, Job } from 'bullmq';
import { PrismaClient } from '@cipta/database';
import { QUEUE_NAMES } from '@cipta/shared';

describe('IngestorProcessor (integration)', () => {
  let queue: Queue;
  let prisma: PrismaClient;
  const redis = { host: 'localhost', port: 6379 };

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    queue = new Queue(QUEUE_NAMES.INGESTOR, { connection: redis });
  });

  afterAll(async () => {
    await queue.close();
    await prisma.$disconnect();
  });

  it('should process a download job and update source status', async () => {
    // Create a test source
    const source = await prisma.source.create({
      data: {
        url: 'https://youtube.com/watch?v=test',
        workspaceId: 'test-ws-id',
        status: 'PENDING',
      },
    });

    // Add job to queue
    const job = await queue.add('download', {
      sourceId: source.id,
      workspaceId: source.workspaceId,
      url: source.url,
      quality: 'highest',
    });

    // Wait for processing (with timeout)
    const result = await job.waitUntilFinished(queue.events, 60000);

    // Verify source status updated
    const updated = await prisma.source.findUnique({ where: { id: source.id } });
    expect(updated?.status).toBe('DOWNLOADED');

    // Cleanup
    await prisma.source.delete({ where: { id: source.id } });
  }, 120000); // 2 minute timeout
});
```

### 5.3 Queue Integration Tests

Test job chaining and progress reporting:

```typescript
describe('Job Chaining', () => {
  it('download completion should trigger transcribe job', async () => {
    // Spy on the queue to detect new jobs
    const transcribeJobs: Job[] = [];
    const listener = queue.on('waiting', (jobId) => {
      queue.getJob(jobId).then(job => {
        if (job?.name === 'transcribe') transcribeJobs.push(job);
      });
    });

    // Trigger download
    await queue.add('download', { /* ... */ });

    // Wait for chaining
    await sleep(5000);

    expect(transcribeJobs.length).toBeGreaterThan(0);
    expect(transcribeJobs[0].data.sourceId).toBeDefined();
  });
});
```

---

## 6. End-to-End Testing (Playwright)

### 6.1 Configuration

```typescript
// playwright.config.ts (repo root)

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: [
    {
      command: 'pnpm --filter web dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter api start:dev',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

### 6.2 Critical E2E Flows

| Test ID | Flow | Priority |
|---------|------|----------|
| E2E-001 | Register → Login → See Dashboard | P0 |
| E2E-002 | Paste URL → See Source in list → Status updates | P0 |
| E2E-003 | Approve Viral Spikes → Trigger Render → See Asset | P0 |
| E2E-004 | Create Cluster → Add Accounts → Schedule Distribution | P1 |
| E2E-005 | Change Render Profile → Re-render → Compare output | P1 |
| E2E-006 | Workspace settings → Invite member → Role check | P2 |

### 6.3 E2E Test Example

```typescript
// e2e/auth.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('E2E-001: should register, login, and see dashboard', async ({ page }) => {
    // Register
    await page.goto('/register');
    await page.getByLabel('Email').fill('e2e-test@cipta.app');
    await page.getByLabel('Password').fill('TestP@ss123');
    await page.getByLabel('Display Name').fill('E2E Tester');
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Dashboard')).toBeVisible();

    // Logout
    await page.getByTestId('user-menu').click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();
    await expect(page).toHaveURL('/login');

    // Login
    await page.getByLabel('Email').fill('e2e-test@cipta.app');
    await page.getByLabel('Password').fill('TestP@ss123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should see dashboard again
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Dashboard')).toBeVisible();
  });
});
```

---

## 7. Test Data Management

### 7.1 Factory Functions

```typescript
// packages/shared/src/test-utils/factories.ts

import { v4 as uuid } from 'uuid';

export function createTestUser(overrides?: Partial<User>): User {
  return {
    id: uuid(),
    email: `test-${uuid().slice(0, 8)}@cipta.app`,
    displayName: 'Test User',
    passwordHash: '$2b$12$...',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestSource(overrides?: Partial<Source>): Source {
  return {
    id: uuid(),
    workspaceId: uuid(),
    url: 'https://youtube.com/watch?v=test',
    title: 'Test Video',
    platform: 'youtube',
    status: 'PENDING',
    durationSeconds: 600,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestRenderProfile(overrides?: Partial<RenderProfile>): RenderProfile {
  return {
    id: uuid(),
    workspaceId: uuid(),
    name: 'Test Profile',
    captionStyle: {
      fontFamily: 'Inter',
      fontSize: 48,
      fontWeight: 'bold',
      primaryColor: '#FFFFFF',
      highlightColor: '#FF6B35',
      animation: 'word-pop',
      position: 'center',
    },
    frameConfig: { aspectRatio: '9:16', faceTracking: false },
    brollConfig: { enabled: false },
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

### 7.2 Database Seeding (Development)

```typescript
// packages/database/prisma/seed.ts

import { PrismaClient } from './generated/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@cipta.app' },
    update: {},
    create: {
      email: 'demo@cipta.app',
      passwordHash: await bcrypt.hash('DemoP@ss123', 12),
      displayName: 'Demo User',
    },
  });

  // Create demo workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'demo-workspace' },
    update: {},
    create: {
      name: 'Demo Workspace',
      slug: 'demo-workspace',
      plan: 'PRO',
      members: {
        create: { userId: user.id, role: 'OWNER' },
      },
    },
  });

  // Create default render profile
  await prisma.renderProfile.upsert({
    where: { id: 'default-profile-id' },
    update: {},
    create: {
      id: 'default-profile-id',
      workspaceId: workspace.id,
      name: 'Default Style',
      isDefault: true,
      captionStyle: { /* ... */ },
      frameConfig: { /* ... */ },
      brollConfig: { enabled: false },
    },
  });

  console.log('Seed data created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### 7.3 Test Isolation Rules

| Rule | Implementation |
|------|---------------|
| Tests create their own data | No dependency on seed data |
| Tests clean up after themselves | `afterAll` / `afterEach` hooks |
| No shared mutable state | Fresh instances per `describe` block |
| Unique emails/slugs per test | Use `uuid()` in factory functions |
| Parallel-safe | No hardcoded IDs or ports |

---

## 8. Mocking Strategy

### 8.1 What to Mock

| Layer | Mock In Unit Tests? | Mock In Integration Tests? |
|-------|---------------------|---------------------------|
| Database (Prisma) | ✅ Always | ❌ Use test DB |
| Redis / BullMQ | ✅ Always | ⚠️ Use test Redis or mock |
| External APIs (Whisper, LLM) | ✅ Always | ✅ Always |
| Cloud Storage (S3/GCS) | ✅ Always | ✅ Use local storage |
| FFmpeg | ✅ Mock outputs | ⚠️ Use real FFmpeg with test video |
| yt-dlp | ✅ Mock outputs | ✅ Always (never hit real URLs) |
| Platform APIs (TikTok, etc.) | ✅ Always | ✅ Always |

### 8.2 External API Mocking

```typescript
// Use msw (Mock Service Worker) for HTTP API mocking

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const handlers = [
  // Mock Whisper API
  http.post('https://api.openai.com/v1/audio/transcriptions', () => {
    return HttpResponse.json({
      text: 'Hello world this is a test transcript',
      words: [
        { word: 'Hello', start: 0.0, end: 0.5 },
        { word: 'world', start: 0.5, end: 1.0 },
        // ...
      ],
    });
  }),

  // Mock LLM API
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      choices: [{
        message: {
          content: JSON.stringify([
            {
              startTime: 10.0, endTime: 45.0,
              confidenceScore: 85, category: 'HUMOR',
              suggestedTitle: 'Test viral spike',
            },
          ]),
        },
      }],
    });
  }),
];

export const mockServer = setupServer(...handlers);
```

---

## 9. CI Test Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @cipta/database exec prisma generate
      - run: pnpm test -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: '**/coverage/'

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: cipta_test
          POSTGRES_USER: cipta
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @cipta/database exec prisma migrate deploy
        env:
          DATABASE_URL: postgresql://cipta:test@localhost:5432/cipta_test
      - run: pnpm --filter api test:e2e
        env:
          DATABASE_URL: postgresql://cipta:test@localhost:5432/cipta_test
          REDIS_HOST: localhost

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps chromium
      - run: pnpm exec playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 10. Test Naming Convention & IDs

Every test should be traceable to a PRD acceptance criterion:

```typescript
// Format: [AC-XXX.Y] or [E2E-XXX]
describe('IngestorService', () => {
  it('[AC-001.1] should accept YouTube, TikTok, and Twitch URLs', () => { ... });
  it('[AC-001.6] should retry failed downloads up to 3 times', () => { ... });
  it('[AC-002.2] should include word-level timestamps in transcription', () => { ... });
});
```

### Test ID Matrix

| ID | Acceptance Criteria | Test Type | File |
|----|---------------------|-----------|------|
| AC-001.1 | Accept YouTube/TikTok/Twitch URLs | Unit | `ingestor.service.spec.ts` |
| AC-001.3 | Real-time download progress | Integration | `ingestor.integration-spec.ts` |
| AC-001.6 | Retry 3× with exponential backoff | Unit | `downloader.service.spec.ts` |
| AC-002.2 | Word-level timestamps | Unit | `transcriber.service.spec.ts` |
| AC-003.2 | Spike includes timestamps/confidence/category | Unit | `analyzer.service.spec.ts` |
| AC-004.1 | 16:9 → 9:16 crop with face tracking | Integration | `factory.integration-spec.ts` |
| AC-005.2 | Each variation has unique MD5 | Integration | `guardian.integration-spec.ts` |
| AC-005.5 | SSIM ≥ 0.98 | Integration | `guardian.integration-spec.ts` |
| AC-009.1 | Register with email/password | E2E | `auth.spec.ts` |
| AC-009.2 | JWT access + refresh tokens | Integration | `auth.e2e-spec.ts` |
