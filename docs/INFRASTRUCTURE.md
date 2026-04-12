# Cipta — Infrastructure Specification

> **Version:** 0.1.0-alpha  
> **Last Updated:** 2026-04-11

---

## 1. Infrastructure Overview

```
┌────────────────────────────────────────────────────────────────┐
│                        INTERNET                                │
│                           │                                    │
│                    ┌──────▼──────┐                             │
│                    │ Cloudflare  │ CDN, DDoS, WAF              │
│                    │   DNS/CDN   │                             │
│                    └──────┬──────┘                             │
│                           │                                    │
│          ┌────────────────┼────────────────┐                  │
│          │                │                │                  │
│    ┌─────▼─────┐   ┌─────▼─────┐   ┌──────▼──────┐         │
│    │  Vercel   │   │   Load    │   │  WebSocket  │         │
│    │  (Web)    │   │  Balancer │   │  Gateway    │         │
│    │  Static   │   │           │   │  (Sticky)   │         │
│    └───────────┘   └─────┬─────┘   └──────┬──────┘         │
│                          │                 │                  │
│                    ┌─────▼─────────────────▼─────┐           │
│                    │      API Container Pool      │           │
│                    │   ┌─────┐ ┌─────┐ ┌─────┐  │           │
│                    │   │ API │ │ API │ │ API │  │           │
│                    │   │  1  │ │  2  │ │  3  │  │           │
│                    │   └──┬──┘ └──┬──┘ └──┬──┘  │           │
│                    └──────┼──────┼───────┼──────┘           │
│                           │      │       │                    │
│          ┌────────────────▼──────▼───────▼──────┐            │
│          │           Redis Cluster               │            │
│          │   ┌─────────┐   ┌───────────────┐    │            │
│          │   │ BullMQ  │   │  Session /    │    │            │
│          │   │ Queues  │   │  Cache Store  │    │            │
│          │   └────┬────┘   └───────────────┘    │            │
│          └────────┼─────────────────────────────┘            │
│                   │                                           │
│          ┌────────▼────────────────────────┐                 │
│          │      Worker Container Pool      │                 │
│          │  ┌────────┐ ┌────────┐         │                 │
│          │  │Worker 1│ │Worker 2│  ...     │                 │
│          │  │  CPU   │ │  GPU   │         │                 │
│          │  └───┬────┘ └───┬────┘         │                 │
│          └──────┼──────────┼──────────────┘                 │
│                 │          │                                  │
│     ┌───────────▼──────────▼──────────┐                     │
│     │       Cloud Storage (S3/GCS)    │                     │
│     │  ┌─────────┐  ┌────────────┐   │                     │
│     │  │ Sources  │  │  Assets /  │   │                     │
│     │  │ / Media  │  │ Variations │   │                     │
│     │  └─────────┘  └────────────┘   │                     │
│     └─────────────────────────────────┘                     │
│                                                              │
│     ┌─────────────────────────────────┐                     │
│     │       PostgreSQL (Managed)      │                     │
│     │  Primary ──► Read Replica       │                     │
│     └─────────────────────────────────┘                     │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Service Components

### 2.1 Compute Services

| Component          | Provider Options                        | Sizing (MVP)                | Sizing (Scale)                 |
| ------------------ | --------------------------------------- | --------------------------- | ------------------------------ |
| **Web (Frontend)** | Vercel, Cloudflare Pages                | Free tier                   | Pro plan                       |
| **API Server**     | Railway, Fly.io, Coolify (VPS), AWS ECS | 1 instance, 1 vCPU, 1GB RAM | 2-4 instances, 2 vCPU, 2GB RAM |
| **Worker (CPU)**   | Railway, Fly.io, Hetzner VPS, AWS ECS   | 1 instance, 2 vCPU, 4GB RAM | 3-8 instances                  |
| **Worker (GPU)**   | RunPod, Lambda Cloud, AWS g4dn          | On-demand only              | 1-4 instances                  |

### 2.2 Data Services

| Component          | Provider Options                  | Sizing (MVP)       | Sizing (Scale) |
| ------------------ | --------------------------------- | ------------------ | -------------- |
| **PostgreSQL**     | Supabase, Neon, Railway, AWS RDS  | Free/Starter (1GB) | Pro (50GB+)    |
| **Redis**          | Upstash, Railway, AWS ElastiCache | Free tier (256MB)  | Pro (1GB+)     |
| **Object Storage** | AWS S3, GCS, Cloudflare R2        | Pay-per-use        | Pay-per-use    |
| **CDN**            | Cloudflare (free), AWS CloudFront | Free tier          | Pro plan       |

### 2.3 External Dependencies

| Service                | Purpose                       | Fallback                                   |
| ---------------------- | ----------------------------- | ------------------------------------------ |
| **FFmpeg**             | Video processing              | None (required)                            |
| **yt-dlp**             | Media downloading             | gallery-dl, custom scrapers                |
| **OpenAI Whisper API** | Transcription                 | Deepgram, AssemblyAI, self-hosted Whisper  |
| **OpenAI GPT API**     | Viral spike analysis          | Anthropic Claude, Google Gemini, local LLM |
| **TikTok Content API** | Publishing                    | Manual upload fallback                     |
| **Meta Graph API**     | Instagram/Facebook publishing | Manual upload fallback                     |
| **YouTube Data API**   | YouTube Shorts publishing     | Manual upload fallback                     |

---

## 3. Docker Configuration

### 3.1 Development Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: cipta
      POSTGRES_USER: cipta
      POSTGRES_PASSWORD: cipta_dev
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U cipta']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - '6379:6379'
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy noeviction
    volumes:
      - redisdata:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  # Optional: MinIO for local S3-compatible storage
  minio:
    image: minio/minio:latest
    restart: unless-stopped
    ports:
      - '9000:9000'
      - '9001:9001'
    environment:
      MINIO_ROOT_USER: cipta
      MINIO_ROOT_PASSWORD: cipta_dev_123
    command: server /data --console-address ":9001"
    volumes:
      - miniodata:/data

  # Optional: Bull Board standalone (if not embedded in API)
  # bull-board:
  #   image: deadly0/bull-board:latest
  #   ports:
  #     - '3002:3000'
  #   environment:
  #     REDIS_HOST: redis
  #     REDIS_PORT: 6379

volumes:
  pgdata:
  redisdata:
  miniodata:
```

