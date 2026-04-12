# Cipta — Operational Runbooks

> Playbooks for deploying, scaling, debugging, and recovering the Cipta platform.  
> Every on-call engineer and AI agent must read the relevant runbook before acting on production.

---

## Runbook Index

| Runbook                                        | When To Use                                                            |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| [DEPLOYMENT.md](./DEPLOYMENT.md)               | Deploying to staging/production, rollback procedures                   |
| [DATABASE.md](./DATABASE.md)                   | Migrations, backups, restores, connection issues, Prisma operations    |
| [WORKER_OPS.md](./WORKER_OPS.md)               | Scaling workers, stuck/stalled jobs, queue management, FFmpeg failures |
| [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) | Outage triage, severity classification, communication templates        |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)     | Common errors, diagnostic commands, platform-specific debugging        |

---

## Severity Levels

| Level     | Definition                                | Response Time     | Example                            |
| --------- | ----------------------------------------- | ----------------- | ---------------------------------- |
| **SEV-1** | Platform down, all users affected         | < 15 min          | API unreachable, DB down           |
| **SEV-2** | Major feature broken, many users affected | < 1 hour          | Worker queue backed up, no renders |
| **SEV-3** | Minor feature broken, workaround exists   | < 4 hours         | One platform publisher failing     |
| **SEV-4** | Cosmetic / non-urgent                     | Next business day | Dashboard UI glitch                |

---

## Quick Reference: Health Check Commands

```bash
# API health
curl -f http://localhost:3001/health

# Redis connectivity
redis-cli -h $REDIS_HOST ping

# PostgreSQL connectivity
pg_isready -h $DB_HOST -p 5432

# Worker status (via BullMQ)
curl http://localhost:3001/admin/queues

# FFmpeg availability
ffmpeg -version | head -1

# yt-dlp availability
yt-dlp --version

# Disk space (critical for worker)
df -h /tmp/cipta
```
