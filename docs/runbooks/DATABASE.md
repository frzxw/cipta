# Runbook: Database Operations

> **Audience:** Backend Engineers, DevOps  
> **Database:** PostgreSQL 16+ via Prisma ORM  
> **Last Updated:** 2026-04-11

---

## 1. Connection Management

### 1.1 Connection Strings

```bash
# Development
DATABASE_URL="postgresql://cipta:cipta_dev@localhost:5432/cipta"

# Staging
DATABASE_URL="postgresql://cipta:${DB_PASSWORD}@staging-db.internal:5432/cipta?sslmode=require"

# Production
DATABASE_URL="postgresql://cipta:${DB_PASSWORD}@prod-db.internal:5432/cipta?sslmode=require&connection_limit=20"
```

### 1.2 Connection Pooling

Prisma manages its own connection pool. Configure via the connection string:

| Parameter          | Dev | Production | Notes                                   |
| ------------------ | --- | ---------- | --------------------------------------- |
| `connection_limit` | 5   | 20         | Per API/Worker instance                 |
| `pool_timeout`     | 10  | 10         | Seconds to wait for a connection        |
| `connect_timeout`  | 5   | 5          | Seconds before connection attempt fails |

```
DATABASE_URL="postgresql://...?connection_limit=20&pool_timeout=10&connect_timeout=5"
```

**Rule of Thumb:** Total connections across all instances ≤ PostgreSQL `max_connections` (default: 100). With 3 API instances + 2 Workers at 20 each = 100. Adjust accordingly.

### 1.3 Diagnose Connection Issues

```bash
# Check current connections
psql -h $DB_HOST -U cipta -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'cipta';"

# Check connection states
psql -h $DB_HOST -U cipta -c "
  SELECT state, count(*)
  FROM pg_stat_activity
  WHERE datname = 'cipta'
  GROUP BY state;
"

# Kill idle connections older than 10 minutes
psql -h $DB_HOST -U cipta -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'cipta'
    AND state = 'idle'
    AND state_change < now() - interval '10 minutes';
"
```

---

## 2. Migration Operations

### 2.1 Development Workflow

```bash
# 1. Make schema changes in packages/database/prisma/schema.prisma

# 2. Generate and apply migration
pnpm --filter @cipta/database exec prisma migrate dev --name add_user_avatar_field

# 3. Migration creates:
#    packages/database/prisma/migrations/
#    └── 20260411080000_add_user_avatar_field/
#        └── migration.sql

# 4. Verify with Prisma Studio
pnpm --filter @cipta/database exec prisma studio
```

### 2.2 Production Deployment

```bash
# Apply all pending migrations (non-interactive, safe for CI)
DATABASE_URL=$PROD_URL pnpm --filter @cipta/database exec prisma migrate deploy

# Check migration status
DATABASE_URL=$PROD_URL pnpm --filter @cipta/database exec prisma migrate status
```

### 2.3 Emergency: Failed Migration

If a migration partially applies and fails:

```bash
# 1. Check which migrations are pending/failed
prisma migrate status

# 2. If migration SQL partially ran, you must manually fix the DB state:
psql -h $DB_HOST -U cipta -d cipta

# 3. Then mark the failed migration as rolled back:
prisma migrate resolve --rolled-back 20260411080000_add_user_avatar_field

# 4. Fix the migration SQL and re-attempt:
prisma migrate deploy
```

### 2.4 Dangerous Operations: Column/Table Removal

**Never drop columns or tables in the same deploy that removes the code.**

Phase 1 (deploy N):

```prisma
// Keep the column but stop using it in code
model User {
  oldField String? // @deprecated — will be removed in next release
}
```

Phase 2 (deploy N+1):

```bash
# Now safe to drop
prisma migrate dev --name drop_old_field
```

---

## 3. Backup & Restore

### 3.1 Automated Backups

```bash
# pg_dump — full logical backup
pg_dump -h $DB_HOST -U cipta -d cipta \
  --format=custom \
  --compress=9 \
  --file="cipta_$(date +%Y%m%d_%H%M%S).dump"
```

**Backup Schedule (cron):**

```cron
# Every 6 hours
0 */6 * * * /usr/local/bin/backup-cipta.sh >> /var/log/cipta-backup.log 2>&1
```

**Retention:**

- Hourly: keep 24
- Daily: keep 30
- Weekly: keep 12

### 3.2 Restore from Backup

