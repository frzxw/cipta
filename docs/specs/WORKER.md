# Cipta — Worker Architecture Specification

> **Package:** `apps/worker`  
> **Runtime:** Standalone Node.js (TypeScript)  
> **Communication:** Redis/BullMQ only  
> **Critical Constraint:** ZERO NestJS imports  
> **Last Updated:** 2026-04-11

---

## 1. Design Philosophy

The Worker is the **muscle** of the Cipta platform. It performs all CPU/GPU-intensive operations (video processing, media downloading, AI API calls) as a standalone Node.js process.

### Core Constraints

| Constraint                           | Rationale                                       |
| ------------------------------------ | ----------------------------------------------- |
| **No NestJS imports**                | Worker must be replaceable with Rust/Go         |
| **BullMQ-only communication**        | No HTTP calls to the API server                 |
| **Direct DB access via Prisma**      | Reads/writes status updates directly            |
| **Shared types via `@cipta/shared`** | Type-safe job payloads without runtime coupling |
| **Stateless**                        | Any worker instance can process any job         |
| **Horizontal scaling**               | Add more worker instances for more throughput   |

---

## 2. Architecture

```text
┌────────────────────────────────────────────────────────┐
│                    apps/worker                          │
│                                                        │
│  main.ts (Entrypoint)                                  │
│    │                                                   │
│    ├── BullMQ Worker: ingestor-queue                   │
│    │   └── IngestorProcessor                           │
│    │       ├── DownloaderService (yt-dlp)               │
│    │       ├── TranscriberService (Whisper API)         │
│    │       └── AnalyzerService (LLM API)               │
│    │                                                   │
│    ├── BullMQ Worker: factory-queue                     │
│    │   └── FactoryProcessor                            │
│    │       ├── RendererService (FFmpeg)                 │
│    │       ├── CaptionService (ASS generation)         │
│    │       └── FramingService (face detection)         │
│    │                                                   │
│    ├── BullMQ Worker: guardian-queue                    │
│    │   └── GuardianProcessor                           │
│    │       ├── FingerprintService (variation gen)      │
│    │       └── MetadataService (spoofing)              │
│    │                                                   │
│    └── BullMQ Worker: fleet-queue                      │
│        └── FleetProcessor                              │
│            ├── PublisherService (platform APIs)         │
│            └── HealthCheckService                      │
│                                                        │
│  Shared:                                               │
│    ├── PrismaClient (@cipta/database)                  │
│    ├── StorageClient (S3/GCS)                          │
│    ├── Logger (pino)                                   │
│    └── Config (dotenv)                                 │
└────────────────────────────────────────────────────────┘
```

---

## 3. Entrypoint (`main.ts`)

```typescript
// apps/worker/src/main.ts

import { Worker } from 'bullmq';
import { PrismaClient } from '@cipta/database';
import { QUEUE_NAMES } from '@cipta/shared';
import { createLogger } from './utils/logger';
import { loadConfig } from './config';
import { createStorageClient } from './services/storage.service';

// Processors
import { createIngestorProcessor } from './processors/ingestor.processor';
import { createFactoryProcessor } from './processors/factory.processor';
import { createGuardianProcessor } from './processors/guardian.processor';
import { createFleetProcessor } from './processors/fleet.processor';

async function bootstrap() {
  const config = loadConfig();
  const logger = createLogger('cipta-worker');
  const prisma = new PrismaClient();
  const storage = createStorageClient(config.storage);

  await prisma.$connect();
  logger.info('Database connected');

  const redisConnection = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
  };

  // Context passed to all processors
  const context = { prisma, storage, logger, config };

  // Start workers
  const workers = [
    new Worker(QUEUE_NAMES.INGESTOR, createIngestorProcessor(context), {
      connection: redisConnection,
      concurrency: config.concurrency.ingestor,
    }),
    new Worker(QUEUE_NAMES.FACTORY, createFactoryProcessor(context), {
      connection: redisConnection,
      concurrency: config.concurrency.factory,
    }),
    new Worker(QUEUE_NAMES.GUARDIAN, createGuardianProcessor(context), {
      connection: redisConnection,
      concurrency: config.concurrency.guardian,
    }),
    new Worker(QUEUE_NAMES.FLEET, createFleetProcessor(context), {
      connection: redisConnection,
      concurrency: config.concurrency.fleet,
    }),
  ];

  // Event handlers
  workers.forEach((worker) => {
    worker.on('completed', (job) => {
      logger.info({ jobId: job.id, queue: job.queueName }, 'Job completed');
    });

    worker.on('failed', (job, error) => {
      logger.error({ jobId: job?.id, queue: job?.queueName, error: error.message }, 'Job failed');
    });

    worker.on('error', (error) => {
      logger.error({ error: error.message }, 'Worker error');
    });
  });

  logger.info(
    {
      queues: Object.values(QUEUE_NAMES),
      concurrency: config.concurrency,
    },
    '🏭 Cipta Worker started',
  );

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down worker...');
    await Promise.all(workers.map((w) => w.close()));
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});
```