### 3.2 Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api:
    image: ghcr.io/${GITHUB_REPOSITORY}/cipta-api:${IMAGE_TAG:-latest}
    restart: unless-stopped
    ports:
      - '3001:3001'
    env_file:
      - .env.production
    depends_on:
      - redis
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3001/health']
      interval: 30s
      timeout: 10s
      retries: 3

  worker:
    image: ghcr.io/${GITHUB_REPOSITORY}/cipta-worker:${IMAGE_TAG:-latest}
    restart: unless-stopped
    env_file:
      - .env.production
    depends_on:
      - redis
    deploy:
      replicas: ${WORKER_REPLICAS:-2}
      resources:
        limits:
          cpus: '4.0'
          memory: 8G
    volumes:
      - worker-tmp:/tmp/cipta
    healthcheck:
      test:
        [
          'CMD',
          'node',
          '-e',
          "require('net').connect(process.env.REDIS_PORT, process.env.REDIS_HOST).on('connect', () => process.exit(0)).on('error', () => process.exit(1))",
        ]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: >
      redis-server
      --appendonly yes
      --maxmemory 1gb
      --maxmemory-policy noeviction
      --requirepass ${REDIS_PASSWORD}
    volumes:
      - redisdata:/data
    deploy:
      resources:
        limits:
          memory: 1.5G

  # Reverse proxy (for non-Vercel deployments)
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - api

volumes:
  redisdata:
  worker-tmp:
```

---

## 4. Networking

### 4.1 Ports

| Service       | Internal Port        | External Port | Protocol |
| ------------- | -------------------- | ------------- | -------- |
| Web (Next.js) | 3000                 | 443 (CDN)     | HTTPS    |
| API (NestJS)  | 3001                 | 443 (LB)      | HTTPS    |
| API WebSocket | 3001 `/ws`           | 443 (LB)      | WSS      |
| PostgreSQL    | 5432                 | — (internal)  | TCP      |
| Redis         | 6379                 | — (internal)  | TCP      |
| MinIO (dev)   | 9000/9001            | 9000/9001     | HTTP     |
| Bull Board    | 3001 `/admin/queues` | 443 (LB)      | HTTPS    |

### 4.2 DNS Records

| Record              | Type  | Value              | Proxy                               |
| ------------------- | ----- | ------------------ | ----------------------------------- |
| `cipta.app`         | A     | Vercel IP          | Yes (Cloudflare)                    |
| `www.cipta.app`     | CNAME | `cipta.app`        | Yes                                 |
| `api.cipta.app`     | A     | Load Balancer IP   | Yes (Cloudflare, WebSocket enabled) |
| `storage.cipta.app` | CNAME | S3 bucket endpoint | Yes                                 |

### 4.3 Firewall Rules

| Source            | Destination         | Port | Allow |
| ----------------- | ------------------- | ---- | ----- |
| Internet          | Load Balancer       | 443  | ✅    |
| Load Balancer     | API containers      | 3001 | ✅    |
| API containers    | PostgreSQL          | 5432 | ✅    |
| API containers    | Redis               | 6379 | ✅    |
| Worker containers | PostgreSQL          | 5432 | ✅    |
| Worker containers | Redis               | 6379 | ✅    |
| Worker containers | Internet (ext APIs) | 443  | ✅    |
| Internet          | PostgreSQL          | 5432 | ❌    |
| Internet          | Redis               | 6379 | ❌    |

---

## 5. Storage Architecture

### 5.1 S3 Bucket Structure

```
cipta-{environment}/
├── sources/
│   └── {workspace_id}/{source_id}/
│       ├── original.mp4          # ~100MB-10GB per file
│       └── thumbnail.jpg         # ~50KB per file
├── chunks/
│   └── {workspace_id}/{chunk_id}.mp4    # ~10-100MB per file
├── assets/
│   └── {workspace_id}/{asset_id}.mp4    # ~10-50MB per file
├── variations/
│   └── {workspace_id}/{variation_id}.mp4 # ~10-50MB per file
└── exports/
    └── {workspace_id}/            # User data exports
