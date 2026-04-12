---
name: observability-standards
description: >
  Load when implementing logging, metrics, health checks, error tracking, or monitoring.
  Enforces structured JSON logging with pino, request ID correlation, mandatory log events,
  Prometheus metrics, alerting rules, and health check endpoints. Triggers on: logger setup,
  log statements, metrics, Sentry config, health endpoint, Bull Board, correlation IDs.
---

# Observability Standards

## 1. Structured Logging

- All applications use **pino** for JSON structured logging.
- Every log entry must include: `level`, `time` (ISO 8601), `service` name, `requestId`, `msg`.
- Use `LOG_LEVEL` env var (default: `info`). Levels: `fatal`, `error`, `warn`, `info`, `debug`, `trace`.
- Use `LOG_FORMAT=pretty` for development (via `pino-pretty`), `json` for production.

## 2. Log Field Redaction — ALWAYS

Configure pino's `redact` option to censor sensitive fields:

```
req.headers.authorization, req.headers.cookie,
*.password, *.passwordHash, *.credentials,
*.apiKey, *.apiSecret, *.token, *.refreshToken
```

Censor value: `[REDACTED]`.

## 3. Request ID Correlation

- Every HTTP request gets a unique ID (`req_<nanoid>`).
- Set via middleware from `X-Request-Id` header or generate fresh.
- Return the ID in the `X-Request-Id` response header.
- Include `requestId` in all log entries for that request.
- When dispatching BullMQ jobs, include `_meta: { requestId, userId }` in the payload.
- Worker logs must include the job's `requestId` for end-to-end correlation.

## 4. Mandatory Log Events

| Event | Level | Service |
|-------|-------|---------|
| `app.started` | info | all |
| `app.shutdown` | info | all |
| `request.completed` | info | api |
| `request.error` | error | api |
| `auth.login.success` | info | api |
| `auth.login.failure` | warn | api |
| `auth.token.reuse` | error | api |
| `job.started` | info | worker |
| `job.completed` | info | worker |
| `job.failed` | error | worker |
| `job.stalled` | warn | worker |
| `ffmpeg.error` | error | worker |
| `storage.upload` | info | worker |
| `platform.publish` | info | worker |
| `platform.error` | error | worker |
| `db.query.slow` | warn | all (>500ms) |

## 5. Health Check Endpoint

The API must expose `GET /health` returning:

```json
{
  "status": "healthy" | "degraded",
  "checks": {
    "api": "ok",
    "database": "ok" | "error",
    "redis": "ok" | "error",
    "storage": "ok" | "error",
    "uptime": <seconds>,
    "timestamp": "<ISO 8601>"
  }
}
```

## 6. Metrics (Prometheus)

Expose at `/metrics`. Key metrics:
- `http_request_duration_seconds` (histogram, labels: `method`, `route`, `status`)
- `http_requests_total` (counter)
- `job_processing_duration_seconds` (histogram, labels: `queue`, `type`)
- `job_completed_total`, `job_failed_total` (counters)
- `queue_depth` (gauge, labels: `queue`, `state`)
- `node_memory_usage_bytes`, `node_cpu_usage_percent` (gauges)

## 7. Bull Board

- Embed Bull Board at `/admin/queues` in the API for job monitoring.
- Register all four queues: ingestor, factory, guardian, fleet.

## 8. Error Tracking (Sentry)

- Initialize Sentry if `SENTRY_DSN` is set.
- Set `tracesSampleRate: 0.1` in production, `1.0` in development.
- Enrich errors with: `queue`, `job.type`, `userId`, `workspaceId`, `job.attempt`.

## 9. Alerting Rules

### Critical (Page immediately)
- API health check fails 3× consecutive
- Database/Redis down > 1 minute
- Error rate > 10% 5xx in 5 minutes
- Any queue depth > 500 for > 10 minutes

### Warning (Notification)
- p95 response time > 2s for 5 minutes
- Queue depth > 100 for > 5 minutes
- > 20 failed jobs in 1 hour
- Account status → SUSPENDED
- DB query > 5 seconds