---

## 4. Processor Pattern

Each processor is a factory function that returns a BullMQ processor callback:

```typescript
// apps/worker/src/processors/ingestor.processor.ts

import { Job } from 'bullmq';
import { WorkerContext } from '../types';
import { IngestJobPayload } from '@cipta/shared';
import { DownloaderService } from '../services/downloader.service';
import { TranscriberService } from '../services/transcriber.service';
import { AnalyzerService } from '../services/analyzer.service';

export function createIngestorProcessor(ctx: WorkerContext) {
  const downloader = new DownloaderService(ctx);
  const transcriber = new TranscriberService(ctx);
  const analyzer = new AnalyzerService(ctx);

  return async function process(job: Job<IngestJobPayload>) {
    const { logger, prisma } = ctx;

    try {
      switch (job.name) {
        case 'download':
          await downloader.execute(job);
          break;
        case 'transcribe':
          await transcriber.execute(job);
          break;
        case 'analyze':
          await analyzer.execute(job);
          break;
        default:
          throw new Error(`Unknown job name: ${job.name}`);
      }
    } catch (error) {
      // Update job record in DB
      await prisma.job.update({
        where: { bullJobId: job.id },
        data: {
          status: 'FAILED',
          error: error.message,
          completedAt: new Date(),
        },
      });
      throw error; // Re-throw so BullMQ handles retries
    }
  };
}
```

---

## 5. Worker Context

```typescript
// apps/worker/src/types.ts

import { PrismaClient } from '@cipta/database';
import { Logger } from 'pino';
import { StorageClient } from './services/storage.service';
import { WorkerConfig } from './config';

export interface WorkerContext {
  prisma: PrismaClient;
  storage: StorageClient;
  logger: Logger;
  config: WorkerConfig;
}
```

---

## 6. Queue Configuration

### 6.1 Queue Names (`@cipta/shared`)

```typescript
// packages/shared/src/constants/queues.ts

export const QUEUE_NAMES = {
  INGESTOR: 'cipta:ingestor',
  FACTORY: 'cipta:factory',
  GUARDIAN: 'cipta:guardian',
  FLEET: 'cipta:fleet',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
```

### 6.2 Default Job Options

```typescript
// packages/shared/src/constants/queues.ts

export const DEFAULT_JOB_OPTIONS = {
  [QUEUE_NAMES.INGESTOR]: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { age: 86400, count: 1000 }, // 24 hours
    removeOnFail: { age: 604800, count: 5000 }, // 7 days
  },
  [QUEUE_NAMES.FACTORY]: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: { age: 86400, count: 500 },
    removeOnFail: { age: 604800, count: 2000 },
  },
  [QUEUE_NAMES.GUARDIAN]: {
    attempts: 1,
    removeOnComplete: { age: 86400, count: 500 },
    removeOnFail: { age: 604800, count: 2000 },
  },
  [QUEUE_NAMES.FLEET]: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 300000 }, // 5 min between retries
    removeOnComplete: { age: 172800, count: 5000 },
    removeOnFail: { age: 604800, count: 5000 },
  },
} as const;
```

---

## 7. Progress Reporting

Workers report progress back to BullMQ, which the API reads and forwards to the UI:

```typescript
// Inside a service method
async execute(job: Job<RenderJobPayload>) {
  // Report progress as percentage
  await job.updateProgress(10); // 10% - downloaded chunk

  // ... processing ...

  await job.updateProgress(50); // 50% - FFmpeg rendering

  // ... more processing ...

  await job.updateProgress(90); // 90% - uploading to storage

  // Also update the Job record in DB for persistence
  await this.ctx.prisma.job.update({
    where: { bullJobId: job.id },
    data: { progress: 90, status: 'ACTIVE' },
  });

  await job.updateProgress(100); // 100% - done
}
```

---

## 8. Job Chaining

Some jobs trigger follow-up jobs upon completion. The Worker creates new jobs directly on the queue:

```typescript
import { Queue } from 'bullmq';
import { QUEUE_NAMES, DEFAULT_JOB_OPTIONS } from '@cipta/shared';

// After download completes, chain to transcribe
const ingestorQueue = new Queue(QUEUE_NAMES.INGESTOR, { connection: redis });

await ingestorQueue.add(
  'transcribe',
  {
    sourceId: job.data.sourceId,
    workspaceId: job.data.workspaceId,
    storagePath: uploadedPath,
    language: 'en',
  },
  DEFAULT_JOB_OPTIONS[QUEUE_NAMES.INGESTOR],
);
```

### Chain Diagram

```text
ingestor:download ──► ingestor:transcribe ──► ingestor:analyze
                                                     │
                                                     ▼ (user approval)
factory:render ──► guardian:generate-variations
                                     │
                                     ▼ (user triggers distribution)
                              fleet:publish
```

---

## 9. Storage Service

