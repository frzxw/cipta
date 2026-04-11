# Cipta Documentation — Single Source of Truth (SSoT)

> **Version:** 0.1.0-alpha  
> **Last Updated:** 2026-04-11  
> **Status:** 🟡 Specification Phase (Pre-Implementation)

---

## What is Cipta?

Cipta is an AI-powered platform for the massive, automated production and distribution of social media video content. It solves the biggest bottleneck in the modern creator economy: producing high-volume, high-quality, and algorithm-safe (anti-shadowban) content at scale.

---

## Documentation Map

This `/docs` directory is the **Single Source of Truth** for the Cipta project. All code should be written to conform to these specifications. Human developers and AI coding agents must read the relevant spec before writing or modifying any code.

### Core Documents

| Document | Purpose | Audience |
|----------|---------|----------|
| [PRD.md](./PRD.md) | Product Requirements Document — features, user stories, acceptance criteria | PM, Dev, AI Agents |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, module boundaries, data flow, infrastructure | Senior Dev, AI Agents |
| [ERD.md](./ERD.md) | Entity-Relationship Diagram and full database schema specification | Backend Dev, AI Agents |
| [API.md](./API.md) | REST API contract — every endpoint, request/response schema, auth | Frontend Dev, Backend Dev, AI Agents |
| [DESIGN.md](./DESIGN.md) | UI/UX design system — tokens, components, page layouts | Frontend Dev, AI Agents |

### Detailed Specifications

| Document | Purpose |
|----------|---------|
| [specs/INGESTOR.md](./specs/INGESTOR.md) | The Ingestor module — scraping, transcription, LLM analysis |
| [specs/FACTORY.md](./specs/FACTORY.md) | The Factory module — video production pipeline, FFmpeg commands |
| [specs/GUARDIAN.md](./specs/GUARDIAN.md) | The Guardian module — anti-shadowban, fingerprint randomization |
| [specs/FLEET.md](./specs/FLEET.md) | The Fleet module — distribution, scheduling, account clusters |
| [specs/WORKER.md](./specs/WORKER.md) | Worker architecture — BullMQ jobs, decoupling strategy, queue design |
| [specs/AUTH.md](./specs/AUTH.md) | Authentication & authorization — JWT, RBAC, session management |

### Operational Runbooks (`runbooks/`)

| Document | Purpose |
|----------|---------|
| [runbooks/README.md](./runbooks/README.md) | Runbook index, severity levels, quick health checks |
| [runbooks/DEPLOYMENT.md](./runbooks/DEPLOYMENT.md) | Dockerfiles, CI/CD pipeline, migration ordering, rollback |
| [runbooks/DATABASE.md](./runbooks/DATABASE.md) | Connection pooling, backups, restores, performance monitoring |
| [runbooks/WORKER_OPS.md](./runbooks/WORKER_OPS.md) | Queue inspection, stuck jobs, scaling, FFmpeg debugging |
| [runbooks/INCIDENT_RESPONSE.md](./runbooks/INCIDENT_RESPONSE.md) | Triage, severity classification, postmortem template |
| [runbooks/TROUBLESHOOTING.md](./runbooks/TROUBLESHOOTING.md) | Common errors and fixes for every component |

### Engineering Standards

| Document | Purpose |
|----------|---------|
| [TESTING.md](./TESTING.md) | Testing strategy — pyramid, frameworks, coverage targets, CI pipeline, mocking patterns |
| [SECURITY.md](./SECURITY.md) | Threat model, encryption, input validation, multi-tenancy isolation |
| [OBSERVABILITY.md](./OBSERVABILITY.md) | Structured logging, Prometheus metrics, alerting rules, Sentry, dashboards |
| [CONFIG.md](./CONFIG.md) | Every environment variable — master list, example `.env` files, startup validation |
| [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) | Docker, networking, cloud services, storage architecture, disaster recovery |

### Planning & Process

| Document | Purpose |
|----------|---------|
| [ROADMAP.md](./ROADMAP.md) | Phased implementation plan — 4 phases, task-to-spec mapping, Definition of Done |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Development workflow, branching strategy, commit conventions |
| [GLOSSARY.md](./GLOSSARY.md) | Domain-specific terminology dictionary |

---

## Spec-Driven Development (SDD) Rules

1. **Read Before You Code.** Always read the relevant spec document before touching any module.
2. **Spec Is Law.** If the code disagrees with the spec, the spec wins — unless a formal spec amendment is filed.
3. **Test Against the Spec.** All test cases must trace back to acceptance criteria defined in these documents.
4. **AI Agents Must Comply.** Any AI coding agent operating in this repository must parse and follow these specs as constraints.

---

## Monorepo Structure Reference

```
cipta/
├── apps/
│   ├── api/          # NestJS — Core Orchestrator
│   ├── web/          # Next.js — Dashboard UI ("Control Tower")
│   └── worker/       # Node.js — Processing Worker (TO BE CREATED)
├── packages/
│   ├── database/     # Prisma schema + client (TO BE CREATED)
│   ├── shared/       # Shared types, constants, utils (TO BE CREATED)
│   ├── ui/           # React component library (ShadcnUI)
│   ├── eslint-config/
│   └── typescript-config/
├── docs/             # 📍 You are here
│   ├── specs/        # Module-level specifications (6 files)
│   ├── runbooks/     # Operational playbooks (5 files)
│   └── *.md          # Core + engineering docs (14 files)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```
