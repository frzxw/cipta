# Cipta — Contributing Guide

> **Version:** 0.1.0-alpha  
> **Last Updated:** 2026-04-11

---

## 1. Development Environment Setup

### 1.1 Prerequisites

| Tool           | Version | Purpose                    |
| -------------- | ------- | -------------------------- |
| Node.js        | 22 LTS  | Runtime                    |
| pnpm           | 9.x     | Package manager            |
| Docker Desktop | Latest  | PostgreSQL + Redis         |
| FFmpeg         | 7+      | Video processing (Worker)  |
| yt-dlp         | Latest  | Media downloading (Worker) |
| Git            | 2.40+   | Version control            |

### 1.2 Initial Setup

```bash
# Clone the repository
git clone https://github.com/your-org/cipta.git
cd cipta

# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL + Redis)
docker compose up -d

# Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
cp apps/web/.env.example apps/web/.env

# Run database migrations
pnpm --filter @cipta/database exec prisma migrate dev

# Generate Prisma Client
pnpm --filter @cipta/database exec prisma generate

# Start all apps in development mode
pnpm dev
```

### 1.3 Development URLs

| Service                  | URL                                  |
| ------------------------ | ------------------------------------ |
| Web Dashboard            | `http://localhost:3000`              |
| API Server               | `http://localhost:3001`              |
| API Docs (Swagger)       | `http://localhost:3001/docs`         |
| Bull Board (Job Monitor) | `http://localhost:3001/admin/queues` |
| Prisma Studio            | `http://localhost:5555`              |

---

## 2. Monorepo Commands

### 2.1 Root Commands (Turborepo)

```bash
pnpm dev                          # Start all apps in dev mode
pnpm build                        # Build all apps and packages
pnpm lint                         # Lint all apps and packages
pnpm check-types                  # Type-check all apps and packages
pnpm format                       # Format all files with Prettier
```

### 2.2 Filtered Commands

```bash
# Run for a specific app
pnpm --filter api dev              # Start only the API
pnpm --filter web dev              # Start only the frontend
pnpm --filter worker dev           # Start only the worker

# Run for a specific package
pnpm --filter @cipta/database exec prisma studio   # Open Prisma Studio
pnpm --filter @cipta/database exec prisma migrate dev --name <name>

# Run tests
pnpm --filter api test             # Run API tests
pnpm --filter api test:e2e         # Run API E2E tests
```

---

## 3. Git Workflow

### 3.1 Branching Strategy

| Branch                        | Purpose               | Merges Into             |
| ----------------------------- | --------------------- | ----------------------- |
| `main`                        | Production-ready code | —                       |
| `develop`                     | Integration branch    | `main` (via release PR) |
| `feat/<ticket>-<description>` | New features          | `develop`               |
| `fix/<ticket>-<description>`  | Bug fixes             | `develop`               |
| `docs/<description>`          | Documentation changes | `develop`               |
| `refactor/<description>`      | Code refactoring      | `develop`               |

### 3.2 Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/) strictly:

