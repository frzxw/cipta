# Cipta — System Architecture

> **Version:** 0.1.0-alpha  
> **Status:** Draft  
> **Last Updated:** 2026-04-11

---

## 1. Architecture Overview

Cipta follows a **modular monorepo** architecture managed by **Turborepo** with **pnpm workspaces**. The system is designed for strict decoupling between the API orchestrator, the processing worker, and the frontend dashboard — connected via a message broker (Redis/BullMQ) and a shared database (PostgreSQL via Prisma).

### Design Principles

| Principle                           | Description                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Strict Decoupling**               | The Worker NEVER imports NestJS modules. Communication is exclusively via BullMQ.                                  |
| **Shared Schema, Isolated Runtime** | Prisma schema lives in `packages/database` and is consumed by both `apps/api` and `apps/worker` as a dependency.   |
| **Queue-Driven Pipeline**           | Every long-running operation is a BullMQ job. The API never processes media directly.                              |
| **Future-Proof Boundaries**         | Module boundaries are drawn so the Node.js Worker can be replaced by Rust/Go without touching the API or Frontend. |
| **Feature-Module Architecture**     | NestJS organizes by feature (not technical layer). Each domain concept is a self-contained module.                 |

---

## 2. High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           CIPTA PLATFORM                                 │
│                                                                          │
│  ┌─────────────┐     ┌─────────────────┐     ┌───────────────────────┐  │
│  │             │     │                 │     │                       │  │
│  │  apps/web   │────▶│    apps/api     │────▶│    apps/worker        │  │
│  │  (Next.js)  │ REST│   (NestJS)      │BULL │   (Node.js TS)       │  │
│  │  Dashboard  │◀────│   Orchestrator  │◀────│   Processing Engine  │  │
│  │             │ WS  │                 │ MQ  │                       │  │
│  └─────────────┘     └────────┬────────┘     └───────────┬───────────┘  │
│                               │                          │               │
│                     ┌─────────▼──────────┐    ┌──────────▼────────┐     │
│                     │                    │    │                   │     │
│                     │  packages/database │    │   External APIs   │     │
│                     │  (Prisma + PG)     │    │   yt-dlp, Whisper │     │
│                     │                    │    │   HeyGen, S3/GCS  │     │
│                     └────────────────────┘    └───────────────────┘     │
│                                                                          │
│                     ┌────────────────────┐                               │
│                     │   Redis (BullMQ)   │                               │
│                     │   Message Broker   │                               │
│                     └────────────────────┘                               │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                     packages/ (shared)                              │ │
│  │  database/  │  shared/  │  ui/  │  eslint-config/  │  ts-config/  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Monorepo Package Architecture

### 3.1 Workspace Layout

```
cipta/
├── apps/
│   ├── api/                # NestJS Orchestrator
│   │   ├── src/
│   │   │   ├── modules/    # Feature modules
│   │   │   │   ├── auth/
│   │   │   │   ├── ingestor/
│   │   │   │   ├── factory/
│   │   │   │   ├── guardian/
│   │   │   │   ├── fleet/
│   │   │   │   ├── workspace/
│   │   │   │   ├── source/
│   │   │   │   ├── chunk/
│   │   │   │   ├── asset/
│   │   │   │   └── account/
│   │   │   ├── common/     # Shared guards, pipes, interceptors, filters
│   │   │   ├── config/     # NestJS ConfigModule setup
│   │   │   └── main.ts
│   │   ├── test/
│   │   └── package.json
│   │
│   ├── web/                # Next.js Control Tower
│   │   ├── app/
│   │   │   ├── (auth)/     # Login, Register (route group)
│   │   │   ├── (dashboard)/# Main dashboard (route group)
│   │   │   │   ├── sources/
│   │   │   │   ├── factory/
│   │   │   │   ├── fleet/
│   │   │   │   ├── assets/
│   │   │   │   └── settings/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   └── package.json
│   │
│   └── worker/             # Standalone Processing Worker
│       ├── src/
│       │   ├── processors/  # Job processors (one per queue)
│       │   │   ├── ingestor.processor.ts
│       │   │   ├── factory.processor.ts
│       │   │   ├── guardian.processor.ts
│       │   │   └── fleet.processor.ts
│       │   ├── services/    # Business logic (FFmpeg, yt-dlp wrappers)
│       │   │   ├── downloader.service.ts
│       │   │   ├── transcriber.service.ts
│       │   │   ├── renderer.service.ts
│       │   │   ├── fingerprint.service.ts
│       │   │   └── publisher.service.ts
│       │   ├── utils/       # Helper functions
│       │   └── main.ts      # Worker entrypoint (connects to BullMQ)
│       └── package.json
│
├── packages/
│   ├── database/            # Prisma schema + generated client
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   └── index.ts     # Re-exports PrismaClient + types
│   │   └── package.json
│   │
│   ├── shared/              # Cross-app shared code
│   │   ├── src/
│   │   │   ├── types/       # Shared TypeScript interfaces & enums
│   │   │   │   ├── jobs.ts  # Job payload types
│   │   │   │   ├── events.ts
│   │   │   │   └── index.ts
│   │   │   ├── constants/   # Queue names, event names, config keys
│   │   │   │   ├── queues.ts
│   │   │   │   └── index.ts
│   │   │   └── utils/       # Pure utility functions
│   │   │       └── index.ts
│   │   └── package.json
│   │
│   ├── ui/                  # React component library (ShadcnUI)
│   ├── eslint-config/
│   └── typescript-config/
│
├── docs/                    # 📍 Documentation (SSoT)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### 3.2 Package Dependency Graph

```
apps/web ──────► packages/ui
         ──────► packages/shared
         ──────► (REST calls to apps/api)