```

### 5.2 Lifecycle Policies

| Path          | Retention  | Storage Class               |
| ------------- | ---------- | --------------------------- |
| `sources/`    | 90 days    | Standard → IA after 30 days |
| `chunks/`     | 30 days    | Standard                    |
| `assets/`     | Indefinite | Standard                    |
| `variations/` | Indefinite | Standard                    |
| `exports/`    | 7 days     | Standard (auto-delete)      |

### 5.3 CORS Configuration (S3)

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedOrigins": ["https://cipta.app", "https://www.cipta.app", "http://localhost:3000"],
      "ExposeHeaders": ["Content-Length", "Content-Type"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

---

## 6. System Requirements

### 6.1 Development Machine

| Component | Minimum                               | Recommended            |
| --------- | ------------------------------------- | ---------------------- |
| CPU       | 4 cores                               | 8+ cores               |
| RAM       | 8 GB                                  | 16+ GB                 |
| Disk      | 20 GB free                            | 50+ GB SSD             |
| Node.js   | 22 LTS                                | 22 LTS                 |
| FFmpeg    | 6+                                    | 7+ (with NVENC if GPU) |
| Docker    | 24+                                   | Latest                 |
| OS        | Windows 10+, macOS 12+, Ubuntu 22.04+ | Any                    |

### 6.2 Production (Per Instance)

| Component | API Server | Worker (CPU) | Worker (GPU)     |
| --------- | ---------- | ------------ | ---------------- |
| CPU       | 2 vCPU     | 4 vCPU       | 4 vCPU           |
| RAM       | 2 GB       | 8 GB         | 16 GB            |
| Disk      | 10 GB      | 50 GB SSD    | 100 GB SSD       |
| GPU       | —          | —            | NVIDIA T4 / A10G |
| Network   | 100 Mbps   | 500 Mbps+    | 500 Mbps+        |

---

## 7. Monitoring Infrastructure

```
┌──────────────────────────────────────────┐
│            Observability Stack           │
│                                          │
│   ┌────────────┐     ┌──────────────┐   │
│   │ API/Worker  │────▶│   Pino       │   │
│   │  (stdout)   │     │ JSON Logs    │   │
│   └────────────┘     └──────┬───────┘   │
│                             │            │
│                      ┌──────▼───────┐   │
│                      │ Log Collector│   │
│                      │ (Loki/ELK)  │   │
│                      └──────┬───────┘   │
│                             │            │
│                      ┌──────▼───────┐   │
│                      │  Grafana     │   │
│                      │  Dashboard   │   │
│                      └──────────────┘   │
│                                          │
│   ┌────────────┐     ┌──────────────┐   │
│   │ Bull Board │     │  Sentry      │   │
│   │ Job Monitor│     │  Error Track │   │
│   └────────────┘     └──────────────┘   │
│                                          │
│   ┌────────────────────────────────────┐ │
│   │  Health Checks (Uptime Robot)      │ │
│   │  - API /health endpoint            │ │
│   │  - Alerting → Slack/PagerDuty     │ │
│   └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

See [OBSERVABILITY.md](./OBSERVABILITY.md) for detailed logging, metrics, and alerting specifications.

---

## 8. Disaster Recovery

| Scenario                | RPO        | RTO       | Strategy                                     |
| ----------------------- | ---------- | --------- | -------------------------------------------- |
| API instance failure    | 0          | < 5 min   | Auto-restart, LB removes unhealthy           |
| Worker instance failure | 0          | < 2 min   | BullMQ auto-retries stalled jobs             |
| Redis failure           | < 1 min    | < 10 min  | AOF persistence + managed Redis failover     |
| PostgreSQL failure      | < 5 min    | < 15 min  | Managed DB auto-failover + PITR              |
| Full region failure     | < 1 hour   | < 4 hours | Cross-region backup restore (manual)         |
| Storage bucket deletion | < 24 hours | < 8 hours | Versioned buckets + cross-region replication |

**RPO** = Recovery Point Objective (max acceptable data loss)  
**RTO** = Recovery Time Objective (max acceptable downtime)
