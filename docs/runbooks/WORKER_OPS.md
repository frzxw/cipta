# Runbook: Worker Operations

> **Audience:** Backend Engineers, DevOps  
> **Component:** `apps/worker` + Redis/BullMQ  
> **Last Updated:** 2026-04-11

---

## 1. Worker Health Overview

### 1.1 Health Indicators

| Indicator           | Healthy               | Degraded       | Critical               |
| ------------------- | --------------------- | -------------- | ---------------------- |
| Queue depth         | < 50 pending          | 50-200 pending | > 200 pending          |
| Job processing time | Within expected range | 2× expected    | 5× expected or stalled |
| Failed job rate     | < 2%                  | 2-10%          | > 10%                  |
| Worker memory       | < 2GB RSS             | 2-4GB          | > 4GB (memory leak)    |
| Disk space (temp)   | > 20GB free           | 5-20GB         | < 5GB                  |
| Redis memory        | < 50% of max          | 50-80%         | > 80%                  |

### 1.2 Monitoring Dashboard (Bull Board)

```
URL: http://localhost:3001/admin/queues  (dev)
URL: https://api.cipta.app/admin/queues  (prod, behind auth)
```

Shows per-queue: active, waiting, completed, failed, delayed counts.

---

## 2. Queue Management

### 2.1 Inspect Queues via Redis CLI

```bash
# Connect to Redis
redis-cli -h $REDIS_HOST

# List all BullMQ keys
KEYS bull:cipta:*

# Count waiting jobs per queue
LLEN bull:cipta:ingestor:wait
LLEN bull:cipta:factory:wait
LLEN bull:cipta:guardian:wait
LLEN bull:cipta:fleet:wait

# Count active jobs
SCARD bull:cipta:ingestor:active
SCARD bull:cipta:factory:active

# Recent failed job IDs
ZRANGE bull:cipta:factory:failed 0 10

# Get details of a specific job
HGETALL bull:cipta:factory:JOB_ID
```

### 2.2 Inspect Queues via BullMQ API (Programmatic)

```typescript
import { Queue } from 'bullmq';

const queue = new Queue('cipta:factory', { connection: redis });

// Get counts
const counts = await queue.getJobCounts('waiting', 'active', 'failed', 'delayed');
console.log(counts);
// { waiting: 12, active: 2, failed: 3, delayed: 0 }

// Get failed jobs with error details
const failedJobs = await queue.getFailed(0, 10);
failedJobs.forEach((job) => {
  console.log(job.id, job.failedReason, job.data);
});
```

---

## 3. Stuck / Stalled Jobs

### 3.1 Symptoms

- Job shows as `active` but no progress for > 10 minutes
- Worker logs stop for a specific job ID
- Bull Board shows jobs in `active` state indefinitely

### 3.2 Root Causes

| Cause                | Diagnosis                                    | Fix                        |
| -------------------- | -------------------------------------------- | -------------------------- |
| FFmpeg hanging       | Worker process at high CPU, no stderr output | Kill + retry               |
| yt-dlp hanging       | Worker process idle, connection timeout      | Kill + retry               |
| External API timeout | Worker waiting on Whisper/LLM                | Set request timeout        |
| Memory exhaustion    | OOM killer terminates worker                 | Increase memory limit      |
| Redis disconnect     | Worker lost connection mid-job               | BullMQ auto-stall recovery |
| Deadlock in DB       | Worker blocked on Prisma query               | Check `pg_stat_activity`   |

### 3.3 Recovery

```bash
# Option 1: Let BullMQ handle it (automatic)
# BullMQ has a built-in stall check. If a job doesn't call `updateProgress()`
# within `stalledInterval` (default: 30s), it's moved back to waiting.

# Option 2: Manual retry of failed jobs
redis-cli -h $REDIS_HOST
# Move all failed jobs back to waiting
SCRIPT LOAD "local jobs = redis.call('ZRANGE', KEYS[1], 0, -1) for i, job in ipairs(jobs) do redis.call('RPUSH', KEYS[2], job) redis.call('ZREM', KEYS[1], job) end return #jobs"

# Option 3: Restart the worker
docker compose restart worker

# Option 4: Nuclear — drain and restart the queue
# ⚠️ This deletes ALL jobs in the queue
```

```typescript
// Programmatic: Retry all failed jobs
const queue = new Queue('cipta:factory', { connection: redis });
const failedJobs = await queue.getFailed(0, 1000);

for (const job of failedJobs) {
  await job.retry();
}
console.log(`Retried ${failedJobs.length} failed jobs`);
```

---

## 4. Scaling Workers

### 4.1 When to Scale

| Signal                             | Action                                |
| ---------------------------------- | ------------------------------------- |
| Queue depth > 50 for > 5 minutes   | Add 1 worker instance                 |
| Queue depth > 200                  | Add 2-3 worker instances              |
| Average processing time increasing | Check for resource bottleneck         |
| CPU usage > 80% sustained          | Add worker on new node                |
| GPU utilization < 30%              | Increase `WORKER_CONCURRENCY_FACTORY` |

### 4.2 How to Scale

```bash
# Docker Compose: scale worker replicas
docker compose -f docker-compose.prod.yml up -d --scale worker=4

# Kubernetes: scale deployment
kubectl scale deployment cipta-worker --replicas=4

# Verify: check all workers are consuming from queues
redis-cli -h $REDIS_HOST
PUBSUB NUMSUB bull:cipta:ingestor bull:cipta:factory bull:cipta:guardian bull:cipta:fleet
```