apps/api ──────► packages/database
         ──────► packages/shared
         ──────► (BullMQ dispatch to Redis)

apps/worker ───► packages/database
            ───► packages/shared
            ───► (BullMQ consume from Redis)
            ───► (External: yt-dlp, FFmpeg, Whisper, S3)

packages/ui ───► packages/shared (types only)
```

> **Critical Rule:** `apps/web` NEVER imports from `apps/api` or `apps/worker`. `apps/api` NEVER imports from `apps/worker`. `apps/worker` NEVER imports from `apps/api`.

---

## 4. Communication Protocols

### 4.1 Frontend ↔ API (Synchronous)

| Channel   | Protocol                  | Use Case                                            |
| --------- | ------------------------- | --------------------------------------------------- |
| REST API  | HTTPS (JSON)              | CRUD operations, authentication, configuration      |
| WebSocket | WS (Socket.IO or native)  | Real-time job progress, notifications               |
| SSE       | HTTPS (text/event-stream) | Alternative to WebSocket for job progress (simpler) |

### 4.2 API ↔ Worker (Asynchronous)

| Channel    | Technology     | Use Case                                              |
| ---------- | -------------- | ----------------------------------------------------- |
| Job Queue  | Redis + BullMQ | Dispatch processing jobs (ingest, render, distribute) |
| Job Events | BullMQ Events  | Progress updates, completion, failure callbacks       |

**Queue Design:**

```
┌─────────────────────────────────────────┐
│               Redis Instance            │
│                                         │
│  ┌──────────────┐  ┌────────────────┐  │
│  │ ingestor-q   │  │ factory-q      │  │
│  │ ─────────    │  │ ─────────      │  │
│  │ download     │  │ render-clip    │  │
│  │ transcribe   │  │ add-captions   │  │
│  │ analyze      │  │ add-broll      │  │
│  └──────────────┘  └────────────────┘  │
│                                         │
│  ┌──────────────┐  ┌────────────────┐  │
│  │ guardian-q    │  │ fleet-q        │  │
│  │ ─────────    │  │ ─────────      │  │
│  │ gen-variation │  │ publish        │  │
│  │ strip-meta   │  │ pin-comment    │  │
│  │ spoof-meta   │  │ check-status   │  │
│  └──────────────┘  └────────────────┘  │
└─────────────────────────────────────────┘
```

### 4.3 Data Contract (Job Payload via `packages/shared`)

All job payloads are defined as TypeScript interfaces in `packages/shared/src/types/jobs.ts`. Both the API (producer) and Worker (consumer) import from this shared package — this is the **only** coupling point.

```typescript
// packages/shared/src/types/jobs.ts

export interface IngestJobPayload {
  sourceId: string;
  workspaceId: string;
  url: string;
  quality: 'highest' | '1080p' | '720p';
}

export interface RenderJobPayload {
  chunkId: string;
  workspaceId: string;
  renderProfileId: string;
  outputFormat: 'mp4';
  resolution: { width: number; height: number };
}

export interface VariationJobPayload {
  assetId: string;
  workspaceId: string;
  variationCount: number;
  guardianConfig: GuardianConfig;
}

