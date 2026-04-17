---
name: Prepare Pull Request
description: >
  Format → verify → commit → push → PR description. Triggers: "prepare a PR",
  "create a pull request", "ready to merge", "finalize changes", "submit for review".
---

# Prepare Pull Request

## Required input

| Field | Values |
|-------|--------|
| type | `feat` `fix` `docs` `refactor` `test` `chore` `perf` |
| scope | `api` `web` `worker` `database` `shared` `ui` `docs` `infra` |
| issue# | e.g. `42` (required for auto-close) |
| spec ref | e.g. `F-001`, `AC-003.2` |

## Steps

### 1. Status check (read: last 20 lines only)

```bash
git status --short
```

Stage missing files or ask user which to include.

### 2. Format

```bash
pnpm format
```

### 3. Verify

```bash
bash scripts/verify.sh ci
# ✅ prisma:generate | ✅ lint | ✅ check-types | ✅ test
# On ❌ → fix error shown (last 20 lines), re-run — do NOT proceed
```

### 4. Commit (use `git-commit` skill)

Message template:
```
<type>(<scope>): <description>

<optional body>

Closes #<issue>
Refs: <spec>
```

```bash
git add -A
git commit -m "<message>"
```

### 5. Push

```bash
git push origin HEAD
```

### 6. PR description (output this block verbatim)

```markdown
## Summary
<1-2 sentences>

## Changes
- <bullet>

## Spec Reference
- [<spec>](docs/specs/<spec>.md) §<section>

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated (if applicable)
- [ ] All existing tests pass

## Closes
Closes #<issue>
```

> `Closes #N` in body = GitHub auto-close on merge. **Required.**

## Expected output

Committed, pushed, PR description ready with `Closes #N`.