### 4.3 Concurrency Tuning

| Queue      | Default Concurrency | CPU Bound?             | Guidance                                |
| ---------- | ------------------- | ---------------------- | --------------------------------------- |
| `ingestor` | 3                   | I/O bound (download)   | ↑ to 5-10 if bandwidth allows           |
| `factory`  | 2                   | CPU/GPU heavy (FFmpeg) | ↑ only if GPU is available              |
| `guardian` | 5                   | CPU heavy (FFmpeg × N) | ↓ if memory constrained                 |
| `fleet`    | 3                   | I/O bound (API calls)  | ↑ to 5-10 if platform rate limits allow |

```bash
# Override per-instance via env vars
WORKER_CONCURRENCY_INGEST=5
WORKER_CONCURRENCY_FACTORY=1    # Lower for CPU-only nodes
WORKER_CONCURRENCY_GUARDIAN=3
WORKER_CONCURRENCY_FLEET=5
```

---

## 5. FFmpeg Troubleshooting

### 5.1 Common FFmpeg Errors

| Error                                      | Cause                     | Fix                           |
| ------------------------------------------ | ------------------------- | ----------------------------- |
| `No such file or directory`                | Input file not downloaded | Check storage download step   |
| `Invalid data found when processing input` | Corrupt download          | Re-download source            |
| `Avi not finished (-1, 0)`                 | Interrupted write         | Check disk space              |
| `Cannot find a matching stream`            | Codec mismatch            | Check input format            |
| `cuda: device not found`                   | No GPU / driver issue     | Fall back to CPU encoder      |
| `Error initializing output device nvenc`   | NVENC driver mismatch     | Update NVIDIA driver          |
| `Output file is empty`                     | Filter graph error        | Check FFmpeg filter syntax    |
| `Killed` (exit 137)                        | OOM killer                | Reduce concurrency or add RAM |

### 5.2 Debug an FFmpeg Command

```bash
# Get the exact command that was run
# Check worker logs for the job ID:
docker logs cipta-worker 2>&1 | grep "JOB_ID" | grep "ffmpeg"

# Run manually with verbose logging
ffmpeg -v debug -i input.mp4 -vf "..." output.mp4 2>&1 | head -100

# Analyze input file
ffprobe -v quiet -print_format json -show_streams -show_format input.mp4
```

### 5.3 Verify Hardware Acceleration

```bash
# Check available encoders
ffmpeg -encoders 2>/dev/null | grep -i "h264"

# Expected output with NVENC:
# V..... h264_nvenc           NVIDIA NVENC H.264 encoder

# Expected output with VideoToolbox:
# V..... h264_videotoolbox    VideoToolbox H.264 Encoder

# Benchmark: CPU vs GPU
time ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 18 -t 10 /tmp/cpu.mp4
time ffmpeg -i input.mp4 -c:v h264_nvenc -preset p4 -cq 18 -t 10 /tmp/gpu.mp4
```

---

## 6. Disk Space Management

Workers download and process large video files. Disk space is a critical resource.

### 6.1 Monitor

```bash
# Check temp directory usage
du -sh /tmp/cipta/*

# Check by subdirectory
du -sh /tmp/cipta/downloads/*
du -sh /tmp/cipta/factory/*
du -sh /tmp/cipta/guardian/*
```

### 6.2 Cleanup

```bash
# Remove temp files older than 24 hours (safe — jobs timeout at 30 min)
find /tmp/cipta -type f -mtime +1 -delete

# Remove empty directories
find /tmp/cipta -type d -empty -delete

# Emergency: clear all temp data
# ⚠️ This will fail any currently processing jobs
rm -rf /tmp/cipta/*
```

### 6.3 Prevent Disk Full

Add a pre-flight check before processing:

```typescript
import { statfs } from 'fs/promises';

async function checkDiskSpace(minFreeGB: number = 5): Promise<boolean> {
  const stats = await statfs('/tmp/cipta');
  const freeGB = (stats.bfree * stats.bsize) / 1024 ** 3;
  return freeGB >= minFreeGB;
}

// In processor:
if (!(await checkDiskSpace(5))) {
  throw new Error('Insufficient disk space (< 5GB free). Rejecting job.');
}
```

---

## 7. Redis Management

### 7.1 Memory Monitoring

```bash
redis-cli -h $REDIS_HOST INFO memory
# Look for: used_memory_human, maxmemory_human, used_memory_peak_human

redis-cli -h $REDIS_HOST INFO keyspace
# Check database size

# Memory usage by BullMQ keys
redis-cli -h $REDIS_HOST --bigkeys
```

### 7.2 Flush Old Data

```bash
# ⚠️ Only if you understand what you're deleting

# Remove all completed jobs older than 7 days (BullMQ manages this automatically
# if removeOnComplete is configured, but sometimes manual cleanup is needed)

redis-cli -h $REDIS_HOST KEYS "bull:cipta:*:completed:*" | head -100
```

### 7.3 Redis Persistence

Ensure Redis is configured with AOF persistence for job durability:

```
# redis.conf
appendonly yes
appendfsync everysec
```

Without this, a Redis restart loses all queued jobs.
