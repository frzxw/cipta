# Cipta — Observability & Monitoring

> **Covers:** Structured logging, metrics, alerting, tracing, and dashboards  
> **Last Updated:** 2026-04-11

---

## 1. Observability Pillars

```
                    ┌────────────────┐
                    │  OBSERVABILITY │
                    └───────┬────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
     ┌──────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐
     │    LOGS     │ │  METRICS   │ │   TRACES    │
     │  (Pino →   │ │ (Prom →   │ │ (Req IDs → │
     │   Loki)    │ │  Grafana)  │ │  Jaeger)   │
     └─────────────┘ └────────────┘ └─────────────┘
```

---

## 2. Structured Logging

### 2.1 Logger Configuration

All applications use **pino** for JSON structured logging:

```typescript
// Shared logger factory
import pino from 'pino';

export function createLogger(service: string) {
  return pino({
    name: service,
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({
        service: bindings.name,
        pid: bindings.pid,
        hostname: bindings.hostname,
      }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    // Pretty print in development
    transport:
      process.env.LOG_FORMAT === 'pretty'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    // Redact sensitive fields
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
        '*.passwordHash',
        '*.credentials',
        '*.apiKey',
        '*.apiSecret',
        '*.token',
        '*.refreshToken',
      ],
      censor: '[REDACTED]',
    },
  });
}
```

### 2.2 Log Format

```json
{
  "level": "info",
  "time": "2026-04-11T08:00:00.000Z",
  "service": "cipta-api",
  "requestId": "req_a1b2c3",
  "userId": "usr_abc123",
  "workspaceId": "ws_def456",
  "msg": "Source created",
  "data": {
    "sourceId": "src_xyz789",
    "url": "https://youtube.com/watch?v=...",
    "status": "PENDING"
  },
  "durationMs": 42
}
```

### 2.3 Log Levels

| Level   | Usage                             | Examples                                                 |
| ------- | --------------------------------- | -------------------------------------------------------- |
| `fatal` | App cannot continue               | DB connection permanently failed, missing encryption key |
| `error` | Operation failed, needs attention | Job processing error, API endpoint exception             |
| `warn`  | Unusual but recoverable           | Rate limit approaching, retry attempt, slow query        |
| `info`  | Normal operations worth recording | Job completed, user registered, source created           |
| `debug` | Development diagnostics           | FFmpeg command details, API request/response bodies      |
| `trace` | Extremely verbose                 | Function entry/exit, BullMQ internals                    |

### 2.4 Mandatory Log Events

| Event                | Level | Service | When                                 |
| -------------------- | ----- | ------- | ------------------------------------ |
| `app.started`        | info  | all     | Application bootstrap complete       |
| `app.shutdown`       | info  | all     | Graceful shutdown initiated          |
| `request.received`   | debug | api     | Every HTTP request                   |
| `request.completed`  | info  | api     | HTTP response sent (with duration)   |
| `request.error`      | error | api     | Unhandled request error              |
| `auth.login.success` | info  | api     | Successful login                     |
| `auth.login.failure` | warn  | api     | Failed login attempt                 |
| `auth.token.refresh` | debug | api     | Token refresh                        |
| `auth.token.reuse`   | error | api     | Refresh token reuse detected         |
| `job.started`        | info  | worker  | Job processing begins                |
| `job.progress`       | debug | worker  | Job progress update                  |
| `job.completed`      | info  | worker  | Job completed successfully           |
| `job.failed`         | error | worker  | Job processing failed                |
| `job.stalled`        | warn  | worker  | Job detected as stalled              |
| `ffmpeg.command`     | debug | worker  | FFmpeg command being executed        |
| `ffmpeg.progress`    | debug | worker  | FFmpeg encoding progress             |
| `ffmpeg.error`       | error | worker  | FFmpeg process error                 |
| `storage.upload`     | info  | worker  | File uploaded to cloud storage       |
| `storage.download`   | debug | worker  | File downloaded from cloud storage   |
| `platform.publish`   | info  | worker  | Content published to social platform |
| `platform.error`     | error | worker  | Platform API error                   |
| `db.query.slow`      | warn  | all     | Query exceeding 500ms                |

