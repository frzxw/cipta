# Cipta — Product Requirements Document (PRD)

> **Version:** 0.1.0-alpha  
> **Status:** Draft  
> **Owner:** Product / Engineering  
> **Last Updated:** 2026-04-11

---

## 1. Executive Summary

Cipta is an AI-powered platform for massive, automated production and distribution of social media video content. It addresses the primary bottleneck in the creator economy: producing high-volume, high-quality, algorithm-safe content at scale.

The MVP targets **Massive Clippers** as the primary user segment, with foundational architecture supporting future expansion to Product Affiliators and AI Influencers.

---

## 2. Problem Statement

| Problem | Impact |
|---------|--------|
| Manual clip creation is time-consuming | A single 10-minute podcast yields 3-5 clips manually; Cipta targets 20-50+ |
| Duplicate content detection causes shadowbans | Creators posting the same clip across accounts lose reach |
| Optimal posting times are guessed, not calculated | Engagement rates suffer by 30-60% from suboptimal scheduling |
| Managing multiple accounts is operationally chaotic | No unified dashboard leads to missed schedules and inconsistent branding |
| Captioning and B-roll are expensive manual processes | Professional editors charge $50-200 per clip |

---

## 3. User Personas

### 3.1 Primary: The Massive Clipper (MVP Target)

- **Who:** Content creators / agencies clipping long-form content (podcasts, streams, interviews)
- **Goal:** Produce 50-200 unique clip variations per day across 5-20 accounts
- **Pain Points:** Manual editing bottleneck, shadowbans from duplicate uploads, inconsistent posting
- **Success Metric:** Time-to-publish reduced from 2 hours/clip to < 5 minutes/clip

### 3.2 Secondary: The Product Affiliator (Post-MVP)

- **Who:** Affiliate marketers managing 10-50 social media accounts
- **Goal:** Generate AI avatar scripts and auto-distribute with embedded affiliate links
- **Pain Points:** Script writing fatigue, avatar generation costs, link management
- **Success Metric:** Revenue per account increased through higher volume and consistency

### 3.3 Tertiary: The AI Influencer Agency (Future)

- **Who:** Agencies managing virtual personas / AI influencers
- **Goal:** Fully autonomous content pipeline driven by trend analysis
- **Pain Points:** Manual trend monitoring, inconsistent persona voice, scheduling overhead
- **Success Metric:** Fully autonomous posting with >80% engagement parity vs. manual management

---

## 4. Feature Specifications

### 4.1 MVP Features (v0.1)

#### F-001: Source Ingestion

| Field | Value |
|-------|-------|
| **Priority** | P0 — Must Have |
| **Module** | Ingestor |
| **Description** | Accept a URL (YouTube, TikTok, Twitch, etc.) and download the source media in the highest available quality |
| **Trigger** | User pastes URL in the Control Tower dashboard |

