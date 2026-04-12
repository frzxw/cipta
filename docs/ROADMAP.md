# Cipta — Implementation Roadmap

> **Version:** 0.1.0-alpha  
> **Methodology:** Spec-Driven Development (SDD) + Test-Driven Development (TDD)  
> **Last Updated:** 2026-04-11

---

## 1. Milestone Overview

```
Phase 0          Phase 1           Phase 2          Phase 3          Phase 4
Foundation       Ingest Pipeline   Production       Distribution     Polish & Scale
(Week 1-2)       (Week 3-4)        (Week 5-7)       (Week 8-9)       (Week 10-12)
───────────      ─────────────     ──────────       ────────────     ──────────────
Monorepo         yt-dlp download   FFmpeg render    Account CRUD     Analytics dash
Prisma schema    Whisper API       Kinetic captions Cluster mgmt     AI Trend hints
Auth module      LLM analysis      Auto-framing     Scheduler        Perf optimiz.
Docker setup     Source CRUD UI    Guardian vars    Publishing        Error recovery
Basic dashboard  Transcript UI     Asset gallery    Dist. calendar    Load testing
```

---

## 2. Phase 0: Foundation (Weeks 1–2)

> **Goal:** Bootable monorepo with auth, database, and empty dashboard.

### Milestone 0.1: Infrastructure

| Task                                               | Package             | Spec Reference                                | Priority |
| -------------------------------------------------- | ------------------- | --------------------------------------------- | -------- |
| Configure `packages/database` with Prisma schema   | `packages/database` | [ERD.md](./ERD.md)                            | P0       |
| Run initial migration                              | `packages/database` | [ERD.md](./ERD.md)                            | P0       |
| Create `packages/shared` with queue names, types   | `packages/shared`   | [ARCHITECTURE.md](./ARCHITECTURE.md) §4.3     | P0       |
| Set up Docker Compose (PostgreSQL + Redis)         | root                | [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) §3.1 | P0       |
| Configure Turborepo tasks (build, dev, test, lint) | root                | [ARCHITECTURE.md](./ARCHITECTURE.md)          | P0       |
| Create `.env.example` files                        | all apps            | [CONFIG.md](./CONFIG.md) §2                   | P0       |

### Milestone 0.2: Authentication

| Task                                                     | Package    | Spec Reference                    | Priority |
| -------------------------------------------------------- | ---------- | --------------------------------- | -------- |
| Implement auth module (register, login, refresh, logout) | `apps/api` | [AUTH.md](./specs/AUTH.md)        | P0       |
| JWT strategy + guards                                    | `apps/api` | [AUTH.md](./specs/AUTH.md) §3     | P0       |
| RBAC roles guard                                         | `apps/api` | [AUTH.md](./specs/AUTH.md) §5     | P0       |
| Workspace scoping decorator                              | `apps/api` | [AUTH.md](./specs/AUTH.md) §6     | P0       |
| Validation pipe (global)                                 | `apps/api` | [SECURITY.md](./SECURITY.md) §3.1 | P0       |
| Rate limiting                                            | `apps/api` | [AUTH.md](./specs/AUTH.md) §7     | P1       |
| Auth integration tests                                   | `apps/api` | [TESTING.md](./TESTING.md) §5     | P0       |

### Milestone 0.3: Dashboard Shell

| Task                               | Package    | Spec Reference                | Priority |
| ---------------------------------- | ---------- | ----------------------------- | -------- |
| Set up Tailwind CSS + ShadcnUI     | `apps/web` | [DESIGN.md](./DESIGN.md) §2   | P0       |
| Dashboard layout (sidebar, topbar) | `apps/web` | [DESIGN.md](./DESIGN.md) §4.3 | P0       |
| Login / Register pages             | `apps/web` | [DESIGN.md](./DESIGN.md) §6   | P0       |
| API client setup (React Query)     | `apps/web` | [API.md](./API.md) §1         | P0       |
| Auth context + route protection    | `apps/web` | [AUTH.md](./specs/AUTH.md)    | P0       |

**Exit Criteria:** User can register, log in, and see an empty dashboard.

---

## 3. Phase 1: Ingest Pipeline (Weeks 3–4)

> **Goal:** User can paste a URL and see a transcribed, analyzed source with viral spikes.

### Milestone 1.1: Worker Scaffold

| Task                                    | Package       | Spec Reference                            | Priority |
| --------------------------------------- | ------------- | ----------------------------------------- | -------- |
| Create `apps/worker` package            | `apps/worker` | [WORKER.md](./specs/WORKER.md)            | P0       |
| Worker entrypoint with BullMQ consumers | `apps/worker` | [WORKER.md](./specs/WORKER.md) §3         | P0       |
| Storage service (S3/local adapter)      | `apps/worker` | [WORKER.md](./specs/WORKER.md) §9         | P0       |
| Pino structured logging                 | `apps/worker` | [OBSERVABILITY.md](./OBSERVABILITY.md) §2 | P0       |
| Graceful shutdown handling              | `apps/worker` | [WORKER.md](./specs/WORKER.md) §12        | P1       |

