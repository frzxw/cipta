# Docs Agent Rules

These rules apply to all work under `docs/`.

## 1) Mission

- Keep docs as single source of truth for engineering and product intent.
- Optimize for accuracy, traceability, and maintainability.

## 2) Mandatory Inputs Before Editing

- Treat `.agents/` as agentic knowledge root for rules, skills, and workflows.
- Read `docs/README.md` first.
- Read document directly related to requested change.
- If change affects module behavior, read matching file in `docs/specs/*.md`.
- If change affects operations, read matching file in `docs/runbooks/*.md`.

## 2.1) Docs Context Pack (Required)

- Build Docs Context Pack before editing.
- Docs Context Pack MUST contain:
  - Change objective and audience.
  - Canonical source docs to trust.
  - Impacted sibling docs and backlinks.
  - Any code/schema/API artifacts used as evidence.
- Do not edit until pack is complete, unless user explicitly asks for fast draft.

## 2.2) Source Priority and Conflict Resolution

- Resolve source conflicts in this order:
  1. Current user request.
  2. `.agents/rules/*.md` (most specific first).
  3. `docs/specs/*.md` for module behavior.
  4. Core docs (`API.md`, `ERD.md`, `ARCHITECTURE.md`, `CONFIG.md`, `TESTING.md`).
  5. Existing code as implementation evidence.
- If code and docs disagree, mark mismatch explicitly and propose corrective direction.
- Never silently overwrite authoritative intent with inferred behavior.

## 3) Documentation Integrity Rules

- Do not add undocumented assumptions as facts.
- If behavior is unknown, mark as open question or TODO with clear owner/context.
- Keep terminology aligned with project vocabulary from `.agents/rules/core-conventions.md`.
- Keep architecture claims aligned with `docs/ARCHITECTURE.md`.
- Keep API claims aligned with `docs/API.md`.
- Keep schema claims aligned with `docs/ERD.md` and Prisma schema.

## 4) Editing Rules

- Prefer surgical edits over broad rewrites.
- Preserve headings and document structure unless user asks to restructure.
- Update cross-references when moving or renaming sections.
- Use links to canonical docs instead of duplicating large content.
- Keep examples consistent with actual workspace commands (pnpm + turbo).

## 4.1) Documentation Engineering Protocol

- Every normative statement MUST map to at least one source reference.
- For behavior changes, include clear effect, scope, and constraints.
- Keep planned vs implemented state explicit; do not blur roadmap and current state.
- Keep terminology consistent with project vocabulary (Source, Chunk, Asset, Variation, Cluster, etc.).
- Prefer additive clarification over destructive rewrites unless structure is broken.

## 4.2) Cross-Doc Synchronization Rules

- After editing one docs file, check whether related docs need updates.
- Required sync checks:
  - API changes -> `docs/API.md`, related module spec.
  - Schema changes -> `docs/ERD.md`, `docs/CONFIG.md`, module specs.
  - Architecture changes -> `docs/ARCHITECTURE.md`, impacted specs, runbooks.
  - Operational changes -> relevant runbook files.
- If sync updates are deferred, list exact files and reason in output.

## 5) Consistency Checks (Required)

- Verify internal links still resolve.
- Verify command snippets match real scripts in workspace.
- Verify app/package names match current repository structure.
- Flag planned-vs-implemented gaps explicitly when relevant.

## 5.1) Verification and Quality Gate

- Re-read modified sections for contradiction against source docs.
- Ensure no stale defaults (ports, commands, package names, app status).
- Ensure examples are runnable in this monorepo context.
- Ensure no duplicated large content when canonical link exists.

## 6) Scope Knowledge (Current)

- Active apps: `apps/api`, `apps/web`, `apps/docs`.
- Planned app: `apps/worker`.
- Shared packages in use: `packages/database`, `packages/shared`, `packages/ui`, `packages/eslint-config`, `packages/typescript-config`.
- Generated Prisma client under `packages/database/src/generated/**` must not be manually edited.

## 7) Output Expectations

- For doc tasks, summarize:
  - files changed,
  - key decisions,
  - any unresolved questions,
  - suggested follow-up docs to update.

## 8) Final Output Contract for Docs Tasks

- Always include:
  - what changed,
  - why change was necessary,
  - which sources were used,
  - what remains uncertain.
- Never claim docs are fully aligned unless cross-doc sync check is complete.
