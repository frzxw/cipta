# Cipta — Security Specification

> **Version:** 0.1.0-alpha  
> **Scope:** Full stack — API, Worker, Frontend, Infrastructure  
> **Last Updated:** 2026-04-11

---

## 1. Threat Model

### 1.1 Assets to Protect

| Asset | Sensitivity | Impact if Compromised |
|-------|------------|----------------------|
| User credentials (passwords) | Critical | Account takeover |
| JWT secrets | Critical | Full system access |
| Platform API tokens (TikTok, etc.) | Critical | Account abuse, ban |
| Video source files | Medium | IP theft |
| User email addresses | Medium | Privacy violation |
| Workspace data | High | Competitive intelligence |
| Database connection strings | Critical | Full data breach |
| AI API keys (OpenAI) | High | Financial damage (unlimited spend) |

### 1.2 Threat Actors

| Actor | Motivation | Likely Attack |
|-------|-----------|---------------|
| Competitor | Steal content strategy | API enumeration, data scraping |
| Script kiddie | Fun, clout | Brute force, known CVEs |
| Disgruntled user | Revenge | Data destruction, credential abuse |
| Platform enforcement | Detect automation | Traffic analysis, behavior fingerprinting |
| Automated bot | Spam, phishing | Registration spam, API abuse |

---

## 2. Authentication Security

### 2.1 Password Policy

| Rule | Value |
|------|-------|
| Minimum length | 8 characters |
| Require uppercase | ≥ 1 |
| Require number | ≥ 1 |
| Require special character | ≥ 1 |
| Hashing algorithm | bcrypt |
| Salt rounds | 12 |
| Max login attempts | 10 per 15 minutes (per IP + email) |
| Lockout duration | 15 minutes |

### 2.2 JWT Security

| Property | Value |
|----------|-------|
| Algorithm | HS256 (HMAC-SHA256) |
| Access token lifetime | 15 minutes |
| Refresh token lifetime | 7 days |
| Refresh rotation | Every use (one-time tokens) |
| Token family tracking | Yes — replayed tokens invalidate entire family |
| Secret length | Minimum 256 bits (64 hex chars) |
| Clock tolerance | 30 seconds |

### 2.3 Session Hardening

- Refresh tokens stored as **bcrypt hashed** values in DB (never plaintext)
- Access tokens are **stateless** — not stored server-side
- Token blacklisting via refresh token family invalidation (not global blacklist)
- Logout invalidates all tokens for the user (optional: per-device)

---

## 3. API Security

### 3.1 Input Validation

**Every** API endpoint validates input using `class-validator` DTOs:

```typescript
// All DTOs MUST use class-validator decorators
export class CreateSourceDto {
  @IsUrl({}, { message: 'Must be a valid URL' })
  @IsNotEmpty()
  url: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsEnum(['highest', '1080p', '720p'])
  quality?: string;
}
```

**Validation pipe (global):**
```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,           // Strip unknown properties
  forbidNonWhitelisted: true, // Error on unknown properties
  transform: true,           // Auto-transform types
  transformOptions: {
    enableImplicitConversion: false, // Explicit types only
  },
}));
```

### 3.2 SQL Injection Prevention

- **Prisma ORM** parameterizes all queries by default
- **No raw SQL** unless absolutely necessary
- If raw SQL is needed, **always** use `$queryRaw` with tagged template literals (parameterized):

