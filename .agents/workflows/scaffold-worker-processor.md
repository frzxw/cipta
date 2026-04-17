---
name: Scaffold Worker Processor
description: >
  Create a new BullMQ worker processor with its service files inside apps/worker.
  Use when the user says "add a worker processor", "create a new queue handler",
  "scaffold worker service", or "add background job processing for <feature>".
---

# Scaffold Worker Processor

Creates a BullMQ processor and its associated service(s) inside `apps/worker/src/`.

## Trigger

User asks to add a new background job processor or worker service.

## Required Input

- **Processor name** (e.g., `ingestor`, `factory`, `guardian`, `fleet`)
- **Queue name constant** from `@cipta/shared` (e.g., `QUEUE_NAMES.INGESTOR`)
- **Job names** this processor handles (e.g., `download`, `transcribe`, `analyze`)
- **Service names** to create (e.g., `DownloaderService`, `TranscriberService`)

## Steps

### 1. Register queue name in shared package

If the queue name doesn't exist yet, add it to `packages/shared/src/constants/queues.ts`:

```typescript
export const QUEUE_NAMES = {
  // ... existing
  NEW_QUEUE: 'cipta:{name}',
} as const;
```

Also add the job payload interface to `packages/shared/src/types/jobs.ts`.

### 2. Create processor file

Create `apps/worker/src/processors/{name}.processor.ts` using the **factory function pattern**:

```typescript
import { Job } from 'bullmq';
import { WorkerContext } from '../types';

export function create{Name}Processor(ctx: WorkerContext) {
  // Instantiate services here
  return async function process(job: Job) {
    switch (job.name) {
      case 'job-name': /* delegate to service */ break;
      default: throw new Error(`Unknown job: ${job.name}`);
    }
  };
}
```

**Critical rules:**
- ZERO NestJS imports.
- Receive `WorkerContext` (prisma, storage, logger, config).
- Processors are thin dispatchers — delegate to service classes.
- Catch errors, update `Job` DB record to `FAILED`, re-throw for BullMQ retry.

### 3. Create service files

For each service, create `apps/worker/src/services/{name}.service.ts`:

- Constructor receives `WorkerContext`.
- Main method: `async execute(job: Job<PayloadType>): Promise<void>`.
- Report progress: `await job.updateProgress(percent)`.
- Update entity status transitions in Prisma.
- Chain follow-up jobs by creating a new `Queue` instance if needed.
- Always clean up temp files on success.

### 4. Register processor in main.ts

Add the new worker to `apps/worker/src/main.ts`:

```typescript
new Worker(
  QUEUE_NAMES.NEW_QUEUE,
  create{Name}Processor(context),
  { connection: redisConnection, concurrency: config.concurrency.{name} }
),
```

### 5. Add concurrency config

Add default concurrency to `apps/worker/src/config.ts` and the corresponding env var `WORKER_CONCURRENCY_{NAME}`.

### 6. Create unit tests

Create `apps/worker/src/services/{name}.service.spec.ts`:
- Use `vitest` (not Jest).
- Mock the `WorkerContext` (prisma, storage, logger, config).
- Test the main processing logic, progress reporting, and error handling.

### 7. Verify

// turbo
```
bash scripts/verify.sh build
```

## Expected Output

A new processor + service(s) registered in the worker, with unit tests, building successfully.