### 2.5 Request ID Correlation

Every request gets a unique ID that propagates through all logs:

```typescript
// NestJS middleware
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || `req_${nanoid(12)}`;
    req['requestId'] = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  }
}
```

When dispatching BullMQ jobs, include `requestId` in the payload so worker logs can be correlated:

```typescript
await queue.add('download', {
  ...payload,
  _meta: { requestId: req.requestId, userId: user.id },
});
```

---

## 3. Metrics

### 3.1 Key Metrics

#### API Metrics

| Metric                          | Type      | Labels                      |
| ------------------------------- | --------- | --------------------------- |
| `http_request_duration_seconds` | Histogram | `method`, `route`, `status` |
| `http_requests_total`           | Counter   | `method`, `route`, `status` |
| `http_active_connections`       | Gauge     | —                           |
| `auth_login_attempts_total`     | Counter   | `result` (success/failure)  |
| `websocket_connections_active`  | Gauge     | —                           |

#### Worker Metrics

| Metric                                  | Type      | Labels                                    |
| --------------------------------------- | --------- | ----------------------------------------- |
| `job_processing_duration_seconds`       | Histogram | `queue`, `type`                           |
| `job_completed_total`                   | Counter   | `queue`, `type`                           |
| `job_failed_total`                      | Counter   | `queue`, `type`, `error_class`            |
| `queue_depth`                           | Gauge     | `queue`, `state` (waiting/active/delayed) |
| `ffmpeg_render_duration_seconds`        | Histogram | `codec`, `hw_accel`                       |
| `variation_generation_duration_seconds` | Histogram | `count`                                   |
| `storage_upload_bytes_total`            | Counter   | `bucket`                                  |
| `storage_download_bytes_total`          | Counter   | `bucket`                                  |

#### Infrastructure Metrics

| Metric                        | Type  | Source                |
| ----------------------------- | ----- | --------------------- |
| `node_memory_usage_bytes`     | Gauge | process.memoryUsage() |
| `node_cpu_usage_percent`      | Gauge | process.cpuUsage()    |
| `postgres_active_connections` | Gauge | pg_stat_activity      |
| `redis_memory_used_bytes`     | Gauge | Redis INFO            |
| `disk_free_bytes`             | Gauge | statfs                |

### 3.2 Prometheus Endpoint

```typescript
// apps/api — expose /metrics endpoint
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: { enabled: true },
    }),
  ],
})
```

---

## 4. Alerting Rules

### 4.1 Critical Alerts (Page Immediately)

| Alert            | Condition                          | Action       |
| ---------------- | ---------------------------------- | ------------ |
| API Down         | Health check fails 3× consecutive  | Page on-call |
| Database Down    | Connection error for > 1 min       | Page on-call |
| Redis Down       | Connection error for > 1 min       | Page on-call |
| Error Rate Spike | > 10% 5xx responses in 5 min       | Page on-call |
| Queue Stuck      | Any queue depth > 500 for > 10 min | Page on-call |

### 4.2 Warning Alerts (Slack Notification)

| Alert             | Condition                         | Action                |
| ----------------- | --------------------------------- | --------------------- |
| High Latency      | p95 response time > 2s for 5 min  | Notify #alerts        |
| Queue Growing     | Any queue depth > 100 for > 5 min | Notify #alerts        |
| Disk Space Low    | Worker temp dir < 10GB free       | Notify #alerts        |
| Redis Memory High | > 80% of maxmemory                | Notify #alerts        |
| Failed Jobs Spike | > 20 failed jobs in 1 hour        | Notify #alerts        |
| Account Health    | Any account status → SUSPENDED    | Notify #alerts + user |
| Slow Query        | DB query > 5 seconds              | Notify #alerts        |

### 4.3 Info Alerts (Dashboard Only)

| Alert             | Condition                     |
| ----------------- | ----------------------------- |
| Deploy completed  | CI/CD pipeline success        |
| Migration applied | Prisma migrate deploy success |
| Usage milestone   | 1000th source ingested, etc.  |