### Milestone 1.2: Ingestor Module

| Task                                           | Package       | Spec Reference                        | Priority |
| ---------------------------------------------- | ------------- | ------------------------------------- | -------- |
| Ingestor controller + service (API)            | `apps/api`    | [INGESTOR.md](./specs/INGESTOR.md) §1 | P0       |
| Source CRUD endpoints                          | `apps/api`    | [API.md](./API.md) §3                 | P0       |
| DownloaderService (yt-dlp wrapper)             | `apps/worker` | [INGESTOR.md](./specs/INGESTOR.md) §4 | P0       |
| TranscriberService (Whisper API)               | `apps/worker` | [INGESTOR.md](./specs/INGESTOR.md) §6 | P0       |
| AnalyzerService (LLM viral detection)          | `apps/worker` | [INGESTOR.md](./specs/INGESTOR.md) §5 | P0       |
| Job chaining (download → transcribe → analyze) | `apps/worker` | [WORKER.md](./specs/WORKER.md) §8     | P0       |
| Job progress WebSocket/SSE                     | `apps/api`    | [API.md](./API.md) §12                | P1       |

### Milestone 1.3: Source UI

| Task                                   | Package    | Spec Reference                | Priority |
| -------------------------------------- | ---------- | ----------------------------- | -------- |
| Source input widget (URL paste)        | `apps/web` | [DESIGN.md](./DESIGN.md) §5.5 | P0       |
| Sources list page                      | `apps/web` | [DESIGN.md](./DESIGN.md) §6.2 | P0       |
| Source detail page (transcript viewer) | `apps/web` | [DESIGN.md](./DESIGN.md) §6.3 | P0       |
| Viral spike review/approval UI         | `apps/web` | [DESIGN.md](./DESIGN.md) §6.3 | P0       |
| Job progress indicator                 | `apps/web` | [DESIGN.md](./DESIGN.md) §5.3 | P1       |

**Exit Criteria:** Paste YouTube URL → download → transcribe → see ranked viral spikes.

---

## 4. Phase 2: Video Production (Weeks 5–7)

> **Goal:** Approved spikes become rendered, anti-shadowban-protected video assets.

### Milestone 2.1: Factory Module

| Task                               | Package       | Spec Reference                        | Priority |
| ---------------------------------- | ------------- | ------------------------------------- | -------- |
| Factory controller + service (API) | `apps/api`    | [API.md](./API.md) §5                 | P0       |
| Render profile CRUD                | `apps/api`    | [API.md](./API.md) §6                 | P0       |
| RendererService (FFmpeg pipeline)  | `apps/worker` | [FACTORY.md](./specs/FACTORY.md) §4   | P0       |
| CaptionService (ASS generation)    | `apps/worker` | [FACTORY.md](./specs/FACTORY.md) §6   | P0       |
| FramingService (16:9 → 9:16 crop)  | `apps/worker` | [FACTORY.md](./specs/FACTORY.md) §5   | P0       |
| Hardware acceleration detection    | `apps/worker` | [FACTORY.md](./specs/FACTORY.md) §4.2 | P1       |
| FFmpeg progress tracking           | `apps/worker` | [FACTORY.md](./specs/FACTORY.md) §8   | P1       |

### Milestone 2.2: Guardian Module

| Task                               | Package       | Spec Reference                          | Priority |
| ---------------------------------- | ------------- | --------------------------------------- | -------- |
| FingerprintService (variation gen) | `apps/worker` | [GUARDIAN.md](./specs/GUARDIAN.md) §3   | P0       |
| MetadataService (strip + spoof)    | `apps/worker` | [GUARDIAN.md](./specs/GUARDIAN.md) §3.2 | P0       |
| Batch variation processing         | `apps/worker` | [GUARDIAN.md](./specs/GUARDIAN.md) §7   | P0       |
| MD5 hash verification              | `apps/worker` | [GUARDIAN.md](./specs/GUARDIAN.md) §5   | P0       |
| SSIM quality validation (CI test)  | test          | [GUARDIAN.md](./specs/GUARDIAN.md) §8.3 | P1       |

### Milestone 2.3: Production UI

| Task                                  | Package    | Spec Reference                | Priority |
| ------------------------------------- | ---------- | ----------------------------- | -------- |
| Factory page (render queue + trigger) | `apps/web` | [DESIGN.md](./DESIGN.md) §6.4 | P0       |
| Render profile editor                 | `apps/web` | [API.md](./API.md) §6         | P0       |
| Asset gallery (grid + list view)      | `apps/web` | [DESIGN.md](./DESIGN.md) §6.5 | P0       |
| Video preview modal                   | `apps/web` | [DESIGN.md](./DESIGN.md) §5.4 | P0       |
| Variation count badges                | `apps/web` | [DESIGN.md](./DESIGN.md) §5.4 | P1       |

**Exit Criteria:** Approved spike → rendered video with captions → 10 unique variations.

