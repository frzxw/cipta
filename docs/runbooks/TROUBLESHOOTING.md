# Runbook: Troubleshooting Guide

> **Audience:** All Engineers  
> **Last Updated:** 2026-04-11

---

## 1. Development Environment Issues

### 1.1 `pnpm install` Fails

```
Error: ENOENT: no such file or directory, open 'pnpm-lock.yaml'
```

**Fix:**

```bash
# Ensure you're in the repo root
pnpm install

# If lockfile is corrupt
rm pnpm-lock.yaml
pnpm install
```

---

### 1.2 Prisma Client Not Generated

```
Cannot find module '@cipta/database' or its corresponding type declarations
```

**Fix:**

```bash
pnpm --filter @cipta/database exec prisma generate
```

---

### 1.3 Docker Compose Services Won't Start

```
ERROR: for postgres  Cannot start service postgres: port is already allocated
```

**Fix:**

```bash
# Check what's using the port
# Windows:
netstat -ano | findstr :5432

# Linux/Mac:
lsof -i :5432

# Option A: Stop the conflicting service
# Option B: Change the port in docker-compose.yml
```

---

### 1.4 Turborepo Cache Issues

```
Build produces stale output / changes not reflected
```

**Fix:**

```bash
# Clear turbo cache
pnpm exec turbo run build --force

# Or delete cache entirely
rmdir /s /q .turbo
# Unix: rm -rf .turbo
```

---

## 2. API Server Issues

### 2.1 NestJS Won't Bootstrap

```
Error: Nest can't resolve dependencies of the XxxService
```

**Diagnosis:** A service's dependency isn't registered in its module.

**Fix:**

1. Check the module's `providers` array includes all services
2. Check `imports` includes modules that export needed providers
3. Ensure `@Injectable()` decorator is on the service class
4. Check for circular module dependencies (use `forwardRef()`)

```typescript
// Common fix — ensure the module exports what's needed
@Module({
  imports: [DatabaseModule], // Must be imported if using PrismaService
  providers: [IngestorService],
  exports: [IngestorService], // Must be exported if other modules use it
})
export class IngestorModule {}
```

---

### 2.2 JWT Authentication Failures

```
401 Unauthorized — "Invalid token" or "Token expired"
```

**Diagnosis checklist:**

```bash
# 1. Decode the token (jwt.io or cli)
echo $TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | jq .

# 2. Check expiry (exp field) vs current time
date +%s  # Current Unix timestamp

# 3. Check the secret matches
# Ensure JWT_ACCESS_SECRET in .env matches what was used to sign

# 4. Check clock skew between client and server
```

**Common fixes:**

- Token expired → Use refresh flow
- Secret mismatch between API instances → Ensure same `.env` on all instances
- Missing `Bearer` prefix → Header must be `Authorization: Bearer <token>`

---

### 2.3 CORS Errors

```
Access-Control-Allow-Origin header missing
```

**Fix:** Check `CORS_ORIGIN` in API `.env`:

```bash
# Development
CORS_ORIGIN=http://localhost:3000

# Production (comma-separated)
CORS_ORIGIN=https://cipta.app,https://www.cipta.app
```

---

### 2.4 Rate Limit Hit (429)

```
429 Too Many Requests — "Rate limit exceeded"
```

**Client-side:** Implement retry with exponential backoff.

```typescript
const retryAfter = parseInt(response.headers['retry-after'] || '60');
await sleep(retryAfter * 1000);
```

**Server-side (adjust limits):**

```typescript
// In ThrottlerModule config
ThrottlerModule.forRoot([{ ttl: 60000, limit: 200 }]); // Increase limit
```

---

## 3. Worker Issues

### 3.1 yt-dlp Download Failures

```
ERROR: [youtube] xxx: Video unavailable
```

| Error Message                 | Cause                                | Fix                          |
| ----------------------------- | ------------------------------------ | ---------------------------- |
| `Video unavailable`           | Video is private/deleted/geo-blocked | Skip, mark source FAILED     |
| `HTTP Error 429`              | YouTube rate limiting                | Rotate IP / use proxy / wait |
| `Unable to extract`           | yt-dlp version outdated              | `pip install -U yt-dlp`      |
| `Sign in to confirm your age` | Age-restricted content               | Provide cookies file         |
| `Premieres in X hours`        | Video not yet live                   | Schedule retry               |

```bash
# Update yt-dlp
pip install -U yt-dlp

# Test a URL manually
yt-dlp --print-json --skip-download "https://youtube.com/watch?v=xxx"

# Use with cookies (for age-restricted / login-required)
yt-dlp --cookies cookies.txt "https://..."
```

---

### 3.2 Whisper API Timeout

```
Error: Request timeout after 120000ms
```

**Likely cause:** Audio file is too large (> 25MB Whisper limit).

**Fix:**

```bash
# 1. Check file size
ls -lh audio.mp3

# 2. If > 25MB, compress first
ffmpeg -i audio.mp3 -b:a 64k -ar 16000 -ac 1 compressed.mp3

# 3. Or split into chunks
ffmpeg -i audio.mp3 -f segment -segment_time 600 -c copy chunk_%03d.mp3
```