export interface DistributeJobPayload {
  assetId: string;
  accountId: string;
  clusterId: string;
  scheduledAt: string; // ISO 8601
  caption: string;
  pinnedComment?: string;
}
```

---

## 5. NestJS API Architecture (`apps/api`)

### 5.1 Module Structure

Following NestJS best practices: **feature-module architecture** with strict dependency injection.

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/         # Passport strategies
│   │   │   ├── jwt.strategy.ts
│   │   │   └── local.strategy.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── register.dto.ts
│   │
│   ├── ingestor/
│   │   ├── ingestor.module.ts
│   │   ├── ingestor.controller.ts  # REST endpoints
│   │   ├── ingestor.service.ts     # Business logic + queue dispatch
│   │   └── dto/
│   │       └── create-source.dto.ts
│   │
│   ├── factory/
│   │   ├── factory.module.ts
│   │   ├── factory.controller.ts
│   │   ├── factory.service.ts
│   │   └── dto/
│   │
│   ├── guardian/
│   │   ├── guardian.module.ts
│   │   ├── guardian.controller.ts
│   │   ├── guardian.service.ts
│   │   └── dto/
│   │
│   ├── fleet/
│   │   ├── fleet.module.ts
│   │   ├── fleet.controller.ts
│   │   ├── fleet.service.ts
│   │   └── dto/
│   │
│   ├── workspace/
│   │   ├── workspace.module.ts
│   │   ├── workspace.controller.ts
│   │   ├── workspace.service.ts
│   │   └── dto/
│   │
│   └── job/                       # Job status tracking
│       ├── job.module.ts
│       ├── job.controller.ts       # GET /jobs/:id/status
│       ├── job.service.ts
│       └── job.gateway.ts          # WebSocket gateway for real-time
│
├── common/
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── interceptors/
│   │   ├── transform.interceptor.ts
│   │   └── logging.interceptor.ts
│   ├── pipes/
│   │   └── validation.pipe.ts
│   └── decorators/
│       ├── current-user.decorator.ts
│       └── workspace.decorator.ts
│
├── config/
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── redis.config.ts
│   ├── jwt.config.ts
│   └── storage.config.ts
│
├── app.module.ts                   # Root module
└── main.ts                         # Bootstrap
```

### 5.2 NestJS Service ↔ Queue Interaction

The API service dispatches jobs but **never** executes them:

```typescript
// apps/api/src/modules/ingestor/ingestor.service.ts
@Injectable()
export class IngestorService {
  constructor(
    @InjectQueue(QUEUE_NAMES.INGESTOR) private ingestorQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async createSource(dto: CreateSourceDto, user: User): Promise<Source> {
    // 1. Validate and save Source record to DB
    const source = await this.prisma.source.create({ ... });

    // 2. Dispatch job to Worker via BullMQ
    await this.ingestorQueue.add('download', {
      sourceId: source.id,
      workspaceId: user.workspaceId,
      url: dto.url,
      quality: dto.quality ?? 'highest',
    } satisfies IngestJobPayload);

    // 3. Return Source record (processing happens async)
    return source;
  }
}
```

---

## 6. Worker Architecture (`apps/worker`)

### 6.1 Design Constraints

| Constraint                           | Rationale                               |
| ------------------------------------ | --------------------------------------- |
| **Zero NestJS imports**              | Worker must be replaceable with Rust/Go |
| **BullMQ only communication**        | No direct HTTP calls to the API         |
| **Shared types via `@cipta/shared`** | Type safety without runtime coupling    |
| **Shared DB via `@cipta/database`**  | Direct Prisma access for status updates |
| **Stateless processing**             | Any Worker instance can handle any job  |

### 6.2 Worker Entrypoint

```typescript
// apps/worker/src/main.ts
import { Worker as BullWorker } from 'bullmq';
import { PrismaClient } from '@cipta/database';
import { QUEUE_NAMES } from '@cipta/shared';
import { IngestorProcessor } from './processors/ingestor.processor';
import { FactoryProcessor } from './processors/factory.processor';
import { GuardianProcessor } from './processors/guardian.processor';
import { FleetProcessor } from './processors/fleet.processor';

const redis = { host: process.env.REDIS_HOST, port: +process.env.REDIS_PORT };
const prisma = new PrismaClient();

// One BullMQ Worker per queue
const ingestorWorker = new BullWorker(QUEUE_NAMES.INGESTOR, new IngestorProcessor(prisma).process, {
  connection: redis,
  concurrency: 3,
});

const factoryWorker = new BullWorker(
  QUEUE_NAMES.FACTORY,
  new FactoryProcessor(prisma).process,
  { connection: redis, concurrency: 2 }, // CPU-heavy, lower concurrency
);

// ... guardian, fleet workers similarly

console.log('🏭 Cipta Worker started. Listening for jobs...');
```

---

## 7. Database Architecture

