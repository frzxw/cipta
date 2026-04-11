# Cipta — Configuration Reference

> **Single source of truth for every environment variable, config file, and runtime setting.**  
> **Last Updated:** 2026-04-11

---

## 1. Environment Variable Master List

### 1.1 Core Application (`apps/api`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | ✅ | `development` | `development` \| `staging` \| `production` |
| `API_PORT` | ❌ | `3001` | Port the API server listens on |
| `API_HOST` | ❌ | `0.0.0.0` | Host binding |
| `API_GLOBAL_PREFIX` | ❌ | `v1` | API URL prefix (`/v1/...`) |
| `CORS_ORIGIN` | ✅ | `http://localhost:3000` | Comma-separated allowed origins |

### 1.2 Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |

**Format:**
```
postgresql://{USER}:{PASSWORD}@{HOST}:{PORT}/{DATABASE}?sslmode={MODE}&connection_limit={N}
```

**Examples:**
```bash
# Development
DATABASE_URL="postgresql://cipta:cipta_dev@localhost:5432/cipta"

# Production
DATABASE_URL="postgresql://cipta:$PG_PASS@db.internal:5432/cipta?sslmode=require&connection_limit=20"
```

### 1.3 Redis

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_HOST` | ✅ | `localhost` | Redis server hostname |
| `REDIS_PORT` | ❌ | `6379` | Redis server port |
| `REDIS_PASSWORD` | ❌ | — | Redis authentication password |
| `REDIS_TLS` | ❌ | `false` | Enable TLS for Redis connection |
| `REDIS_DB` | ❌ | `0` | Redis database index |

### 1.4 Authentication (JWT)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_ACCESS_SECRET` | ✅ | — | HMAC secret for access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | ✅ | — | HMAC secret for refresh tokens (min 32 chars, different from access) |
| `JWT_ACCESS_EXPIRY` | ❌ | `15m` | Access token lifetime (e.g., `15m`, `1h`) |
| `JWT_REFRESH_EXPIRY` | ❌ | `7d` | Refresh token lifetime (e.g., `7d`, `30d`) |
| `BCRYPT_SALT_ROUNDS` | ❌ | `12` | bcrypt salt rounds for password hashing |

**Generating secrets:**
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# OpenSSL
openssl rand -hex 64
```

### 1.5 Cloud Storage

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STORAGE_PROVIDER` | ✅ | `local` | `s3` \| `gcs` \| `local` |
| `STORAGE_BUCKET` | ✅ (if s3/gcs) | — | Bucket name |
| `STORAGE_REGION` | ❌ | `us-east-1` | Cloud storage region |
| `STORAGE_ENDPOINT` | ❌ | — | Custom endpoint (for MinIO, R2) |
| `STORAGE_CDN_URL` | ❌ | — | CDN URL prefix for public assets |
| `STORAGE_LOCAL_PATH` | ❌ | `./storage` | Local storage directory (dev) |

#### AWS S3

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AWS_ACCESS_KEY_ID` | ✅ (if s3) | — | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | ✅ (if s3) | — | AWS secret key |
| `AWS_REGION` | ❌ | `us-east-1` | AWS region |

#### Google Cloud Storage

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GCS_PROJECT_ID` | ✅ (if gcs) | — | GCP project ID |
| `GCS_CREDENTIALS_PATH` | ✅ (if gcs) | — | Path to service account JSON |

### 1.6 Worker Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WORKER_CONCURRENCY_INGEST` | ❌ | `3` | Concurrent ingestor jobs |
| `WORKER_CONCURRENCY_FACTORY` | ❌ | `2` | Concurrent factory/render jobs |
| `WORKER_CONCURRENCY_GUARDIAN` | ❌ | `5` | Concurrent guardian/variation jobs |
| `WORKER_CONCURRENCY_FLEET` | ❌ | `3` | Concurrent fleet/publish jobs |
| `WORKER_TEMP_DIR` | ❌ | `/tmp/cipta` | Temporary file directory |
| `WORKER_MAX_DOWNLOAD_SIZE_GB` | ❌ | `10` | Max download size in GB |
| `WORKER_STALL_INTERVAL` | ❌ | `30000` | BullMQ stall check interval (ms) |