```text
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**

| Type       | Usage                                   |
| ---------- | --------------------------------------- |
| `feat`     | New feature                             |
| `fix`      | Bug fix                                 |
| `docs`     | Documentation only                      |
| `refactor` | Code change that neither fixes nor adds |
| `test`     | Adding or correcting tests              |
| `chore`    | Build process, CI, tooling changes      |
| `perf`     | Performance improvement                 |
| `style`    | Formatting, missing semicolons, etc.    |

**Scopes:** `api`, `web`, `worker`, `database`, `shared`, `ui`, `docs`, `infra`

**Examples:**

```text
feat(api): add ingestor module with source CRUD endpoints
fix(worker): handle FFmpeg timeout on large files
docs(specs): add Guardian module specification
test(api): add integration tests for auth flow
chore(infra): add Redis to docker-compose
refactor(worker): extract FFmpeg commands into service layer
```

### 3.3 Pull Request Rules

1. **Title** follows commit convention: `feat(api): description`
2. **Description** must reference the spec/feature number: `Implements F-001 (PRD.md)`
3. **Tests** must pass — CI blocks merge on failure
4. **Review** required from at least 1 team member
5. **No force pushes** to `main` or `develop`

---

## 4. Code Standards

### 4.1 TypeScript Rules

- **Strict mode** enabled in all `tsconfig.json`
- **No `any`** — use `unknown` if type is truly unknown
- **No `as` type assertions** unless unavoidable (document why)
- **Prefer interfaces** for object shapes, types for unions
- **Use `satisfies`** for type-safe object literals

### 4.2 NestJS Rules (apps/api)

- **Feature modules** — one module per domain concept
- **Constructor injection** — never use property injection
- **DTOs for all inputs** — decorated with `class-validator`
- **No business logic in controllers** — controllers call services only
- **Repository pattern** — abstract DB access behind service methods

### 4.3 Worker Rules (apps/worker)

- **Zero NestJS imports** — this is a standalone Node.js app
- **Processors are thin** — delegate heavy logic to services
- **Always update job progress** — `job.updateProgress(percent)`
- **Always update DB status** — transition entities through status enums
- **Handle all errors** — catch and record to `Job.error` field

### 4.4 Frontend Rules (apps/web)

- **Server Components by default** — `'use client'` only when needed
- **Fetch in Server Components** — no client-side fetching for initial data
- **Loading/Error boundaries** — every route has `loading.tsx` and `error.tsx`
- **ShadcnUI components** — no custom UI primitives unless ShadcnUI lacks it

---

## 5. Testing Strategy

### 5.1 Test Pyramid

| Level             | Tool             | Location                     | Coverage Target     |
| ----------------- | ---------------- | ---------------------------- | ------------------- |
| Unit Tests        | Jest / Vitest    | `*.spec.ts` alongside source | 80% for services    |
| Integration Tests | Jest + Supertest | `test/` directory            | All API endpoints   |
| E2E Tests         | Playwright       | `e2e/` directory             | Critical user flows |

### 5.2 Test Naming Convention

```typescript
describe('IngestorService', () => {
  describe('createSource', () => {
    it('should create a source record and dispatch download job', async () => { ... });
    it('should throw ConflictException for duplicate URLs in same workspace', async () => { ... });
    it('should set source status to PENDING on creation', async () => { ... });
  });
});
```

### 5.3 Test Data

- Use **factory functions** to generate test data (not raw objects)
- Never depend on seed data — tests create and clean up their own data
- Use **in-memory SQLite** or **test containers** for integration tests

---

## 6. Environment Variables

### 6.1 Convention

- **All uppercase** with underscore separation
- **Prefixed by app** where possible: `API_PORT`, `WORKER_CONCURRENCY`
- **Never committed** — use `.env.example` as template

### 6.2 Required Variables

#### `apps/api/.env`

```bash
# Server
API_PORT=3001
API_HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://cipta:cipta_dev@localhost:5432/cipta

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_ACCESS_SECRET=<random-256-bit>
JWT_REFRESH_SECRET=<random-256-bit>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Storage
STORAGE_PROVIDER=s3  # s3 | gcs | local
STORAGE_BUCKET=cipta-dev
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

#### `apps/worker/.env`

```bash
# Database (same as API)
DATABASE_URL=postgresql://cipta:cipta_dev@localhost:5432/cipta

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Worker
WORKER_CONCURRENCY_INGEST=3
WORKER_CONCURRENCY_FACTORY=2
WORKER_CONCURRENCY_GUARDIAN=5
WORKER_CONCURRENCY_FLEET=3

# FFmpeg
FFMPEG_PATH=/usr/bin/ffmpeg
FFMPEG_HW_ACCEL=auto  # auto | nvenc | videotoolbox | none

# Storage (same as API)
STORAGE_PROVIDER=s3
STORAGE_BUCKET=cipta-dev

# External APIs
WHISPER_API_URL=https://api.openai.com/v1/audio/transcriptions
WHISPER_API_KEY=...
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_API_KEY=...
```

---

## 7. File Naming Conventions

| Context           | Convention                      | Example                      |
| ----------------- | ------------------------------- | ---------------------------- |
| NestJS Module     | `<name>.module.ts`              | `ingestor.module.ts`         |
| NestJS Controller | `<name>.controller.ts`          | `ingestor.controller.ts`     |
| NestJS Service    | `<name>.service.ts`             | `ingestor.service.ts`        |
| NestJS DTO        | `<action>-<name>.dto.ts`        | `create-source.dto.ts`       |
| NestJS Guard      | `<name>.guard.ts`               | `jwt-auth.guard.ts`          |
| Worker Processor  | `<name>.processor.ts`           | `ingestor.processor.ts`      |
| Worker Service    | `<name>.service.ts`             | `downloader.service.ts`      |
| Test File         | `<name>.spec.ts`                | `ingestor.service.spec.ts`   |
| E2E Test          | `<name>.e2e-spec.ts`            | `auth.e2e-spec.ts`           |
| Next.js Page      | `page.tsx`                      | `app/sources/page.tsx`       |
| Next.js Layout    | `layout.tsx`                    | `app/(dashboard)/layout.tsx` |
| React Component   | `<Name>.tsx` (PascalCase)       | `SourceTable.tsx`            |
| Utility           | `<name>.util.ts` or `<name>.ts` | `hash.util.ts`               |
| Constant          | `<name>.const.ts`               | `queues.const.ts`            |
| Type Definition   | `<name>.types.ts`               | `jobs.types.ts`              |