### 7.1 Technology

- **ORM:** Prisma (latest stable)
- **Database:** PostgreSQL 16+
- **Package:** `packages/database` — single schema, shared client

### 7.2 Multi-Tenancy Strategy

**Workspace-level row-based multi-tenancy.** Every data table includes a `workspaceId` foreign key. All queries are scoped by workspace.

```sql
-- Every query MUST include workspace scoping
SELECT * FROM "Source" WHERE "workspaceId" = $1 AND "id" = $2;
```

### 7.3 Schema Location

Full schema definition: [`docs/ERD.md`](./ERD.md)

---

## 8. Infrastructure & Deployment

### 8.1 Development Environment

| Component        | Technology                 |
| ---------------- | -------------------------- |
| Runtime          | Node.js 22 LTS             |
| Package Manager  | pnpm 9.x                   |
| Build System     | Turborepo                  |
| Database         | PostgreSQL 16 (Docker)     |
| Message Broker   | Redis 7+ (Docker)          |
| Video Processing | FFmpeg 7+ (system install) |
| Media Download   | yt-dlp (system install)    |

### 8.2 Docker Compose (Development)

```yaml
# docker-compose.yml (development)
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: cipta
      POSTGRES_USER: cipta
      POSTGRES_PASSWORD: cipta_dev
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    command: redis-server --appendonly yes
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

### 8.3 Production Architecture (Target)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   CDN        │     │  Load        │     │  API Containers  │
│  (Cloudflare)│────▶│  Balancer    │────▶│  (NestJS × N)    │
└──────────────┘     └──────────────┘     └────────┬─────────┘
                                                    │
                     ┌──────────────────────────────▼──────────┐
                     │         Managed Redis                   │
                     │    (Upstash / ElastiCache)              │
                     └──────────────────────────────┬──────────┘
                                                    │
                     ┌──────────────────────────────▼──────────┐
                     │       Worker Pool                       │
                     │  (Node.js × N, GPU instances optional)  │
                     └──────────────────────────────┬──────────┘
                                                    │
          ┌────────────────────┐    ┌───────────────▼────────┐
          │   PostgreSQL       │    │   Cloud Storage        │
          │   (Supabase/RDS)   │    │   (S3 / GCS)           │
          └────────────────────┘    └────────────────────────┘
```

---

## 9. Security Architecture

| Layer                | Implementation                                               |
| -------------------- | ------------------------------------------------------------ |
| **Authentication**   | JWT (access + refresh tokens) via Passport.js                |
| **Authorization**    | Role-based (Owner, Admin, Member) via NestJS Guards          |
| **Input Validation** | `class-validator` + `class-transformer` on all DTOs          |
| **Rate Limiting**    | `@nestjs/throttler` — 100 req/min per user                   |
| **CORS**             | Strict origin whitelist                                      |
| **Data Isolation**   | Workspace-scoped queries on every DB operation               |
| **Secrets**          | Environment variables via `@nestjs/config` — never committed |

See [`docs/specs/AUTH.md`](./specs/AUTH.md) for detailed auth specification.

---

## 10. Observability

| Concern        | Tool                           | Location                           |
| -------------- | ------------------------------ | ---------------------------------- |
| API Logging    | Structured JSON (pino/winston) | `apps/api`                         |
| Worker Logging | Structured JSON                | `apps/worker`                      |
| Job Monitoring | Bull Board                     | Embedded in API at `/admin/queues` |
| Error Tracking | Sentry (future)                | All apps                           |
| Metrics        | Prometheus + Grafana (future)  | Infrastructure                     |
| Tracing        | Correlation IDs in all logs    | `X-Request-Id` header              |

---

## 11. Future Architecture: AI Agentic Soul

The architecture is designed to support future injection of **AI Agents** (ReAct pattern):

```
┌─────────────────────────────────────────────┐
│          AI Agent (per Cluster)             │
│  ┌───────────────────────────────────────┐  │
│  │  Observe: Read engagement analytics   │  │
│  │  Think:   LLM decides content strategy│  │
│  │  Act:     Call internal APIs to ingest,│  │
│  │           configure render profiles,  │  │
│  │           and schedule distribution   │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Internal APIs Consumed:                    │
│  - POST /api/sources (ingest new content)   │
│  - POST /api/factory/render (trigger render) │
│  - POST /api/fleet/schedule (set schedule)   │
│  - GET  /api/analytics/:clusterId           │
└─────────────────────────────────────────────┘
```

Every module exposes a service-level API that can be consumed by both REST controllers AND future AI agents. The agent is just another consumer of the same internal service layer.
