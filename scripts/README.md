# scripts/ — Centralized AI Agent Commands

**Rule: AI agents MUST use these scripts. Never construct equivalent ad-hoc chains.**

## verify.sh

```bash
bash scripts/verify.sh [step]
```

| Step                                                           | Runs                                      |
| -------------------------------------------------------------- | ----------------------------------------- |
| `all` _(default)_                                              | prisma → lint → types → test → build      |
| `ci`                                                           | prisma → lint → types → test _(no build)_ |
| `lint` `types` `test` `build` `format` `format:check` `prisma` | single step                               |

**Output contract:** `✅ <step>` on pass · `❌ <step> failed:` + last 20 lines on fail.
AI reads only the summary, not full tool output.

## branch.sh

```bash
bash scripts/branch.sh <issue-number> [type] [description]
```

**Output contract:** exactly 2 lines:

```text
branch: feat/issue-42-<slug>
keyword: Closes #42
```

Copy the keyword into both commit footer and PR body for GitHub auto-close.

## spec.sh

```bash
bash scripts/spec.sh <doc> [section]       # ≤60 lines
bash scripts/spec.sh PRD                  # TOC only (headers)
bash scripts/spec.sh specs/AUTH "AC-009"  # section match
bash scripts/spec.sh API "/sources"       # endpoint block
```

**Output contract:** ≤60 lines. Never read full spec files — use this instead.

## Prohibited patterns

```bash
# ❌ Never write these:
pnpm lint && pnpm check-types && pnpm test
pnpm --filter @cipta/database exec prisma generate   # → verify.sh prisma
git checkout -b feat/...                             # → branch.sh
cat docs/specs/AUTH.md                               # → spec.sh
```
