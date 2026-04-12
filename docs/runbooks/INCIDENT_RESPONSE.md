# Runbook: Incident Response

> **Audience:** All Engineers (on-call rotation)  
> **Last Updated:** 2026-04-11

---

## 1. Incident Lifecycle

```
DETECT ──► TRIAGE ──► MITIGATE ──► RESOLVE ──► POSTMORTEM
  │          │           │            │            │
  │ Alerts,  │ Classify  │ Stop the   │ Root cause │ Write-up,
  │ user     │ severity, │ bleeding,  │ fix, verify│ action
  │ reports  │ assign IC │ communicate│ deploy     │ items
```

---

## 2. Triage Decision Tree

```
System is impacted?
│
├─ API unreachable (502/503)?
│  ├── Check: API container running? → Restart container
│  ├── Check: PostgreSQL reachable? → See DATABASE.md
│  ├── Check: Redis reachable? → Restart Redis
│  └── Check: Load balancer healthy? → Check LB config
│  → Severity: SEV-1
│
├─ Jobs not processing (queue growing)?
│  ├── Check: Worker containers running? → Restart workers
│  ├── Check: Redis reachable? → Fix Redis connection
│  ├── Check: Specific queue? → See queue-specific section
│  └── Check: All queues? → Redis or worker issue
│  → Severity: SEV-2
│
├─ Publishing failures (fleet)?
│  ├── Check: Platform API status page
│  ├── Check: Account credentials expired? → Refresh tokens
│  ├── Check: Rate limited? → Wait / reduce posting frequency
│  └── Check: Single or all accounts? → Platform ban vs API issue
│  → Severity: SEV-3
│
├─ Render quality issues?
│  ├── Check: FFmpeg version? → Update if needed
│  ├── Check: Render profile config? → Compare with known good
│  └── Check: GPU driver? → Fallback to CPU
│  → Severity: SEV-3
│
└─ Dashboard slow / unresponsive?
   ├── Check: API response times? → Check DB queries
   ├── Check: WebSocket connected? → Check WS gateway
   └── Check: Frontend build valid? → Redeploy frontend
   → Severity: SEV-3/4
```

---

## 3. Communication Templates

### 3.1 Internal Alert (Slack/Discord)

```
🔴 INCIDENT: [SEV-X] [Brief Description]
IC: @person
Status: Investigating
Impact: [What users are experiencing]
Start time: HH:MM UTC
Updates will follow every 15 minutes.
```

### 3.2 Status Update

```
🟡 UPDATE: [SEV-X] [Brief Description]
Status: Identified / Mitigating
Root cause: [What we found]
ETA to resolution: [estimate]
Workaround: [if any]
```

### 3.3 Resolution

```
🟢 RESOLVED: [SEV-X] [Brief Description]
Resolved at: HH:MM UTC
Duration: X minutes
Root cause: [brief]
Action items: [link to postmortem]
```

---

## 4. Common Incident Playbooks

### 4.1 API Down (SEV-1)

```bash
# 1. Verify API is actually down
curl -f https://api.cipta.app/health || echo "CONFIRMED DOWN"

# 2. Check container status
docker compose ps api

# 3. Check logs for crash reason
docker compose logs api --tail=100

# 4. Most common fixes:
#    a. Container crashed → restart
docker compose restart api

#    b. Database connection refused → check PG
pg_isready -h $DB_HOST -p 5432

#    c. Port conflict → check if port 3001 is in use
ss -tlnp | grep 3001

#    d. OOM kill → increase memory limit
docker compose up -d api --memory=2g

# 5. Verify recovery
curl -f https://api.cipta.app/health && echo "RECOVERED"
```

### 4.2 Queue Backlog (SEV-2)

```bash
# 1. Identify which queue is backing up
redis-cli -h $REDIS_HOST LLEN bull:cipta:ingestor:wait
redis-cli -h $REDIS_HOST LLEN bull:cipta:factory:wait
redis-cli -h $REDIS_HOST LLEN bull:cipta:guardian:wait
redis-cli -h $REDIS_HOST LLEN bull:cipta:fleet:wait

# 2. Check if workers are running
docker compose ps worker

# 3. Check worker logs for errors
docker compose logs worker --tail=200 | grep -i "error\|fatal\|fail"

# 4. Immediate mitigation: scale workers
docker compose up -d --scale worker=4

# 5. If caused by stuck jobs, drain and retry
# See WORKER_OPS.md → Section 3 (Stuck Jobs)
```

### 4.3 Mass Publishing Failure (SEV-2)

```bash
# 1. Check fleet queue failed jobs
redis-cli -h $REDIS_HOST ZCARD bull:cipta:fleet:failed

# 2. Get error messages from recent failures
# Via BullMQ API or Bull Board

# 3. Check platform API status
#    TikTok:    https://status.tiktok.com
#    Instagram: https://metastatus.com
#    YouTube:   https://status.cloud.google.com

# 4. If platform API is down → pause fleet queue, wait
# Via BullMQ:
queue.pause();

# 5. When platform recovers → resume and retry
queue.resume();
# Retry failed jobs (see WORKER_OPS.md)
```

### 4.4 Database Disk Full (SEV-1)

```bash
# 1. Verify
psql -h $DB_HOST -U cipta -c "SELECT pg_size_pretty(pg_database_size('cipta'));"

# 2. Immediate: clean job history
psql -h $DB_HOST -U cipta -d cipta -c "
  DELETE FROM jobs WHERE status = 'COMPLETED' AND \"completedAt\" < now() - interval '7 days';
"

# 3. VACUUM to reclaim space
psql -h $DB_HOST -U cipta -d cipta -c "VACUUM FULL;"

# 4. Long-term: see DATABASE.md → Section 5 (Data Management)
```

---

## 5. Postmortem Template

After every SEV-1 or SEV-2 incident, write a postmortem within 48 hours:

```markdown
# Postmortem: [Title]

**Date:** YYYY-MM-DD
**Duration:** HH:MM - HH:MM UTC (X minutes)
**Severity:** SEV-X
**Incident Commander:** @person
**Author:** @person

## Summary

One-paragraph description of what happened and the user impact.

## Timeline (UTC)

- HH:MM — First alert triggered / user report received
- HH:MM — IC assigned, investigation started
- HH:MM — Root cause identified
- HH:MM — Mitigation applied
- HH:MM — Full resolution confirmed

## Root Cause

Technical explanation of what failed and why.

## Impact

- Users affected: N
- Jobs delayed/failed: N
- Revenue impact: $X (if applicable)

## What Went Well

- [Things that helped detect or resolve the incident faster]

## What Went Poorly

- [Things that slowed us down or made the issue worse]

## Action Items

| Action       | Owner   | Priority | Due Date   |
| ------------ | ------- | -------- | ---------- |
| [Fix]        | @person | P0       | YYYY-MM-DD |
| [Prevention] | @person | P1       | YYYY-MM-DD |
| [Monitoring] | @person | P2       | YYYY-MM-DD |

## Lessons Learned

Key takeaways for the team.
```
