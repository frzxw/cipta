---
name: Implement PRD Feature
description: >
  Take a PRD feature ID (F-001 through F-009), read its spec, and implement the full
  feature end-to-end across API, Worker, and Web. Use when the user says "implement F-001",
  "build the ingestor feature", "start on feature X", or references a PRD feature by ID.
---

# Implement PRD Feature

End-to-end implementation of a PRD feature from spec to working code.

## Trigger

User references a PRD feature by ID (e.g., `F-001`, `F-004`) or by name.

## Required Input

- **Feature ID**: F-001 through F-009 (see `docs/PRD.md §4`)

## Steps

### 1. Read the PRD feature

Open `docs/PRD.md §4` and extract:
- Feature ID, name, priority, module
- All acceptance criteria (AC-xxx.x checkboxes)

### 2. Read the module spec

Map the feature to its detailed spec:

| Feature | Module | Spec |
|---------|--------|------|
| F-001 (Source Ingestion) | Ingestor | `docs/specs/INGESTOR.md` |
| F-002 (Transcription) | Ingestor | `docs/specs/INGESTOR.md §6` |
| F-003 (Viral Spike Detection) | Ingestor | `docs/specs/INGESTOR.md §5` |
| F-004 (Video Production) | Factory | `docs/specs/FACTORY.md` |
| F-005 (Variation Generation) | Guardian | `docs/specs/GUARDIAN.md` |
| F-006 (Account Management) | Fleet | `docs/specs/FLEET.md §2-3` |
| F-007 (Distribution) | Fleet | `docs/specs/FLEET.md §4-6` |
| F-008 (Dashboard) | Frontend | `docs/DESIGN.md` |
| F-009 (Auth) | Auth | `docs/specs/AUTH.md` |

Read the full spec and understand:
- Data models involved (cross-ref `docs/ERD.md`)
- API endpoints (cross-ref `docs/API.md`)
- Worker jobs and status transitions
- UI pages involved (cross-ref `docs/DESIGN.md`)

### 3. Check the roadmap

Open `docs/ROADMAP.md` to find which Phase and Milestone this feature belongs to.
Check prerequisites — are the dependent features already implemented?

```
Dependency chain:
F-009 (Auth) → F-001 (Ingest) → F-002 (Transcribe) → F-003 (Viral Spike)
  → F-004 (Video Prod) → F-005 (Variations) → F-006 (Accounts) → F-007 (Distribution)
F-008 (Dashboard) reads from all
```

### 4. Plan the implementation

Break the feature into atomic tasks:

```
## Implementation Plan: F-{id} — {name}

### Database
- [ ] Add/verify models in Prisma schema (if needed)
- [ ] Run migration

### Shared Package
- [ ] Add/verify job payload types
- [ ] Add/verify queue constants

### API Layer (apps/api)
- [ ] Module: {name}.module.ts
- [ ] Controller: {name}.controller.ts with endpoints
- [ ] Service: {name}.service.ts with business logic
- [ ] DTOs: create-{name}.dto.ts, update-{name}.dto.ts

### Worker Layer (apps/worker) — if applicable
- [ ] Processor: {name}.processor.ts
- [ ] Service(s): {name}.service.ts

### Frontend (apps/web) — if applicable
- [ ] Page: app/(dashboard)/{route}/page.tsx
- [ ] Loading: loading.tsx
- [ ] Error: error.tsx

### Tests
- [ ] Unit tests for each service
- [ ] Integration tests for each endpoint
- [ ] Trace to AC-{id}.x criteria
```

Present this plan to the user for approval.

### 5. Create branch

```
git checkout -b feat/f-{id}-{short-name} develop
```

### 6. Execute plan

Work through the plan step by step. Use the appropriate `/Scaffold` workflow for each component:
- `/Scaffold NestJS Feature Module` for the API module
- `/Scaffold Worker Processor` for background job processing
- `/Scaffold Dashboard Page` for the frontend
- `/Scaffold Shared Package Type` for shared types
- `/Database Migration` if schema changes are needed

### 7. Verify all acceptance criteria

Go through each AC-xxx.x checkbox and verify:
- Does the implementation satisfy it?
- Is there a test for it?

### 8. Final verification

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

### 9. Prepare PR

Use `/Prepare Pull Request` with:
- Type: `feat`
- Scope: the module name
- Reference: `Implements F-{id} (PRD.md)`
- List all AC-xxx.x covered

## Expected Output

Feature fully implemented across the required layers with tests tracing to acceptance criteria, built successfully, ready for code review.
