---
name: Prepare Pull Request
description: >
  Format -> verify -> commit -> push -> PR. Triggers: "prepare a PR",
  "create a pull request", "ready to merge", "finalize changes", "submit for review".
---

# Prepare Pull Request

## Required input

| Field    | Values                                                      |
| -------- | ----------------------------------------------------------- |
| type     | `feat` `fix` `docs` `refactor` `test` `chore` `perf`       |
| scope    | `api` `web` `worker` `database` `shared` `ui` `docs` `infra` |
| issue#   | e.g. `42` (required for auto-close)                         |
| spec ref | e.g. `F-001`, `AC-003.2`                                    |

## Steps

### 1. Status check (read: last 20 lines only)

```powershell
git status --short
```

Stage missing files or ask user which to include.

### 2. Format

```powershell
pnpm format
```

### 3. Verify

```powershell
pnpm turbo lint check-types
# All tasks green. On failure -> fix, re-run. Do NOT proceed with errors.
```

### 4. Commit (use `git-commit` skill)

Message template:

```
<type>(<scope>): <description>

<optional body>

Closes #<issue>
Refs: <spec>
```

```powershell
git add -A
git commit -m "<message>"
```

### 5. Push

```powershell
git push origin HEAD
```

### 6. Create PR

**CRITICAL - PowerShell encoding rule**: Never pass multiline text via `--body "..."` inline.
Backslashes, Unicode, and newlines get corrupted by PowerShell string interpolation.
Always write the body to a file first, then use `--body-file`.

```powershell
# Step 1: write body to temp file (avoids PowerShell encoding corruption)
$body = @"
## Summary
<1-2 sentences>

## Changes
- <bullet per changed file>

## Spec Reference
- [<spec>](docs/specs/<spec>.md) section <section>

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated (if applicable)
- [ ] All existing tests pass

## Closes
Closes #<issue>
"@
$body | Out-File -FilePath pr-body.tmp -Encoding utf8

# Step 2: create PR targeting develop
gh pr create `
  --base develop `
  --title "<type>(<scope>): <description>" `
  --body-file pr-body.tmp

# Step 3: clean up
Remove-Item pr-body.tmp
```

> **Always `--base develop`**. Never omit - `gh pr create` defaults to the repo default branch (main) otherwise.

> `Closes #N` in body = GitHub auto-close on merge. **Required.**

## Expected output

Committed, pushed, PR open against `develop` with `Closes #N`.
