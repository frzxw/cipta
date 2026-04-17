---
name: Solve GitHub Issue
description: >
  Read a GitHub issue → plan → implement → test → PR. Triggers: "solve issue #X",
  "pick up this issue", "implement this ticket", "fix this bug".
---

# Solve GitHub Issue

## Context loading (scoped — load only what the issue references)

```bash
# 1. Read issue (fields only — no extra comments)
gh issue view <N> --json title,body,labels --jq '{title,labels:[.labels[].name],body}' | head -60

# 2. Read TOC of relevant spec (choose ONE based on issue topic)
bash scripts/spec.sh <doc>              # prints headers only

# 3. Read specific section once you know which one
bash scripts/spec.sh <doc> "<section>" # ≤60 lines
```

| Issue topic | Doc |
|-------------|-----|
| F-001–F-009 | `PRD` |
| Source/ingest/download/transcribe | `specs/INGESTOR` |
| render/caption/FFmpeg | `specs/FACTORY` |
| variation/fingerprint | `specs/GUARDIAN` |
| account/cluster/publish | `specs/FLEET` |
| queue/BullMQ/job | `specs/WORKER` |
| JWT/login/auth/roles | `specs/AUTH` |
| REST/DTO/error codes | `API` |
| schema/model/field | `ERD` |
| UI/page/dashboard | `DESIGN` |

**Stop after reading the one relevant section. Do not load all docs.**

## Steps

### 1. Parse issue → extract: title, label, spec refs, AC checkboxes

### 2. Scoped spec read (1 section max per doc)

### 3. Plan (present to user, wait for approval)

```
## Plan #<N>: <title>
Changes: <file> — <reason> (one line each)
New files: <file> — <purpose>
Tests: <file> — <what>
AC: <AC-xxx.x>
```

### 4. Branch

```bash
bash scripts/branch.sh <N> <type>
# → prints: branch: <name>  |  keyword: Closes #N
```

> GitLens branch: if user already made one, check it out. Still require `Closes #N` in PR body.

### 5. Implement (follow `.agents/rules/` — do not re-read unless a specific rule is needed)

### 6. Test (unit + integration per `.agents/rules/testing-standards.md §coverage`)

### 7. Verify

```bash
bash scripts/verify.sh ci
# Output: ✅ per step or ❌ + last 20 lines. Fix errors, re-run.
```

### 8. PR → use `/Prepare Pull Request`

Commit footer + PR body **both** must contain: `Closes #<N>`

## Expected output

Branch pushed, tests pass, PR description contains `Closes #N`.
