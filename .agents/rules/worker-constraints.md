---
name: worker-constraints
description: >
  Load when writing or modifying code in apps/worker. Enforces the standalone Worker
  architecture: zero NestJS imports, BullMQ-only communication, processor/service pattern,
  job chaining, progress reporting, and graceful shutdown. Triggers on: worker code,
  processor creation, BullMQ job handling, FFmpeg usage, yt-dlp integration.
---

# Worker Constraints

## 1. Absolute Rules

- **ZERO NestJS imports.** The Worker is a standalone Node.js application. Never import any `@nestjs/*` package.
- **BullMQ-only communication.** The Worker never makes HTTP calls to the API server.
- **Direct Prisma DB access.** The Worker reads/writes status updates directly via `@cipta/database`.
- **Shared types only.** Import job payloads and queue names from `@cipta/shared`. This is the only coupling.
- **Stateless.** Any Worker instance can process any job. No in-memory state between jobs.

## 2. Processor Pattern

Each processor is a **factory function** returning a BullMQ processor callback:

```typescript
export function createXxxProcessor(ctx: WorkerContext) {
  const serviceName = new XxxService(ctx);
  return async function process(job: Job<XxxJobPayload>) {
    switch (job.name) {
      case 'action-name': await serviceName.execute(job); break;
      default: throw new Error(`Unknown job name: ${job.name}`);
    }
  };
}
```

- Processors are **thin dispatchers** — delegate all heavy logic to service classes.
- Always catch errors, update the `Job` record in DB to `FAILED`, then re-throw for BullMQ retry handling.

## 3. Worker Context

All processors and services receive a shared `WorkerContext`:

```typescript
interface WorkerContext {
  prisma: PrismaClient;
  storage: StorageClient;
  logger: Logger;     // pino
  config: WorkerConfig;
}
```

## 4. Queue Names

Always use constants from `@cipta/shared`:
- `cipta:ingestor` — download, transcribe, analyze
- `cipta:factory` — render
- `cipta:guardian` — generate-variations
- `cipta:fleet` — publish, check-health

## 5. Progress Reporting

- Always update job progress via `job.updateProgress(percent)` at meaningful milestones.
- Also persist progress to the `Job` table in Prisma for dashboard queries.
- Always update entity status enums at each pipeline stage transition.

## 6. Job Chaining

- After a job completes, dispatch follow-up jobs directly by creating a new `Queue` instance.
- Chain diagram: `download → transcribe → analyze → [user approval] → render → generate-variations → [user triggers] → publish`
- Include `_meta: { requestId, userId }` in chained job payloads for log correlation.

## 7. Error Handling

- Always catch errors in processors and update the entity status to `FAILED`.
- Record the error message in the `Job.error` field.
- Re-throw the error so BullMQ can handle retries according to the job options.
- Use structured error logging with `logger.error({ jobId, queue, error: error.message })`.

## 8. Concurrency Defaults

| Queue | Default Concurrency | Rationale |
|-------|-------------------|-----------|
| Ingestor | 3 | Network I/O bound |
| Factory | 2 | CPU/GPU heavy |
| Guardian | 5 | Batch-oriented, parallelizable |
| Fleet | 3 | API call bound |

## 9. Temp File Management

- All temporary files go to `WORKER_TEMP_DIR` (default: `/tmp/cipta`).
- Organize by job: `{tempDir}/{processorName}/{jobId}/`.
- Clean up temp directories after successful upload to Cloud Storage.
- Stale temp files older than 24 hours should be deletable.

## 10. Graceful Shutdown

1. Listen for `SIGTERM` and `SIGINT`.
2. Call `.close()` on all BullMQ Worker instances (stop accepting new jobs).
3. Wait for currently processing jobs to complete (timeout: 30 seconds).
4. Disconnect Prisma.
5. Exit process.

## 11. Storage Service

- Always use the `StorageClient` interface for file operations (upload, download, delete, getSignedUrl).
- Implementations: `S3StorageClient`, `GCSStorageClient`, `LocalStorageClient`.
- Factory: `createStorageClient(config)` selects based on `STORAGE_PROVIDER`.
- Storage paths follow: `{workspaceId}/{entityType}/{entityId}.{ext}`
