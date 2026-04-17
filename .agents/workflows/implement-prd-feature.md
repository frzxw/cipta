---
name: Implement PRD Feature
description: >
  Implement a PRD feature end-to-end. Triggers: "implement F-001", "build the ingestor
  feature", "start on feature X", or a PRD feature ID.
---

# Implement PRD Feature

## Context loading (scoped)

```bash
# 1. Read only the feature row + its ACs from PRD
bash scripts/spec.sh PRD "F-<id>"

# 2. Read spec TOC first, then the one relevant section
bash scripts/spec.sh <spec>             # headers only
bash scripts/spec.sh <spec> "<section>"  # ≤60 lines
```

| Feature | Spec |
|---------|------|
| F-001/F-002/F-003 | `specs/INGESTOR` |
| F-004 | `specs/FACTORY` |
| F-005 | `specs/GUARDIAN` |
| F-006/F-007 | `specs/FLEET` |
| F-008 | `DESIGN` |
| F-009 | `specs/AUTH` |

Cross-refs: `ERD` for models, `API` for endpoints — read only matching sections.

## Dependency chain

`F-009 → F-001 → F-002 → F-003 → F-004 → F-005 → F-006 → F-007` (F-008 reads all)

Check prerequisites exist before starting.

## Steps

### 1. Scoped spec read → extract AC list

### 2. Plan (present, wait for approval)

```
## Plan: F-<id> — <name>
DB: <model changes>
Shared: <types/constants>
API: <module/controller/service/DTOs>
Worker: <processor/service> (if applicable)
Web: <page/component> (if applicable)
Tests: <files> → <AC-ids covered>
```

### 3. Branch

```bash
bash scripts/branch.sh <issue_number>
# → branch: <N>-f-<id>-<name>  (title fetched from GitHub issue)
```

### 4. Execute (use Scaffold workflows per layer)

- API module → `/Scaffold NestJS Feature Module`
- Worker → `/Scaffold Worker Processor`
- Frontend → `/Scaffold Dashboard Page`
- Shared types → `/Scaffold Shared Package Type`
- Schema → `/Database Migration`

### 5. Verify each AC checkbox

### 6. Verify

```bash
bash scripts/verify.sh all
# ✅ prisma → lint → types → test → build
```

### 7. PR → use `/Prepare Pull Request`

Include all covered `AC-<id>.x` in PR body.

## Expected output

All ACs satisfied with tests, build passes, PR ready.
