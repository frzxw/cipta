---
name: Debug Failing Job
description: >
  Diagnose and fix a failing BullMQ job in the worker. Use when the user says
  "job is failing", "stuck queue", "worker error", "job stalled", "debug a job",
  or "why is <pipeline> not working".
---

# Debug Failing Job

Systematic diagnosis of a failing BullMQ job in the worker pipeline.

## Trigger

User reports a failing, stuck, or stalled job in any queue.

## Required Input

- **Queue name** or pipeline stage (ingestor, factory, guardian, fleet)
- **Job name** (e.g., `download`, `transcribe`, `render`, `publish`)
- **Error message** (if available)

## Steps

### 1. Check Bull Board

Guide the user to check the Bull Board UI at `http://localhost:3001/admin/queues`:
- Review the failed job's error message and stack trace
- Check the job's data payload for correctness
- Check attempt count vs. max retries

### 2. Check worker logs

```
pnpm --filter worker dev 2>&1 | Select-String -Pattern "error|failed|Error"
```

Look for:
- `job.failed` log entries with `jobId` and `error.message`
- `ffmpeg.error` for rendering failures
- Connection errors to Redis, PostgreSQL, or external APIs

### 3. Verify infrastructure

Check that PostgreSQL and Redis are running and reachable:

```
docker compose ps
```

Test Redis connectivity:
```
docker compose exec redis redis-cli ping
```

### 4. Verify environment variables

Check that required env vars are set in `apps/worker/.env`:
- `DATABASE_URL` — can Prisma connect?
- `REDIS_HOST`, `REDIS_PORT` — correct Redis address?
- `WHISPER_API_KEY`, `LLM_API_KEY` — valid API keys for ingestor jobs?
- `FFMPEG_PATH` — FFmpeg installed and accessible?

### 5. Check entity status in database

Open Prisma Studio to inspect the stuck entity:

```
pnpm --filter @cipta/database exec prisma studio
```

Check:
- Is the entity stuck in an intermediate status (e.g., `DOWNLOADING` without progressing)?
- Does the `Job` record show the correct `status` and `error`?
- Is `workspaceId` populated correctly?

### 6. Reproduce locally

If the error is unclear, add debug logging:
- Set `LOG_LEVEL=debug` in `apps/worker/.env`
- Restart the worker
- Trigger the job again and observe stdout

### 7. Common fixes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `ECONNREFUSED` to Redis | Redis not running | `docker compose up -d redis` |
| `P1001` Prisma error | DB not running | `docker compose up -d postgres` |
| `ETIMEOUT` on yt-dlp | Network/proxy issue | Check `YTDLP_PROXY`, test URL manually |
| `401` from Whisper/LLM | Invalid API key | Verify `WHISPER_API_KEY` / `LLM_API_KEY` |
| FFmpeg `not found` | FFmpeg not on PATH | Install FFmpeg or set `FFMPEG_PATH` |
| Job stuck as `active` | Worker crashed mid-job | Restart worker — BullMQ will mark it stalled and retry |
| `FAILED` but no error | Error lost in catch | Add `logger.error` before re-throw in processor |

### 8. Reset stuck jobs (if needed)

If a job is permanently stuck, manually reset via Bull Board or:

```typescript
// One-time script in apps/worker/
const queue = new Queue('cipta:{queue}', { connection });
const job = await queue.getJob('{jobId}');
await job.retry();
```

## Expected Output

Root cause identified, fix applied, job retried successfully.