---

## 5. Dashboards

### 5.1 Operations Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  CIPTA OPS DASHBOARD                                     │
├──────────────────┬──────────────────┬───────────────────┤
│  API Health      │  Worker Health   │  Infrastructure   │
│  ───────────     │  ────────────    │  ───────────────  │
│  Uptime: 99.9%   │  Active: 4/4    │  CPU: 42%         │
│  p95: 150ms      │  Processing: 8  │  RAM: 2.1/4GB     │
│  Err rate: 0.1%  │  Failed/hr: 2   │  Disk: 35/50GB    │
├──────────────────┴──────────────────┴───────────────────┤
│                                                         │
│  Queue Depths (real-time)                               │
│  ┌────────────┬────────────┬───────────┬─────────────┐ │
│  │ Ingestor   │ Factory    │ Guardian  │ Fleet       │ │
│  │ Wait: 3    │ Wait: 12   │ Wait: 0  │ Wait: 45   │ │
│  │ Active: 2  │ Active: 2  │ Active: 0│ Active: 3  │ │
│  │ Failed: 0  │ Failed: 1  │ Failed: 0│ Failed: 2  │ │
│  └────────────┴────────────┴───────────┴─────────────┘ │
│                                                         │
│  Request Rate (last 1 hour)                             │
│  ████████████████████████████▌  150 req/min             │
│                                                         │
│  Error Rate (last 1 hour)                               │
│  ██▌  0.3%                                              │
│                                                         │
│  Pipeline Throughput Today                              │
│  Sources: 24  │  Chunks: 156  │  Assets: 142  │  Distributed: 89 │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Bull Board (Job Monitor)

Embedded in the API at `/admin/queues`:

```typescript
// apps/api/src/modules/job/bull-board.setup.ts
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

export function setupBullBoard(app, queues: Queue[]) {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: queues.map((q) => new BullMQAdapter(q)),
    serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());
}
```

---

## 6. Error Tracking (Sentry)

### 6.1 Setup

```typescript
// apps/api/src/main.ts
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Prisma({ client: prisma }),
    ],
  });
}
```

### 6.2 Error Context

```typescript
// Enrich Sentry errors with Cipta-specific context
Sentry.setTag('queue', job.queueName);
Sentry.setTag('job.type', job.name);
Sentry.setUser({ id: payload.userId, workspaceId: payload.workspaceId });
Sentry.setContext('job', { id: job.id, attempt: job.attemptsMade });
```

---

## 7. Health Checks

### 7.1 API Health Endpoint

```typescript
// GET /health
@Get('health')
async healthCheck() {
  const checks = {
    api: 'ok',
    database: await this.checkDatabase(),
    redis: await this.checkRedis(),
    storage: await this.checkStorage(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  const isHealthy = Object.values(checks).every(v =>
    v === 'ok' || typeof v === 'number' || typeof v === 'string'
  );

  return { status: isHealthy ? 'healthy' : 'degraded', checks };
}
```

**Response (healthy):**

```json
{
  "status": "healthy",
  "checks": {
    "api": "ok",
    "database": "ok",
    "redis": "ok",
    "storage": "ok",
    "uptime": 86400,
    "timestamp": "2026-04-11T08:00:00.000Z"
  }
}
```

---

## 8. Log Aggregation (Production)

### Option A: Grafana Loki (Recommended for startups)

```yaml
# docker-compose.monitoring.yml
services:
  loki:
    image: grafana/loki:latest
    ports: ['3100:3100']

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log
      - ./promtail-config.yml:/etc/promtail/config.yml

  grafana:
    image: grafana/grafana:latest
    ports: ['3003:3000']
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### Option B: Cloud-Native

| Provider              | Service                | Cost                |
| --------------------- | ---------------------- | ------------------- |
| Vercel                | Vercel Logs (frontend) | Included            |
| Betterstack (Logtail) | Log aggregation        | Free tier available |
| Datadog               | Full observability     | $$$, best for scale |
| AWS CloudWatch        | Logs + Metrics         | Pay-per-use         |
