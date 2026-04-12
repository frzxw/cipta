---
name: Prepare Pull Request
description: >
  Prepare a standardized pull request: lint, type-check, test, format, then generate
  commit message and PR description. Use when the user says "prepare a PR",
  "create a pull request", "ready to merge", "finalize changes", or "submit for review".
---

# Prepare Pull Request

Lints, type-checks, tests, and formats the codebase, then generates a conventional commit and PR description.

## Trigger

User has finished a feature/fix and wants to prepare a PR against `develop`.

## Required Input

- **PR type**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`
- **Scope**: `api`, `web`, `worker`, `database`, `shared`, `ui`, `docs`, `infra`
- **Related spec/feature**: e.g., `F-001`, `AC-003.2`, or free text description

## Steps

### 1. Check for uncommitted changes

```
git status
```

If there are unstaged files, stage them or ask the user which to include.

### 2. Lint all packages

// turbo
```
pnpm lint
```

If there are lint errors, fix them automatically where possible:

```
pnpm lint -- --fix
```

Report any remaining errors that need manual attention.

### 3. Type-check all packages

// turbo
```
pnpm check-types
```

Report and fix any TypeScript errors.

### 4. Run tests (affected packages only)

// turbo
```
pnpm test
```

If any tests fail, report them and stop. Do not proceed with a failing test suite.

### 5. Format code

// turbo
```
pnpm format
```

### 6. Generate commit message

Create a conventional commit message:

```
{type}({scope}): {concise description}

{optional body explaining what and why}

Refs: {spec reference, e.g., F-001, AC-003.2}
```

Example:
```
feat(api): add ingestor module with source CRUD endpoints

Implements the Ingestor controller, service, and DTOs for managing
Sources. Dispatches download jobs to the worker via BullMQ.

Refs: F-001, INGESTOR.md §1
```

### 7. Stage and commit

```
git add -A
git commit -m "{generated message}"
```

### 8. Push branch

```
git push origin HEAD
```

### 9. Generate PR description

Output a PR description in this format:

```markdown
## Summary
{1-2 sentence summary of what this PR does}

## Changes
- {bullet point list of key changes}

## Spec Reference
- [{spec}](docs/specs/{spec}.md) §{section}

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated (if applicable)
- [ ] All existing tests pass
- [ ] Coverage thresholds met

## Screenshots
{if UI changes, note that screenshots should be added}
```

## Expected Output

Code is linted, type-checked, tested, formatted, committed with a conventional message, pushed, and a PR description template is generated for the user to paste into the PR.