### 1.7 FFmpeg

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FFMPEG_PATH` | ❌ | `ffmpeg` | Path to FFmpeg binary |
| `FFPROBE_PATH` | ❌ | `ffprobe` | Path to FFprobe binary |
| `FFMPEG_HW_ACCEL` | ❌ | `auto` | `auto` \| `nvenc` \| `videotoolbox` \| `none` |
| `FFMPEG_THREADS` | ❌ | `0` | Number of threads (0 = auto) |
| `FFMPEG_DEFAULT_CRF` | ❌ | `18` | Default Constant Rate Factor (15-28) |
| `FFMPEG_DEFAULT_PRESET` | ❌ | `medium` | Encoding preset (ultrafast → veryslow) |

### 1.8 yt-dlp

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `YTDLP_PATH` | ❌ | `yt-dlp` | Path to yt-dlp binary |
| `YTDLP_COOKIES_PATH` | ❌ | — | Path to cookies.txt file |
| `YTDLP_PROXY` | ❌ | — | Proxy URL (e.g., `socks5://127.0.0.1:1080`) |
| `YTDLP_RATE_LIMIT` | ❌ | — | Download rate limit (e.g., `50M`) |

### 1.9 AI / External APIs

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WHISPER_API_URL` | ✅ | `https://api.openai.com/v1/audio/transcriptions` | Whisper API endpoint |
| `WHISPER_API_KEY` | ✅ | — | Whisper API key |
| `WHISPER_MODEL` | ❌ | `whisper-1` | Whisper model to use |
| `LLM_API_URL` | ✅ | `https://api.openai.com/v1/chat/completions` | LLM chat endpoint |
| `LLM_API_KEY` | ✅ | — | LLM API key |
| `LLM_MODEL` | ❌ | `gpt-4o` | LLM model to use |
| `LLM_MAX_TOKENS` | ❌ | `4096` | Max tokens for LLM response |
| `LLM_TEMPERATURE` | ❌ | `0.3` | LLM temperature (0-2) |

### 1.10 Platform APIs (Fleet)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TIKTOK_CLIENT_KEY` | ❌ | — | TikTok API client key |
| `TIKTOK_CLIENT_SECRET` | ❌ | — | TikTok API client secret |
| `INSTAGRAM_APP_ID` | ❌ | — | Instagram/Meta app ID |
| `INSTAGRAM_APP_SECRET` | ❌ | — | Instagram/Meta app secret |
| `YOUTUBE_CLIENT_ID` | ❌ | — | YouTube/Google client ID |
| `YOUTUBE_CLIENT_SECRET` | ❌ | — | YouTube/Google client secret |

### 1.11 Security

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CREDENTIAL_ENCRYPTION_KEY` | ✅ | — | AES-256 key for encrypting stored account credentials |
| `RATE_LIMIT_TTL` | ❌ | `60000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | ❌ | `100` | Max requests per window |

### 1.12 Observability

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOG_LEVEL` | ❌ | `info` | `trace` \| `debug` \| `info` \| `warn` \| `error` \| `fatal` |
| `LOG_FORMAT` | ❌ | `json` | `json` \| `pretty` (pretty for dev) |
| `SENTRY_DSN` | ❌ | — | Sentry error tracking DSN |
| `SENTRY_ENVIRONMENT` | ❌ | `development` | Sentry environment tag |

### 1.13 Frontend (`apps/web`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | `http://localhost:3001` | API base URL (public, embedded in client bundle) |
| `NEXT_PUBLIC_WS_URL` | ✅ | `ws://localhost:3001` | WebSocket URL |
| `NEXT_PUBLIC_STORAGE_URL` | ❌ | — | Storage CDN URL for media preview |

---

## 2. Example `.env` Files

### 2.1 `apps/api/.env.example`

```bash
# ── Server ──
NODE_ENV=development
API_PORT=3001
API_HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000

# ── Database ──
DATABASE_URL=postgresql://cipta:cipta_dev@localhost:5432/cipta

# ── Redis ──
REDIS_HOST=localhost
REDIS_PORT=6379

# ── Authentication ──
JWT_ACCESS_SECRET=CHANGE_ME_to_64_char_random_hex_string
JWT_REFRESH_SECRET=CHANGE_ME_to_different_64_char_random_hex_string
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ── Security ──
CREDENTIAL_ENCRYPTION_KEY=CHANGE_ME_to_32_byte_hex_key

# ── Storage ──
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./storage

# ── Observability ──
LOG_LEVEL=debug
LOG_FORMAT=pretty
```

### 2.2 `apps/worker/.env.example`

