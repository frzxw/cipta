---
name: Dev Environment Setup
description: >
  Set up the complete Cipta development environment from a fresh clone. Use when the
  user says "set up the project", "fresh install", "bootstrap the repo", "how to start
  developing", or "initialize the workspace".
---

# Dev Environment Setup

Bootstraps the full development environment from scratch.

## Trigger

User needs to set up the project for the first time or reset their environment.

## Required Input

None — this is a fully automated setup.

## Prerequisites Check

Verify these tools are installed before proceeding. If missing, tell the user to install them:

```
node --version    # Must be 22.x
pnpm --version    # Must be 9.x
docker --version  # Must be installed
ffmpeg -version   # Must be 7+ (for worker)
yt-dlp --version  # Must be installed (for worker)
```

## Steps

### 1. Install dependencies

// turbo
```
pnpm install
```

### 2. Start infrastructure

```
docker compose up -d
```

Wait for PostgreSQL and Redis to be healthy.

### 3. Create environment files

Copy `.env.example` files for each app:

```
copy apps\api\.env.example apps\api\.env
copy apps\worker\.env.example apps\worker\.env
copy apps\web\.env.example apps\web\.env
```

If `.env.example` files don't exist, create them with the defaults from `docs/CONFIG.md §2`.

### 4. Generate JWT secrets

Generate and insert random secrets into `apps/api/.env`:

```
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Set the output as `JWT_ACCESS_SECRET`. Run again for `JWT_REFRESH_SECRET`. Run again (32 bytes) for `CREDENTIAL_ENCRYPTION_KEY`.

### 5. Run database setup

// turbo
```
pnpm --filter @cipta/database exec prisma migrate dev
```

// turbo
```
pnpm --filter @cipta/database exec prisma generate
```

### 6. Seed database (optional)

If a seed file exists:

```
pnpm --filter @cipta/database exec prisma db seed
```

### 7. Verify build

// turbo
```
pnpm build
```

### 8. Start development

// turbo
```
pnpm dev
```

### 9. Verify services are running

Report these URLs to the user:

| Service | URL |
|---------|-----|
| Web Dashboard | `http://localhost:3000` |
| API Server | `http://localhost:3001` |
| API Health | `http://localhost:3001/health` |
| Bull Board | `http://localhost:3001/admin/queues` |
| Prisma Studio | Run `pnpm --filter @cipta/database exec prisma studio` → `http://localhost:5555` |

## Expected Output

All three apps (web, api, worker) running in dev mode, database migrated, infrastructure healthy.