---

## 5. Phase 3: Distribution (Weeks 8–9)

> **Goal:** Assets are published to connected social media accounts.

### Milestone 3.1: Fleet Module

| Task                                 | Package       | Spec Reference                    | Priority |
| ------------------------------------ | ------------- | --------------------------------- | -------- |
| Account CRUD endpoints               | `apps/api`    | [API.md](./API.md) §7             | P0       |
| Cluster CRUD endpoints               | `apps/api`    | [API.md](./API.md) §8             | P0       |
| Distribution endpoints               | `apps/api`    | [API.md](./API.md) §9             | P0       |
| SchedulerService (optimal timing)    | `apps/api`    | [FLEET.md](./specs/FLEET.md) §4   | P0       |
| PublisherService (platform adapters) | `apps/worker` | [FLEET.md](./specs/FLEET.md) §6   | P0       |
| TikTok publisher adapter             | `apps/worker` | [FLEET.md](./specs/FLEET.md) §6   | P0       |
| Instagram publisher adapter          | `apps/worker` | [FLEET.md](./specs/FLEET.md) §6   | P1       |
| YouTube publisher adapter            | `apps/worker` | [FLEET.md](./specs/FLEET.md) §6   | P1       |
| Account health monitoring            | `apps/worker` | [FLEET.md](./specs/FLEET.md) §2.3 | P1       |
| Credential encryption                | `apps/api`    | [SECURITY.md](./SECURITY.md) §4.2 | P0       |

### Milestone 3.2: Distribution UI

| Task                             | Package    | Spec Reference                | Priority |
| -------------------------------- | ---------- | ----------------------------- | -------- |
| Fleet page (accounts + clusters) | `apps/web` | [DESIGN.md](./DESIGN.md) §6.6 | P0       |
| Distribution scheduling UI       | `apps/web` | [DESIGN.md](./DESIGN.md) §6.6 | P0       |
| Distribution history + status    | `apps/web` | [API.md](./API.md) §9         | P0       |
| Account health indicators        | `apps/web` | [DESIGN.md](./DESIGN.md) §5.1 | P1       |

**Exit Criteria:** End-to-end: URL → Clips → Variations → Published to TikTok.

---

## 6. Phase 4: Polish & Scale (Weeks 10–12)

> **Goal:** Production-ready with monitoring, error recovery, and performance.

| Task                            | Package    | Spec Reference                                      | Priority |
| ------------------------------- | ---------- | --------------------------------------------------- | -------- |
| Sentry integration              | all        | [OBSERVABILITY.md](./OBSERVABILITY.md) §6           | P1       |
| Health check endpoint           | `apps/api` | [OBSERVABILITY.md](./OBSERVABILITY.md) §7           | P0       |
| Bull Board integration          | `apps/api` | [OBSERVABILITY.md](./OBSERVABILITY.md) §5.2         | P1       |
| Error recovery flows (retry UI) | `apps/web` | [TROUBLESHOOTING.md](./runbooks/TROUBLESHOOTING.md) | P1       |
| Workspace settings page         | `apps/web` | [DESIGN.md](./DESIGN.md) §6.7                       | P1       |
| CI/CD pipeline (GitHub Actions) | root       | [DEPLOYMENT.md](./runbooks/DEPLOYMENT.md) §5        | P0       |
| Docker production images        | root       | [DEPLOYMENT.md](./runbooks/DEPLOYMENT.md) §3        | P0       |
| Load testing (k6/Artillery)     | test       | —                                                   | P2       |
| Performance optimization        | all        | [PRD.md](./PRD.md) §5                               | P2       |
| Documentation review            | docs       | —                                                   | P2       |

**Exit Criteria:** System handles 50+ concurrent users, monitored, deployed, documented.

---

## 7. Post-MVP Backlog

| Feature                       | Phase | Effort  | Spec Needed |
| ----------------------------- | ----- | ------- | ----------- |
| Contextual B-Roll injection   | v0.2  | Large   | Yes         |
| AI Avatar generation (HeyGen) | v0.2  | Large   | Yes         |
| Multi-language captions       | v0.2  | Medium  | Yes         |
| Affiliate link injection      | v0.2  | Medium  | Yes         |
| Analytics dashboard           | v0.2  | Medium  | Yes         |
| AI Agentic autonomy           | v0.3  | X-Large | Yes         |
| Webhook integrations          | v0.3  | Small   | Yes         |
| Mobile app                    | v1.0  | X-Large | Yes         |
| Billing & subscriptions       | v0.2  | Large   | Yes         |

---

## 8. Definition of Done

A task is "done" when:

- [ ] Code implements the spec (reference the spec section)
- [ ] Unit tests written and passing (coverage target met)
- [ ] Integration tests for API endpoints (if applicable)
- [ ] TypeScript strict mode — no `any`, no `as` overrides
- [ ] Linting passes
- [ ] PR reviewed and approved
- [ ] Documentation updated (if spec changed)
- [ ] Deployed to staging and manually verified
