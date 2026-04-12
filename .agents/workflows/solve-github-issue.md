---
name: Solve GitHub Issue
description: >
  Read a GitHub issue, analyze it against the PRD and specs, plan the implementation,
  write the code, run tests, and prepare a PR. Use when the user says "solve issue #X",
  "pick up this issue", "implement this ticket", "fix this bug from GitHub", or
  pastes a GitHub issue URL.
---

# Solve GitHub Issue

End-to-end workflow: read a GitHub issue → plan → implement → test → prepare PR.

## Trigger

User provides a GitHub issue number, URL, or pastes issue content.

## Required Input

- **Issue number or URL** (e.g., `#42` or `https://github.com/org/cipta/issues/42`)
- OR **issue content** pasted directly

## Steps

### 1. Read and understand the issue

Parse the issue for:
- **Title** — what is being requested or reported
- **Labels** — `bug`, `feat`, `enhancement`, `refactor`, etc.
- **Spec references** — any mentions of `F-001`, `AC-003.2`, spec file names
- **Acceptance criteria** — any checkboxes or expected behavior

### 2. Map to project documentation

Cross-reference the issue with the docs:

| Issue mentions... | Read this doc |
|-------------------|---------------|
| A feature ID (F-001 through F-009) | `docs/PRD.md §4` for acceptance criteria |
| Ingestor, Source, download, transcribe | `docs/specs/INGESTOR.md` |
| Factory, render, caption, FFmpeg | `docs/specs/FACTORY.md` |
| Guardian, variation, fingerprint, anti-shadowban | `docs/specs/GUARDIAN.md` |
| Fleet, account, cluster, publish, distribute | `docs/specs/FLEET.md` |
| Worker, queue, BullMQ, job | `docs/specs/WORKER.md` |
| Auth, JWT, login, roles, workspace | `docs/specs/AUTH.md` |
| API endpoint, REST, DTO, error code | `docs/API.md` |
| Database, schema, model, field | `docs/ERD.md` |
| UI, page, dashboard, component | `docs/DESIGN.md` |
| Security, encryption, credentials | `docs/SECURITY.md` |

### 3. Create a plan

Before writing any code, produce a short implementation plan:

```
## Plan for #{issue_number}: {title}

### Changes needed:
1. {file_path} — {what to change and why}
2. {file_path} — ...

### New files:
- {file_path} — {purpose}

### Tests:
- {test_file} — {what to test}

### Spec reference:
- {spec_file} §{section}
- Acceptance criteria: {AC-xxx.x}
```

Present this plan to the user and wait for approval before proceeding.

### 4. Create a feature branch

```
git checkout -b {type}/issue-{number}-{short-description} develop
```

Where `{type}` is `feat`, `fix`, `refactor`, `docs`, etc. based on the issue label.

### 5. Implement the changes

Write the code following all project rules (loaded from `.agents/rules/`):
- Workspace scoping on all DB queries
- Proper DTOs and validation
- Zero NestJS imports in Worker code
- Proper error handling and status transitions
- Follow file naming conventions

### 6. Write tests

- **Unit tests** for every new service method (mock dependencies)
- **Integration tests** if the issue involves API endpoints (Supertest)
- Trace to acceptance criteria: `it('[AC-xxx.x] should ...')`

### 7. Verify

Run the verification steps:

// turbo
```
pnpm lint
```

// turbo
```
pnpm check-types
```

// turbo
```
pnpm test
```

// turbo
```
pnpm build
```

Fix any errors before proceeding.

### 8. Prepare the PR

Use the `/Prepare Pull Request` workflow to:
- Format code
- Generate conventional commit message referencing the issue:
  ```
  {type}({scope}): {description}

  Closes #{issue_number}
  Refs: {AC-xxx.x}
  ```
- Generate PR description linking back to the issue

## Expected Output

A feature branch with implementation, tests, and a ready-to-submit PR that closes the GitHub issue.
