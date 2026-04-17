# Centralized Scripts (MANDATORY)

> Load only what this file says. Do NOT preemptively read other docs.

## Commands — never invent these, always call the script

| Need | Command |
|------|---------|
| Verify (fast, no build) | `bash scripts/verify.sh ci` |
| Verify (full, before PR) | `bash scripts/verify.sh all` |
| Single step | `bash scripts/verify.sh lint\|types\|test\|build\|format\|prisma` |
| Create issue branch | `bash scripts/branch.sh <N> [type] [desc]` |
| Read spec section | `bash scripts/spec.sh <doc> ["section"]` |

## Output contract

- `verify.sh` → prints `✅ <step>` per task, `❌ <step> failed:` + last 20 lines on error
- `branch.sh` → prints exactly 2 lines: `branch: <name>` and `keyword: Closes #N`
- `spec.sh` → prints ≤60 lines of the matched section

## GitHub auto-close (MANDATORY)

PR body **must** contain `Closes #N`. Branch name alone is NOT enough.
`branch.sh` prints the keyword — copy it into the PR body and commit footer.

## Prohibited patterns

```bash
# ❌ Never build these manually:
pnpm lint && pnpm check-types && pnpm test && pnpm build
pnpm --filter @cipta/database exec prisma generate  # (included in verify.sh)
git checkout -b feat/... develop                    # use branch.sh
cat docs/specs/AUTH.md                              # use spec.sh
```