**Acceptance Criteria:**
- [ ] AC-001.1: System accepts YouTube, TikTok, and Twitch URLs
- [ ] AC-001.2: Media is downloaded at highest available quality (up to 4K) via `yt-dlp`
- [ ] AC-001.3: Download progress is reported in real-time via WebSocket/SSE to the UI
- [ ] AC-001.4: Source metadata (title, duration, thumbnail) is extracted and stored
- [ ] AC-001.5: Duplicate URL detection within the same Workspace (warn, don't block)
- [ ] AC-001.6: Failed downloads retry up to 3 times with exponential backoff
- [ ] AC-001.7: Downloaded source files are stored in configurable Cloud Storage (S3/GCS)

---

#### F-002: Automated Transcription

| Field | Value |
|-------|-------|
| **Priority** | P0 — Must Have |
| **Module** | Ingestor |
| **Description** | Transcribe ingested audio to text with word-level timestamps |

**Acceptance Criteria:**
- [ ] AC-002.1: Audio is extracted from source and sent to Whisper API (or compatible)
- [ ] AC-002.2: Transcription includes word-level timestamps (start, end per word)
- [ ] AC-002.3: Transcription supports English as the primary language
- [ ] AC-002.4: Transcription is stored as structured JSON alongside the Source record
- [ ] AC-002.5: Processing time for a 60-minute source ≤ 5 minutes
- [ ] AC-002.6: User can view and manually edit the transcript in the UI

---

#### F-003: Viral Spike Detection

| Field | Value |
|-------|-------|
| **Priority** | P0 — Must Have |
| **Module** | Ingestor |
| **Description** | LLM analyzes transcript to identify segments with high viral potential |

**Acceptance Criteria:**
- [ ] AC-003.1: LLM receives transcript and returns an array of Viral Spikes
- [ ] AC-003.2: Each spike includes: start timestamp, end timestamp, confidence score (0-100), category (humor/controversy/hook/emotional), suggested title
- [ ] AC-003.3: Minimum spike duration: 15 seconds. Maximum: 90 seconds
- [ ] AC-003.4: User can approve, reject, or adjust spike boundaries in the UI
- [ ] AC-003.5: System generates at least 5 spikes per 60-minute source by default
- [ ] AC-003.6: LLM prompt is configurable per Workspace (tone, niche adjustments)

---

#### F-004: Automated Video Production

| Field | Value |
|-------|-------|
| **Priority** | P0 — Must Have |
| **Module** | Factory |
| **Description** | Produce finished vertical (9:16) video clips from approved Viral Spikes |

**Acceptance Criteria:**
- [ ] AC-004.1: Input 16:9 landscape video is cropped to 9:16 with face/subject tracking
- [ ] AC-004.2: Kinetic captions are burned into the video stream (word-by-word animation)
- [ ] AC-004.3: Caption style is configurable (font, size, color, animation type, position)
- [ ] AC-004.4: Output resolution: 1080x1920 (1080p vertical)
- [ ] AC-004.5: Output format: H.264 MP4, AAC audio
- [ ] AC-004.6: Render time for a 60-second clip ≤ 30 seconds (with GPU acceleration)
- [ ] AC-004.7: Render progress is reported to the UI in real-time

---

#### F-005: Variation Generation (Anti-Shadowban)

| Field | Value |
|-------|-------|
| **Priority** | P0 — Must Have |
| **Module** | Guardian |
| **Description** | Generate N visually unique variations of each produced clip |

**Acceptance Criteria:**
- [ ] AC-005.1: Given a clip, generate N variations (configurable, default=10)
- [ ] AC-005.2: Each variation has a unique MD5 hash
- [ ] AC-005.3: Variations apply randomized: zoom (0.5-1%), color shift (±1 tint), noise overlay (1% opacity), bitrate jitter (±1%)
- [ ] AC-005.4: All original EXIF/metadata is stripped and replaced with spoofed device metadata
- [ ] AC-005.5: Perceptual quality difference between variations is imperceptible (SSIM ≥ 0.98)
- [ ] AC-005.6: Variations are batch-rendered, not sequential single-threaded

---

#### F-006: Account & Cluster Management

| Field | Value |
|-------|-------|
| **Priority** | P0 — Must Have |
| **Module** | Fleet |
| **Description** | Connect social media accounts and organize them into Clusters |

**Acceptance Criteria:**
- [ ] AC-006.1: Users can add accounts via API key/token for supported platforms
- [ ] AC-006.2: Supported platforms (MVP): TikTok, Instagram Reels, YouTube Shorts
- [ ] AC-006.3: Accounts can be grouped into Clusters with a name and description
- [ ] AC-006.4: Each Cluster can be assigned a default Render Profile
- [ ] AC-006.5: Account health status (active, rate-limited, banned) is displayed
- [ ] AC-006.6: Maximum 50 accounts per Workspace in MVP

---

#### F-007: Scheduled Distribution

| Field | Value |
|-------|-------|
| **Priority** | P1 — Should Have |
| **Module** | Fleet |
| **Description** | Schedule and automatically publish Assets to connected accounts |

**Acceptance Criteria:**
- [ ] AC-007.1: Assets can be manually assigned to a Cluster for distribution
- [ ] AC-007.2: System suggests optimal posting times based on platform data
- [ ] AC-007.3: Schedule uses non-round times (e.g., 18:43 not 19:00) to mimic human behavior
- [ ] AC-007.4: Distribution respects per-account Cooldown periods
- [ ] AC-007.5: Failed posts retry up to 3 times with different timing
- [ ] AC-007.6: Distribution status (pending, posted, failed) is visible in the dashboard
- [ ] AC-007.7: Pinned comment is automatically posted after video goes live

---

#### F-008: Control Tower Dashboard

| Field | Value |
|-------|-------|
| **Priority** | P0 — Must Have |
| **Module** | Frontend (web) |
| **Description** | Central dashboard for managing the entire content pipeline |

**Acceptance Criteria:**
- [ ] AC-008.1: Dashboard shows real-time pipeline status (Sources → Chunks → Assets → Posts)
- [ ] AC-008.2: Users can ingest new sources via URL input
- [ ] AC-008.3: Users can review and approve/reject Viral Spikes
- [ ] AC-008.4: Users can preview rendered clips before distribution
- [ ] AC-008.5: Users can manage Accounts and Clusters
- [ ] AC-008.6: Users can view distribution history and analytics
- [ ] AC-008.7: Real-time job progress indicators for all processing stages

---

#### F-009: User Authentication & Workspace Management

| Field | Value |
|-------|-------|
| **Priority** | P0 — Must Have |
| **Module** | Orchestrator (API) |
| **Description** | Secure user authentication and multi-workspace support |

**Acceptance Criteria:**
- [ ] AC-009.1: Users can register with email/password
- [ ] AC-009.2: Users can log in and receive JWT access + refresh tokens
- [ ] AC-009.3: Each user belongs to at least one Workspace
- [ ] AC-009.4: Workspaces have roles: Owner, Admin, Member
- [ ] AC-009.5: All API endpoints are protected by JWT authentication
- [ ] AC-009.6: Rate limiting: 100 requests/minute per user

---

### 4.2 Post-MVP Features (v0.2+)

| ID | Feature | Priority | Module |
|----|---------|----------|--------|
| F-010 | Contextual B-Roll Injection | P2 | Factory |
| F-011 | AI Avatar Generation (HeyGen/ElevenLabs) | P2 | Factory |
| F-012 | Affiliate Link Auto-Injection | P2 | Fleet |
| F-013 | AI Trend Analysis & Content Suggestion | P3 | Ingestor |
| F-014 | AI Agentic Autonomy (per-cluster AI agent) | P3 | All |
| F-015 | Multi-language Transcription & Captions | P2 | Ingestor/Factory |
| F-016 | Custom Watermark/Branding Overlay | P2 | Factory |
| F-017 | Analytics Dashboard (engagement tracking) | P2 | Frontend |
| F-018 | Webhook Integrations (Zapier, n8n) | P3 | API |

---

## 5. Non-Functional Requirements

| Category | Requirement | Target |
|----------|-------------|--------|
| **Performance** | API response time (p95) | < 200ms |
| **Performance** | Video render time (60s clip) | < 30s with GPU |
| **Performance** | Concurrent renders | 10+ simultaneous |
| **Scalability** | Horizontal Worker scaling | Stateless workers, add nodes |
| **Reliability** | Job retry with backoff | Up to 3 retries |
| **Reliability** | System uptime | 99.5% |
| **Security** | Authentication | JWT with refresh rotation |
| **Security** | Data isolation | Workspace-level multi-tenancy |
| **Security** | Secrets management | Environment variables, never in code |
| **Observability** | Structured logging | JSON format, correlation IDs |
| **Observability** | Job monitoring | BullMQ dashboard (Bull Board) |

---

## 6. Out of Scope (MVP)

- Mobile application
- Self-hosted deployment documentation
- Real-time collaborative editing
- Direct platform DM automation
- Billing and subscription management (handled manually in MVP)
- Content moderation / NSFW filtering
- Multi-region deployment

---

## 7. Success Metrics (KPIs)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time from URL to published clip | < 10 minutes (automated) | End-to-end pipeline timing |
| Unique variations per clip | ≥ 10 per render batch | Count of unique MD5 hashes |
| Shadowban rate | < 5% of distributed clips | Platform feedback monitoring |
| Daily clips produced per user | ≥ 50 | System analytics |
| Dashboard page load time | < 2 seconds | Lighthouse Performance score > 90 |

---

## 8. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Platform API changes / ToS enforcement | High | High | Abstract platform integrations behind adapters; monitor ToS changes |
| yt-dlp breakage from YouTube updates | Medium | High | Pin to stable version; fallback to alternative downloaders |
| GPU availability for rendering | Medium | Medium | Support CPU fallback; design for cloud GPU scaling (RunPod, Lambda) |
| LLM cost escalation | Medium | Medium | Implement prompt caching; allow model swapping; batch requests |
| Account bans due to bot detection | High | High | Implement realistic Cooldowns, human-like scheduling, IP rotation |

---

## Appendix: Feature Dependency Graph

```
F-009 (Auth) ──────────────────────────────────┐
                                                │
F-001 (Ingest) → F-002 (Transcribe) → F-003 (Viral Spike Detection)
                                                │
                                        F-004 (Video Production)
                                                │
                                        F-005 (Variation Generation)
                                                │
                               F-006 (Account Mgmt) → F-007 (Distribution)
                                                │
                                        F-008 (Dashboard) ← reads from all
```
