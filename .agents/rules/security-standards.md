---
name: security-standards
description: >
  Load when implementing authentication, authorization, credential storage, encryption,
  input validation, CORS, or any security-sensitive code. Enforces JWT configuration,
  bcrypt settings, AES-256 encryption, RBAC, and workspace isolation. Triggers on:
  auth module, guards, password handling, credential encryption, secrets, rate limiting,
  CORS config, helmet, token handling.
---

# Security Standards

## 1. Authentication

### 1.1 Password Policy

| Rule | Value |
|------|-------|
| Hashing algorithm | bcrypt |
| Salt rounds | 12 |
| Minimum length | 8 characters |
| Require uppercase | ≥ 1 |
| Require number | ≥ 1 |
| Require special character | ≥ 1 |
| Max login attempts | 10 per 15 minutes (per IP + email) |
| Lockout duration | 15 minutes |

### 1.2 JWT Configuration

| Property | Access Token | Refresh Token |
|----------|-------------|--------------|
| Algorithm | HS256 | HS256 |
| Lifetime | 15 minutes | 7 days |
| Secret env var | `JWT_ACCESS_SECRET` | `JWT_REFRESH_SECRET` |
| Min secret length | 256 bits (64 hex chars) | 256 bits (64 hex chars) |
| Payload | User ID, email, workspaces | User ID, JTI, family ID |

- Access tokens are **stateless** — not stored server-side.
- Refresh tokens are stored as **bcrypt hashed** values in the database.
- Refresh tokens use **one-time rotation** with **token family tracking**.
- If a used refresh token is replayed → invalidate the entire token family (assume theft).

## 2. Authorization (RBAC)

### 2.1 Workspace Roles

| Role | Can Manage Content | Can Manage Members | Can Manage Settings |
|------|-------------------|-------------------|-------------------|
| OWNER | ✅ | ✅ | ✅ |
| ADMIN | ✅ | ✅ | ❌ |
| MEMBER | ✅ | ❌ | ❌ |

- Always use the `@Roles()` decorator with `RolesGuard` on endpoints requiring elevated permissions.
- Always verify workspace membership before processing any request.

## 3. Input Validation

- Every API endpoint validates input using `class-validator` DTOs.
- Global `ValidationPipe`: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- `enableImplicitConversion: false` — require explicit type annotations.
- Never trust client input for workspace IDs, user IDs, or role checks.

## 4. Credential Encryption

- Platform API tokens (TikTok, Instagram, YouTube credentials) are encrypted with **AES-256-GCM** before storage.
- Encryption key comes from `CREDENTIAL_ENCRYPTION_KEY` environment variable.
- Format stored in DB: `{iv_hex}:{authTag_hex}:{ciphertext_hex}`.
- The encryption key is **NEVER** stored in the database or committed to Git.

## 5. SQL Injection Prevention

- Prisma parameterizes all queries by default.
- Never use `$queryRawUnsafe` with string interpolation.
- If raw SQL is needed, always use `$queryRaw` with tagged template literals.

## 6. Secrets Management

- Never commit secrets to Git.
- Use `.env.example` files with placeholder values as templates.
- Actual `.env` files are in `.gitignore`.
- Required secrets: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CREDENTIAL_ENCRYPTION_KEY`, `WHISPER_API_KEY`, `LLM_API_KEY`.

## 7. Log Scrubbing

- Always redact sensitive fields from logs: `password`, `passwordHash`, `token`, `refreshToken`, `secret`, `key`, `authorization`, `credentials`, `apiKey`, `apiSecret`.
- Use pino's `redact` option with censor `[REDACTED]`.

## 8. CORS Policy

- Strict origin whitelist — never use `*` in production.
- Allowed methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- Allowed headers: `Content-Type`, `Authorization`, `X-Workspace-Id`, `X-Request-Id`.
- `credentials: true`.

## 9. Output Sanitization

- Never return `passwordHash`, raw `credentials`, or internal secrets in API responses.
- Use `@Exclude()` from `class-transformer` on sensitive fields.
- Credentials from Account endpoints are never returned to the client.

## 10. Container Security

- Run containers as non-root user.
- Use Node.js Alpine base images.
- Remove shell access in production containers.
- Use read-only filesystem where possible.