---

### 3.3 FFmpeg Exit Code 137 (OOM Kill)

```
Process exited with code 137
```

**Diagnosis:**

```bash
# Check dmesg for OOM kills
dmesg | grep -i "oom\|killed" | tail -10

# Check current memory usage
docker stats --no-stream | grep worker
```

**Fixes:**

1. Reduce `WORKER_CONCURRENCY_FACTORY` (fewer concurrent FFmpeg processes)
2. Increase container memory limit
3. Use more aggressive FFmpeg preset (`-preset fast` instead of `medium`)
4. For 4K+ sources, downscale input first

---

### 3.4 Guardian Variations Producing Identical Hashes

```
Error: Failed to generate unique hash after max attempts
```

**Extremely rare.** If it happens:

1. Verify the random seed is actually changing between attempts
2. Check that FFmpeg filters are actually being applied (log the command)
3. Increase the variation range in `GuardianParams` (use `aggressive` preset)
4. Check that `-map_metadata -1` isn't being overridden

---

## 4. Frontend Issues

### 4.1 Next.js Build Failures

```
Type error: Property 'xxx' does not exist on type 'yyy'
```

**Fix:**

```bash
# Regenerate types
pnpm --filter web check-types

# If it's a Prisma type issue
pnpm --filter @cipta/database exec prisma generate
```

---

### 4.2 WebSocket Connection Failures

```
WebSocket connection to 'wss://api.cipta.app/ws' failed
```

**Diagnosis:**

```bash
# 1. Check API WebSocket gateway is running
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  http://localhost:3001/ws

# 2. Check reverse proxy/LB supports WebSocket upgrade
# Nginx: ensure proxy_set_header Upgrade $http_upgrade;
# Cloudflare: WebSocket support must be enabled (on by default)

# 3. Check CORS allows WebSocket origin
```

---

### 4.3 API Calls Returning Stale Data

**Likely cause:** React Query cache not invalidated after mutation.

**Fix:**

```typescript
// After a mutation, invalidate related queries
const mutation = useMutation({
  mutationFn: createSource,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['sources'] });
  },
});
```

---

## 5. Platform-Specific Publishing Issues

### 5.1 TikTok

| Error                        | Cause                     | Fix                              |
| ---------------------------- | ------------------------- | -------------------------------- |
| `access_token_expired`       | OAuth token expired       | Refresh token via TikTok API     |
| `spam_risk_detected`         | Flagged as automated      | Increase cooldown, reduce volume |
| `video_format_not_supported` | Wrong codec/container     | Ensure H.264 MP4, AAC audio      |
| `file_too_large`             | > 287MB for direct upload | Compress video                   |

### 5.2 Instagram

| Error                        | Cause                        | Fix                            |
| ---------------------------- | ---------------------------- | ------------------------------ |
| `OAuthException`             | Token expired or invalidated | Re-authenticate via Meta Graph |
| `RATE_LIMIT_REACHED`         | Too many API calls           | Wait for rate limit reset      |
| `VIDEO_TOO_SHORT`            | < 3 seconds                  | Ensure chunk min duration      |
| `ASPECT_RATIO_NOT_SUPPORTED` | Not 9:16 for Reels           | Check frameConfig              |

### 5.3 YouTube

| Error                     | Cause                              | Fix                                 |
| ------------------------- | ---------------------------------- | ----------------------------------- |
| `quotaExceeded`           | Daily API quota hit (10,000 units) | Wait 24h or request quota increase  |
| `notFound`                | Channel not found                  | Verify OAuth scope includes upload  |
| `forbidden`               | Missing upload permissions         | Re-authenticate with correct scopes |
| `videoTooLong` for Shorts | > 60 seconds                       | Trim to under 60s                   |

---

## 6. Diagnostic Commands Cheatsheet

```bash
# ── System Health ──
curl http://localhost:3001/health          # API health
redis-cli -h $REDIS_HOST ping              # Redis alive?
pg_isready -h $DB_HOST                     # PostgreSQL alive?
ffmpeg -version | head -1                  # FFmpeg version
yt-dlp --version                           # yt-dlp version

# ── Queue Status ──
redis-cli -h $REDIS_HOST LLEN bull:cipta:ingestor:wait
redis-cli -h $REDIS_HOST LLEN bull:cipta:factory:wait
redis-cli -h $REDIS_HOST LLEN bull:cipta:guardian:wait
redis-cli -h $REDIS_HOST LLEN bull:cipta:fleet:wait

# ── Process Health ──
docker compose ps                          # Container status
docker stats --no-stream                   # CPU/Memory per container
docker compose logs api --tail=50          # Recent API logs
docker compose logs worker --tail=50       # Recent Worker logs

# ── Database ──
psql -h $DB_HOST -U cipta -c "SELECT count(*) FROM sources;"
psql -h $DB_HOST -U cipta -c "SELECT status, count(*) FROM sources GROUP BY status;"
psql -h $DB_HOST -U cipta -c "SELECT status, count(*) FROM jobs GROUP BY status;"

# ── Disk ──
df -h /tmp/cipta                           # Worker temp space
du -sh /tmp/cipta/*                        # Usage by directory
```