```bash
# ⚠️ This DESTROYS the current database. Be absolutely certain.

# 1. Stop API and Worker services
docker compose stop api worker

# 2. Create fresh database (drop + create)
psql -h $DB_HOST -U postgres -c "DROP DATABASE IF EXISTS cipta;"
psql -h $DB_HOST -U postgres -c "CREATE DATABASE cipta OWNER cipta;"

# 3. Restore
pg_restore -h $DB_HOST -U cipta -d cipta --no-owner cipta_20260411_080000.dump

# 4. Verify
psql -h $DB_HOST -U cipta -d cipta -c "SELECT count(*) FROM users;"

# 5. Restart services
docker compose start api worker
```

### 3.3 Point-in-Time Recovery (Managed DB)

If using managed PostgreSQL (Supabase, RDS, Cloud SQL), use their native PITR:

- **Supabase:** Dashboard → Database → Backups → Restore to point in time
- **AWS RDS:** Console → Modify → Enable automated backups → Restore to point in time
- **Cloud SQL:** Console → Backups → Create clone at point in time

---

## 4. Performance Monitoring

### 4.1 Slow Query Detection

```sql
-- Enable slow query logging (postgresql.conf)
-- log_min_duration_statement = 500  -- Log queries > 500ms

-- Find slow queries
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### 4.2 Table Size Monitoring

```sql
-- Table sizes
SELECT
  schemaname || '.' || tablename AS table,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) AS data_size,
  pg_size_pretty(pg_indexes_size(schemaname || '.' || tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
```

### 4.3 Missing Index Detection

```sql
-- Tables with sequential scans (may need indexes)
SELECT
  schemaname, relname,
  seq_scan, seq_tup_read,
  idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > 1000
  AND idx_scan < seq_scan / 10
ORDER BY seq_tup_read DESC;
```

### 4.4 Workspace Query Performance

Since every query is workspace-scoped, ensure composite indexes exist:

```sql
-- Verify critical indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE indexname LIKE '%workspace%'
ORDER BY tablename;

-- If missing, add via Prisma schema:
-- @@index([workspaceId])
-- @@index([workspaceId, status])
```

---

## 5. Data Management

### 5.1 Orphan Cleanup

Jobs and temp data can accumulate. Run periodic cleanup:

```sql
-- Delete completed jobs older than 30 days
DELETE FROM jobs
WHERE status = 'COMPLETED'
  AND "completedAt" < now() - interval '30 days';

-- Delete failed jobs older than 90 days
DELETE FROM jobs
WHERE status = 'FAILED'
  AND "createdAt" < now() - interval '90 days';

-- Find sources with no chunks (orphaned downloads)
SELECT s.id, s.url, s.status, s."createdAt"
FROM sources s
LEFT JOIN chunks c ON c."sourceId" = s.id
WHERE c.id IS NULL
  AND s.status = 'READY'
  AND s."createdAt" < now() - interval '7 days';
```

### 5.2 Workspace Data Export

```sql
-- Export all data for a workspace (GDPR compliance)
COPY (
  SELECT * FROM sources WHERE "workspaceId" = $1
) TO '/tmp/export_sources.csv' WITH CSV HEADER;

-- Repeat for all tables...
```

### 5.3 Workspace Data Deletion

```sql
-- ⚠️ CASCADE will remove all related records
-- Order matters due to foreign keys

BEGIN;
  DELETE FROM distributions WHERE "workspaceId" = $1;
  DELETE FROM variations WHERE "assetId" IN (SELECT id FROM assets WHERE "workspaceId" = $1);
  DELETE FROM assets WHERE "workspaceId" = $1;
  DELETE FROM chunks WHERE "sourceId" IN (SELECT id FROM sources WHERE "workspaceId" = $1);
  DELETE FROM viral_spikes WHERE "transcriptId" IN (
    SELECT t.id FROM transcripts t
    JOIN sources s ON t."sourceId" = s.id
    WHERE s."workspaceId" = $1
  );
  DELETE FROM transcripts WHERE "sourceId" IN (SELECT id FROM sources WHERE "workspaceId" = $1);
  DELETE FROM sources WHERE "workspaceId" = $1;
  DELETE FROM jobs WHERE "workspaceId" = $1;
  DELETE FROM distribution_rules WHERE "clusterId" IN (SELECT id FROM clusters WHERE "workspaceId" = $1);
  DELETE FROM cluster_accounts WHERE "clusterId" IN (SELECT id FROM clusters WHERE "workspaceId" = $1);
  DELETE FROM clusters WHERE "workspaceId" = $1;
  DELETE FROM accounts WHERE "workspaceId" = $1;
  DELETE FROM render_profiles WHERE "workspaceId" = $1;
  DELETE FROM projects WHERE "workspaceId" = $1;
  DELETE FROM workspace_members WHERE "workspaceId" = $1;
  DELETE FROM workspaces WHERE id = $1;
COMMIT;
```