```typescript
// apps/worker/src/services/storage.service.ts

export interface StorageClient {
  upload(localPath: string, remotePath: string): Promise<string>; // returns URL
  download(remotePath: string, localPath: string): Promise<void>;
  delete(remotePath: string): Promise<void>;
  getSignedUrl(remotePath: string, expirySeconds: number): Promise<string>;
}

// Implementations
export class S3StorageClient implements StorageClient { ... }
export class GCSStorageClient implements StorageClient { ... }
export class LocalStorageClient implements StorageClient { ... } // Dev only

export function createStorageClient(config: StorageConfig): StorageClient {
  switch (config.provider) {
    case 's3': return new S3StorageClient(config);
    case 'gcs': return new GCSStorageClient(config);
    case 'local': return new LocalStorageClient(config);
    default: throw new Error(`Unknown storage provider: ${config.provider}`);
  }
}
```

### Storage Path Convention

```text
{workspace_id}/
├── sources/
│   ├── {source_id}/
│   │   ├── original.mp4
│   │   └── thumbnail.jpg
├── chunks/
│   ├── {chunk_id}.mp4
├── assets/
│   ├── {asset_id}.mp4
└── variations/
    ├── {variation_id}.mp4
```

---

## 10. Logging

Use **pino** for structured JSON logging:

```typescript
import pino from 'pino';

export function createLogger(name: string) {
  return pino({
    name,
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}
```

**Log format:**

```json
{
  "level": "info",
  "time": "2026-04-11T08:00:00.000Z",
  "name": "cipta-worker",
  "jobId": "job_xyz789",
  "queue": "cipta:ingestor",
  "msg": "Download completed",
  "durationMs": 12340
}
```

---

## 11. Configuration

```typescript
// apps/worker/src/config.ts

export interface WorkerConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  concurrency: {
    ingestor: number;
    factory: number;
    guardian: number;
    fleet: number;
  };
  storage: {
    provider: 's3' | 'gcs' | 'local';
    bucket: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    localPath?: string;
  };
  ffmpeg: {
    path: string;
    hwAccel: 'auto' | 'nvenc' | 'videotoolbox' | 'none';
  };
  tempDir: string;
}

export function loadConfig(): WorkerConfig {
  return {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
    concurrency: {
      ingestor: parseInt(process.env.WORKER_CONCURRENCY_INGEST || '3'),
      factory: parseInt(process.env.WORKER_CONCURRENCY_FACTORY || '2'),
      guardian: parseInt(process.env.WORKER_CONCURRENCY_GUARDIAN || '5'),
      fleet: parseInt(process.env.WORKER_CONCURRENCY_FLEET || '3'),
    },
    storage: {
      provider: (process.env.STORAGE_PROVIDER as 's3' | 'gcs' | 'local') || 'local',
      bucket: process.env.STORAGE_BUCKET || 'cipta-dev',
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      localPath: process.env.STORAGE_LOCAL_PATH || './storage',
    },
    ffmpeg: {
      path: process.env.FFMPEG_PATH || 'ffmpeg',
      hwAccel: (process.env.FFMPEG_HW_ACCEL as any) || 'auto',
    },
    tempDir: process.env.WORKER_TEMP_DIR || '/tmp/cipta',
  };
}
```

---

## 12. Graceful Shutdown

The worker must handle shutdown signals to avoid leaving jobs in a broken state:

1. **SIGTERM/SIGINT** received
2. Stop accepting new jobs (`.close()`)
3. Wait for currently processing jobs to complete (timeout: 30s)
4. If timeout exceeded, let BullMQ mark jobs as stalled (auto-retry)
5. Disconnect from Prisma
6. Exit process

---

## 13. Scaling Strategy

| Scale Level           | Configuration                                    | Use Case          |
| --------------------- | ------------------------------------------------ | ----------------- |
| **Single instance**   | 1 worker process, all queues                     | Development       |
| **Per-queue workers** | 1 process per queue type                         | Small production  |
| **Horizontal**        | N instances of same worker image                 | Medium production |
| **GPU-specialized**   | Factory/Guardian on GPU instances, others on CPU | Large production  |

Workers are stateless — scale by simply running more instances. BullMQ handles job distribution automatically.

---

## 14. Testing

### 14.1 Unit Tests

| Test                          | File                         |
| ----------------------------- | ---------------------------- |
| Config loading and validation | `config.spec.ts`             |
| Storage path construction     | `storage.service.spec.ts`    |
| Job chaining logic            | `ingestor.processor.spec.ts` |
| Progress calculation          | `renderer.service.spec.ts`   |

### 14.2 Integration Tests

| Test                                          | File                           |
| --------------------------------------------- | ------------------------------ |
| Worker processes a mock ingest job end-to-end | `ingestor.integration-spec.ts` |
| Factory processor renders a test video        | `factory.integration-spec.ts`  |
| Guardian generates unique hashes              | `guardian.integration-spec.ts` |
| Graceful shutdown during active job           | `worker.integration-spec.ts`   |
