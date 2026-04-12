---
name: api-contracts
description: >
  Load when creating or modifying REST API endpoints, DTOs, controllers, error handling,
  or response formatting in apps/api. Enforces the response envelope, pagination, error
  codes, workspace scoping headers, and rate limiting. Triggers on: controller creation,
  DTO definition, error handling, API response structure, HTTP status codes.
---

# API Contract Rules

## 1. Base URL

- Production: `https://api.cipta.app/v1`
- Development: `http://localhost:3001/v1`
- Global prefix: `v1`

## 2. Response Envelope — ALWAYS USE

Every API response must follow this envelope format:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "ISO 8601",
    "requestId": "req_<nanoid>"
  }
}
```

**Paginated Success:**
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "timestamp": "...",
    "requestId": "...",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 152,
      "totalPages": 8
    }
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": [ { "field": "...", "message": "..." } ]
  },
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

## 3. Error Codes

| HTTP Status | Code | Usage |
|-------------|------|-------|
| 400 | `VALIDATION_ERROR` | Input failed validation |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Insufficient role/permissions |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource |
| 422 | `UNPROCESSABLE_ENTITY` | Valid syntax but semantically invalid |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

## 4. Pagination

All list endpoints must accept:
- `page` (integer, default 1, 1-indexed)
- `limit` (integer, default 20, max 100)
- `sortBy` (string, default `createdAt`)
- `sortOrder` (`asc` or `desc`, default `desc`)

## 5. Authentication

- All endpoints except `/auth/*` require a valid JWT in `Authorization: Bearer <token>`.
- Access token lifetime: 15 minutes.
- Refresh token lifetime: 7 days.
- Token rotation: one-time refresh tokens with family tracking.

## 6. Workspace Scoping

- All resource endpoints are scoped via the `X-Workspace-Id` header.
- If omitted, use the user's default workspace.
- Always verify workspace membership before processing the request.
- Use the `@CurrentWorkspace()` param decorator in controllers.

## 7. Input Validation

- All DTOs must use `class-validator` decorators.
- Enable the global `ValidationPipe` with:
  - `whitelist: true` (strip unknown properties)
  - `forbidNonWhitelisted: true` (error on unknown properties)
  - `transform: true`
  - `enableImplicitConversion: false`

## 8. Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| Global per user | 100 req | 1 min |
| Auth endpoints | 10 req | 1 min |
| Source ingestion | 20 req | 1 hour |
| Render triggers | 50 req | 1 hour |

Always include rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

## 9. Security Headers

Apply via `helmet`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Referrer-Policy: strict-origin-when-cross-origin`
- CORS: strict origin whitelist, never `*` in production.

## 10. WebSocket Events

Connection: `wss://api.cipta.app/ws` with Bearer token auth.

Server → Client events: `job:progress`, `job:completed`, `job:failed`, `source:status`, `asset:ready`, `distribution:published`.

Client → Server events: `subscribe:job`, `subscribe:workspace`.

## 11. Output Sanitization

- API responses must **never** include `passwordHash`, raw `credentials`, or internal implementation IDs.
- Use response DTOs with `@Exclude()` decorators for sensitive fields.
- Credentials are never returned from any Account endpoint.