```bash
# ── Database ──
DATABASE_URL=postgresql://cipta:cipta_dev@localhost:5432/cipta

# ── Redis ──
REDIS_HOST=localhost
REDIS_PORT=6379

# ── Worker ──
WORKER_CONCURRENCY_INGEST=3
WORKER_CONCURRENCY_FACTORY=2
WORKER_CONCURRENCY_GUARDIAN=5
WORKER_CONCURRENCY_FLEET=3
WORKER_TEMP_DIR=/tmp/cipta

# ── FFmpeg ──
FFMPEG_HW_ACCEL=auto
FFMPEG_DEFAULT_CRF=18

# ── Storage ──
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./storage

# ── AI APIs ──
WHISPER_API_KEY=sk-...
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o

# ── Observability ──
LOG_LEVEL=debug
LOG_FORMAT=pretty
```

### 2.3 `apps/web/.env.example`

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

---

## 3. Configuration Files

### 3.1 File Matrix

| File | Package | Purpose |
|------|---------|---------|
| `turbo.json` | root | Turborepo task pipeline |
| `pnpm-workspace.yaml` | root | Workspace package discovery |
| `tsconfig.json` | each package | TypeScript configuration |
| `nest-cli.json` | `apps/api` | NestJS CLI configuration |
| `eslint.config.mjs` | `apps/api` | ESLint configuration |
| `next.config.js` | `apps/web` | Next.js configuration |
| `vitest.config.ts` | various | Vitest test configuration |
| `playwright.config.ts` | root | E2E test configuration |
| `schema.prisma` | `packages/database` | Database schema |
| `docker-compose.yml` | root | Development infrastructure |

### 3.2 NestJS Config Module

```typescript
// apps/api/src/config/app.config.ts

import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.API_PORT || '3001', 10),
  host: process.env.API_HOST || '0.0.0.0',
  globalPrefix: process.env.API_GLOBAL_PREFIX || 'v1',
  corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
}));

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
}));

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
}));

export const storageConfig = registerAs('storage', () => ({
  provider: process.env.STORAGE_PROVIDER || 'local',
  bucket: process.env.STORAGE_BUCKET,
  region: process.env.STORAGE_REGION || 'us-east-1',
  cdnUrl: process.env.STORAGE_CDN_URL,
  localPath: process.env.STORAGE_LOCAL_PATH || './storage',
}));
```

---

## 4. Validation

All environment variables must be validated at startup. The app should crash immediately if required variables are missing.

### NestJS (Joi validation)

```typescript
// apps/api/src/config/env.validation.ts

import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'staging', 'production').default('development'),
  API_PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().uri().required(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  CREDENTIAL_ENCRYPTION_KEY: Joi.string().min(32).required(),
  STORAGE_PROVIDER: Joi.string().valid('s3', 'gcs', 'local').default('local'),
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  LOG_LEVEL: Joi.string().valid('trace', 'debug', 'info', 'warn', 'error', 'fatal').default('info'),
});
```

### Worker (zod validation)

```typescript
// apps/worker/src/config/env.validation.ts

import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  WORKER_CONCURRENCY_INGEST: z.coerce.number().min(1).max(20).default(3),
  WORKER_CONCURRENCY_FACTORY: z.coerce.number().min(1).max(10).default(2),
  WORKER_CONCURRENCY_GUARDIAN: z.coerce.number().min(1).max(20).default(5),
  WORKER_CONCURRENCY_FLEET: z.coerce.number().min(1).max(20).default(3),
  WHISPER_API_KEY: z.string().min(1),
  LLM_API_KEY: z.string().min(1),
  STORAGE_PROVIDER: z.enum(['s3', 'gcs', 'local']).default('local'),
});

// Validate at startup — crash fast if invalid
export function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
}
```

---

## 5. Secrets Management

| Secret | Storage | Rotation |
|--------|---------|----------|
| `DATABASE_URL` password | Env var / secrets manager | Every 90 days |
| `JWT_ACCESS_SECRET` | Env var / secrets manager | Every 6 months |
| `JWT_REFRESH_SECRET` | Env var / secrets manager | Every 6 months |
| `CREDENTIAL_ENCRYPTION_KEY` | Env var / secrets manager | Requires re-encryption of all stored credentials |
| `WHISPER_API_KEY` | Env var | Per OpenAI rotation schedule |
| `LLM_API_KEY` | Env var | Per OpenAI rotation schedule |
| AWS / GCS keys | Env var / IAM role | Prefer IAM roles; keys every 90 days |
| Platform API secrets | Env var / secrets manager | Per platform requirements |

> [!CAUTION]
> **Never** commit secrets to Git. Use `.env.example` (no values) as the template. Actual `.env` files are in `.gitignore`.
