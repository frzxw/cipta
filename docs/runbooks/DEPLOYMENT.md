# Runbook: Deployment

> **Audience:** DevOps, Backend Engineers  
> **Last Updated:** 2026-04-11

---

## 1. Deployment Topology

```
┌─────────────────────────────────────────────────────────┐
│                   PRODUCTION                             │
│                                                         │
│  ┌──────────┐   ┌──────────┐   ┌───────────────────┐  │
│  │ Vercel / │   │ Container│   │  Container        │  │
│  │ Coolify  │   │ Registry │   │  Orchestrator     │  │
│  │ (Web)    │   │ (GHCR)   │   │  (Docker/K8s)     │  │
│  └──────────┘   └──────────┘   └─────┬─────────────┘  │
│                                       │                 │
│                        ┌──────────────┼───────────┐    │
│                        │              │           │    │
│                   ┌────▼────┐  ┌──────▼───┐  ┌───▼──┐ │
│                   │ API ×2  │  │Worker ×N │  │Redis │ │
│                   │ (NestJS)│  │(Node.js) │  │      │ │
│                   └────┬────┘  └──────────┘  └──────┘ │
│                        │                               │
│                   ┌────▼─────────┐                     │
│                   │  PostgreSQL  │                     │
│                   │  (Managed)   │                     │
│                   └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Pre-Deployment Checklist

```markdown
- [ ] All tests pass (`pnpm test`)
- [ ] Type-check passes (`pnpm check-types`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Database migrations are committed and tested on staging
- [ ] Environment variables are set in deployment target
- [ ] No secrets in codebase (run `git log --all -p | grep -i "sk-\|password\|secret"`)
- [ ] Changelog / release notes prepared
- [ ] Dependent services (Redis, PostgreSQL) are healthy
- [ ] Enough disk space on worker nodes (min 20GB free)
```

---

## 3. Deployment Procedures

### 3.1 Frontend (`apps/web`) — Vercel / Static Deploy

```bash
# Vercel auto-deploys from `main` branch
# Manual trigger:
vercel --prod

# Or via Turborepo:
pnpm --filter web build
```

**Environment Variables (Vercel):**

```
NEXT_PUBLIC_API_URL=https://api.cipta.app
NEXT_PUBLIC_WS_URL=wss://api.cipta.app
```

**Rollback:** Vercel dashboard → Deployments → Promote previous deployment.

---

### 3.2 API Server (`apps/api`) — Container Deploy

**Build:**

```bash
# From repo root
docker build -f apps/api/Dockerfile -t cipta-api:latest .
```

**Dockerfile (apps/api/Dockerfile):**

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/database/package.json packages/database/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @cipta/database exec prisma generate
RUN pnpm --filter api build

# Stage 2: Production
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/packages/database ./packages/database

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

**Deploy:**

```bash
# Push to container registry
docker tag cipta-api:latest ghcr.io/your-org/cipta-api:latest
docker push ghcr.io/your-org/cipta-api:latest

# Deploy via orchestrator (example: docker compose)
docker compose -f docker-compose.prod.yml up -d api
```

---

### 3.3 Worker (`apps/worker`) — Container Deploy

**Build:**

```bash
docker build -f apps/worker/Dockerfile -t cipta-worker:latest .
```

**Dockerfile (apps/worker/Dockerfile):**

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/database/package.json packages/database/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @cipta/database exec prisma generate
RUN pnpm --filter worker build

# Stage 2: Production
FROM node:22-alpine AS runner

# Install FFmpeg and yt-dlp
RUN apk add --no-cache ffmpeg python3 py3-pip curl \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/apps/worker/package.json ./
COPY --from=builder /app/apps/worker/node_modules ./node_modules
COPY --from=builder /app/packages/database ./packages/database

# Temp directory for processing
RUN mkdir -p /tmp/cipta

ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
```

> **Note:** For GPU-accelerated workers, use `nvidia/cuda:12.x-runtime-ubuntu22.04` as base image and install NVENC-capable FFmpeg.

---

### 3.4 Database Migrations

```bash
# ⚠️ ALWAYS run migrations BEFORE deploying new API/Worker code

# 1. Create a migration (development)
pnpm --filter @cipta/database exec prisma migrate dev --name <descriptive_name>

# 2. Apply migrations to staging
DATABASE_URL=$STAGING_DB_URL pnpm --filter @cipta/database exec prisma migrate deploy

# 3. Verify migration applied
DATABASE_URL=$STAGING_DB_URL pnpm --filter @cipta/database exec prisma migrate status

# 4. Apply to production
DATABASE_URL=$PRODUCTION_DB_URL pnpm --filter @cipta/database exec prisma migrate deploy
```

**Migration Order:**

```
1. Run migration on production DB        ← First
2. Deploy API server (new code)           ← Second
3. Deploy Workers (new code)              ← Third
4. Deploy Frontend                        ← Last
```

> [!CAUTION]
> **Never** drop columns or tables in the same release that removes the code using them. Use a two-phase migration: Phase 1 — deploy code that stops using the column. Phase 2 (next release) — drop the column.

---

## 4. Rollback Procedures

### 4.1 API Rollback

```bash
# Option A: Redeploy previous container image
docker compose -f docker-compose.prod.yml up -d \
  --no-deps api \
  -e IMAGE_TAG=previous-sha

# Option B: Docker Compose
docker compose -f docker-compose.prod.yml stop api
docker compose -f docker-compose.prod.yml up -d api --force-recreate
```

### 4.2 Database Rollback

```bash
# ⚠️ Prisma does NOT support automatic rollback of `prisma migrate deploy`.
# You must manually create a "down" migration.

# Option 1: Create a corrective migration
pnpm --filter @cipta/database exec prisma migrate dev --name revert_bad_change

# Option 2: Restore from backup (last resort)
pg_restore -h $DB_HOST -U $DB_USER -d cipta backup_before_migration.dump
```

### 4.3 Worker Rollback

Workers are stateless — just redeploy the previous image. Active jobs will be picked up by healthy workers or retried by BullMQ after the stall timeout.

---

## 5. CI/CD Pipeline

### 5.1 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm check-types
      - run: pnpm test

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [api, worker]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/${{ matrix.app }}/Dockerfile
          push: true
          tags: ghcr.io/${{ github.repository }}/cipta-${{ matrix.app }}:${{ github.sha }}

  migrate:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @cipta/database exec prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}

  deploy:
    needs: migrate
    runs-on: ubuntu-latest
    steps:
      # Deploy to your hosting provider (Docker, K8s, Coolify, etc.)
      - run: echo "Deploy containers with tag ${{ github.sha }}"
```

---

## 6. Environment Matrix

| Variable            | Dev         | Staging           | Production   |
| ------------------- | ----------- | ----------------- | ------------ |
| `NODE_ENV`          | development | staging           | production   |
| `API_PORT`          | 3001        | 3001              | 3001         |
| `DATABASE_URL`      | localhost   | staging-db.host   | prod-db.host |
| `REDIS_HOST`        | localhost   | staging-redis     | prod-redis   |
| `STORAGE_PROVIDER`  | local       | s3                | s3           |
| `STORAGE_BUCKET`    | —           | cipta-staging     | cipta-prod   |
| `JWT_ACCESS_EXPIRY` | 1h          | 15m               | 15m          |
| `LOG_LEVEL`         | debug       | info              | info         |
| `CORS_ORIGIN`       | \*          | staging.cipta.app | cipta.app    |