```typescript
// ✅ SAFE — parameterized
const users = await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;

// ❌ DANGEROUS — string interpolation
const users = await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE email = '${email}'`);
```

### 3.3 Rate Limiting

| Endpoint Category | Limit | Window | Key |
|-------------------|-------|--------|-----|
| Authentication | 10 req | 1 min | IP + email |
| Source ingestion | 20 req | 1 hour | User ID |
| Render triggers | 50 req | 1 hour | User ID |
| General API | 100 req | 1 min | User ID |
| WebSocket connections | 5 concurrent | — | User ID |

### 3.4 CORS Policy

```typescript
app.enableCors({
  origin: allowedOrigins,        // Strict whitelist, never '*' in production
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Id', 'X-Request-Id'],
  credentials: true,
  maxAge: 3600,
});
```

### 3.5 Security Headers

Applied via `helmet`:

```typescript
import helmet from 'helmet';
app.use(helmet({
  contentSecurityPolicy: false,  // Disabled for API (no HTML served)
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));
```

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `0` (rely on CSP instead) |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

---

## 4. Data Security

### 4.1 Encryption at Rest

| Data | Encryption | Method |
|------|-----------|--------|
| Passwords | ✅ | bcrypt (irreversible hash) |
| Platform API tokens | ✅ | AES-256-GCM (reversible) |
| Database | ✅ | Managed DB encryption (TDE) |
| Object storage | ✅ | S3 SSE-S3 / GCS CMEK |
| Redis | ⚠️ | TLS in transit; disk encryption if managed |

### 4.2 Credential Encryption Implementation

```typescript
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = scryptSync(process.env.CREDENTIAL_ENCRYPTION_KEY, 'cipta-salt', 32);

export function encrypt(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### 4.3 Encryption in Transit

| Channel | Protocol | Enforcement |
|---------|----------|-------------|
| Client → API | HTTPS (TLS 1.3) | HSTS header, 301 redirect |
| Client → WebSocket | WSS | Same as HTTPS |
| API → Database | TLS | `sslmode=require` in connection string |
| API → Redis | TLS | `REDIS_TLS=true` in production |
| Worker → Cloud Storage | HTTPS | SDK default |
| Worker → External APIs | HTTPS | SDK default |

### 4.4 Multi-Tenancy Isolation

```
Rule: EVERY database query MUST include workspaceId filtering.
```

**Enforcement patterns:**

```typescript
// 1. Service-level — all methods receive workspaceId
async findAll(workspaceId: string): Promise<Source[]> {
  return this.prisma.source.findMany({
    where: { workspaceId }, // MANDATORY
  });
}

// 2. Guard-level — verify workspace membership before controller
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
@Get('sources')
async getAll(@CurrentWorkspace() workspaceId: string) { ... }

// 3. Prisma middleware — safety net (log warnings if missing)
prisma.$use(async (params, next) => {
  if (WORKSPACE_SCOPED_MODELS.includes(params.model)) {
    if (!params.args?.where?.workspaceId) {
      logger.warn(`Query on ${params.model} without workspaceId!`);
    }
  }
  return next(params);
});
```

---

## 5. Infrastructure Security

### 5.1 Network Security

- Database and Redis are **not** exposed to the Internet (internal network only)
- API is behind a reverse proxy / load balancer
- Workers access external services via HTTPS only
- Cloudflare WAF enabled for API endpoints

### 5.2 Container Security

```dockerfile
# Security best practices in Dockerfiles
FROM node:22-alpine AS runner

# Run as non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 cipta
USER cipta

# No shell access
RUN rm -rf /bin/sh /bin/bash

# Read-only filesystem (where possible)
# Mount writable volumes only where needed (/tmp/cipta)
```

### 5.3 Dependency Security

```bash
# Audit dependencies for vulnerabilities
pnpm audit

# Auto-fix where possible
pnpm audit --fix

# CI check — fail build on high/critical vulnerabilities
pnpm audit --audit-level=high
```

**Dependabot / Renovate** should be configured to auto-create PRs for security updates.

---

## 6. Content Security

### 6.1 File Upload Validation

When handling uploaded files (future feature):

| Check | Implementation |
|-------|---------------|
| File type | Validate MIME type (magic bytes, not just extension) |
| File size | Max 10GB for videos, 5MB for images |
| Filename | Sanitize, replace with UUID, no path traversal |
| Virus scan | ClamAV scan before processing (future) |

### 6.2 Output Sanitization

- API responses never include `passwordHash`, raw `credentials`, or internal IDs
- Use DTOs with `@Exclude()` decorators for sensitive fields:

```typescript
import { Exclude, Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose() id: string;
  @Expose() email: string;
  @Expose() displayName: string;
  @Exclude() passwordHash: string;  // Never sent to client
}
```

---

## 7. Platform Security (Anti-Detection)

Since Cipta automates social media publishing, we must also protect against platform detection:

| Measure | Implementation |
|---------|---------------|
| Human-like posting times | Jittered, non-round scheduling |
| Cooldown enforcement | Per-account minimum delays |
| Unique content per account | Guardian variation system |
| IP diversity | Optionally route through diverse proxies |
| Realistic user agents | Match platform mobile app UA strings |
| Gradual ramp-up | New accounts start with low volume |
| Session management | Maintain persistent sessions per account |

---

## 8. Incident Response (Security)

| Event | Detection | Response |
|-------|-----------|----------|
| Brute force login | Rate limit hit + failed attempt count | Auto-lockout, alert |
| Token reuse (theft) | Token family replay detection | Invalidate family, alert user |
| SQL injection attempt | WAF rule trigger | Block IP, log, alert |
| Unauthorized data access | Workspace membership check failure | Log, deny, alert |
| API key leak in logs | Log scrubbing middleware | Auto-redact `sk-*`, `Bearer *` |
| Dependency vulnerability | `pnpm audit` in CI | Auto-PR, patch within SLA |

### Log Scrubbing

```typescript
// Middleware to redact secrets from logs
function scrubSecrets(obj: any): any {
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'credentials'];
  // ... recursive replacement with '[REDACTED]'
}
```

---

## 9. Compliance Considerations

| Requirement | Status | Notes |
|------------|--------|-------|
| GDPR (EU users) | ⚠️ Plan needed | Data export, right to deletion, DPA |
| Password storage | ✅ | bcrypt, never plaintext |
| Data encryption at rest | ✅ | Managed DB encryption, S3 SSE |
| Data encryption in transit | ✅ | TLS everywhere |
| Audit logging | ⚠️ Future | Log who did what, when (admin actions) |
| Data retention policy | ⚠️ Future | Define how long data is kept, auto-purge |
