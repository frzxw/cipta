# Cipta — Fleet Module Specification

> **Module:** Fleet  
> **Package:** `apps/api` (controller/service) + `apps/worker` (processor)  
> **Queues:** `fleet-queue`  
> **PRD Features:** F-006, F-007  
> **Last Updated:** 2026-04-11

---

## 1. Module Overview

The Fleet manages the outward flow of content — account connections, cluster organization, intelligent scheduling, and automated publishing.

```
Assets (Variations) → Schedule → Publish → Pin Comment → Track Status
```

### Responsibilities

| Component          | Responsibility                                    | Runs In       |
| ------------------ | ------------------------------------------------- | ------------- |
| `FleetController`  | Account CRUD, cluster CRUD, distribution CRUD     | `apps/api`    |
| `FleetService`     | Business logic, scheduling, distribution dispatch | `apps/api`    |
| `SchedulerService` | Calculate optimal posting times                   | `apps/api`    |
| `FleetProcessor`   | Execute publish operations                        | `apps/worker` |
| `PublisherService` | Platform-specific API integrations                | `apps/worker` |

---

## 2. Account Management

### 2.1 Platform Integrations

| Platform  | Auth Method            | Publish API                | Status   |
| --------- | ---------------------- | -------------------------- | -------- |
| TikTok    | OAuth 2.0 / API Key    | TikTok Content Posting API | MVP      |
| Instagram | Meta Graph API (OAuth) | Meta Graph API             | MVP      |
| YouTube   | Google OAuth 2.0       | YouTube Data API v3        | MVP      |
| Twitter/X | OAuth 2.0              | Twitter API v2             | Post-MVP |
| Facebook  | Meta Graph API         | Meta Graph API             | Post-MVP |

### 2.2 Credential Storage

Credentials are stored encrypted in the `Account.credentials` JSON column:

```typescript
interface AccountCredentials {
  // OAuth-based platforms
  accessToken: string; // Encrypted at rest
  refreshToken: string; // Encrypted at rest
  tokenExpiresAt: string; // ISO 8601

  // API key-based platforms
  apiKey?: string; // Encrypted at rest
  apiSecret?: string; // Encrypted at rest
}
```

**Encryption:** AES-256-GCM using a server-side encryption key from environment variables. The key is NEVER stored in the database.

### 2.3 Account Health Monitoring

```typescript
enum AccountStatus {
  ACTIVE          // Healthy, can publish
  RATE_LIMITED    // Temporarily throttled by platform
  SUSPENDED       // Platform has suspended the account
  DISCONNECTED    // Credentials expired or revoked
}
```

**Health Check Job:** Runs every 30 minutes for all active accounts:

1. Attempt a lightweight API call (e.g., profile info fetch)
2. If succeeds → status remains `ACTIVE`
3. If 429 → set `RATE_LIMITED`, schedule retry in 1 hour
4. If 401/403 → set `DISCONNECTED`, notify user
5. If platform reports suspension → set `SUSPENDED`, notify user

---

## 3. Cluster Management

### 3.1 Cluster Structure

A Cluster groups related Accounts that share a content strategy:

```
Cluster: "Tech Podcast Clips"
├── @techclips_01 (TikTok)
├── @techclips_02 (TikTok)
├── @tech.podcast.clips (Instagram)
├── @TechPodClips (YouTube)
└── Distribution Rule:
    ├── Render Profile: "Bold Podcast Style"
    ├── Schedule: 3 posts/day, 18:00-22:00 window
    ├── Cooldown: 45 minutes between posts per account
    └── Auto-Pin: true, template: "Full episode → {link}"
```

### 3.2 Distribution Rules

Each Cluster has one or more `DistributionRule` that governs how content is distributed:

```typescript
interface DistributionRuleConfig {
  // Scheduling
  scheduleConfig: {
    postsPerDay: number; // 1-10
    timeWindows: TimeWindow[]; // Preferred posting windows
    timezone: string; // e.g., "America/New_York"
    avoidRoundTimes: boolean; // true = 18:43 not 19:00
  };

  // Cooldown
  cooldownMinutes: number; // Min gap between posts on same account

  // Engagement
  autoPin: boolean;
  pinnedCommentTemplate: string; // Supports {{link}}, {{title}} variables

  // Assignment
  distributionStrategy: 'round-robin' | 'random' | 'least-recent';
}

interface TimeWindow {
  startHour: number; // 0-23, in configured timezone
  endHour: number; // 0-23
  daysOfWeek: number[]; // 0=Sunday, 6=Saturday
}
```

---

## 4. Predictive Scheduler

### 4.1 Scheduling Algorithm

```typescript
function calculateNextSlot(
  account: Account,
  rule: DistributionRule,
  existingSchedule: Distribution[],
): Date {
  const config = rule.scheduleConfig;

  // 1. Find the next available time window
  const now = new Date();
  const windowStart = getNextTimeWindow(now, config.timeWindows, config.timezone);

  // 2. Check cooldown from last post on this account
  const lastPost = getLastPostTime(account.id, existingSchedule);
  const cooldownEnd = lastPost ? addMinutes(lastPost, rule.cooldownMinutes) : now;

  const earliest = max(windowStart, cooldownEnd);

  // 3. Add human-like jitter (avoid round times)
  if (config.avoidRoundTimes) {
    const jitterMinutes = randomInt(1, 14); // 1-14 minutes after the hour
    const jitterSeconds = randomInt(0, 59);
    return addMinutes(addSeconds(roundToHour(earliest), jitterMinutes * 60 + jitterSeconds));
  }

  return earliest;
}
```

### 4.2 Human Behavior Mimicry

| Behavior                | Implementation                                          |
| ----------------------- | ------------------------------------------------------- |
| Non-round posting times | Add 1-14 minute jitter to hour                          |
| Irregular intervals     | Vary cooldown by ±20%                                   |
| No posting at 3 AM      | Respect time windows                                    |
| Weekend pattern shift   | Different time windows for weekends                     |
| Gradual ramp-up         | New accounts start with 1 post/day, increase over weeks |

---

## 5. Distribution Pipeline

### 5.1 Job: `fleet.publish`

| Field       | Value                 |
| ----------- | --------------------- |
| Queue       | `fleet-queue`         |
| Type        | `publish`             |
| Priority    | High (time-sensitive) |
| Retries     | 3                     |
| Backoff     | Fixed: 5 minutes      |
| Timeout     | 5 minutes             |
| Concurrency | 3                     |

**Payload:**

```typescript
interface PublishJobPayload {
  distributionId: string;
  variationId: string;
  accountId: string;
  workspaceId: string;
  caption: string;
  pinnedComment?: string;
  scheduledAt: string; // ISO 8601
}
```

**Processing Steps:**

1. Update `Distribution.status` → `PUBLISHING`
2. Download Variation video from Cloud Storage to temp
3. Decrypt account credentials
4. Call platform-specific publish API
5. Receive platform post ID and URL
6. Update `Distribution` with `platformPostId`, `platformPostUrl`, `publishedAt`
7. If `pinnedComment` is set:
   a. Wait 5 seconds (platform needs time to process)
   b. Post pinned comment via platform API
8. Update `Distribution.status` → `PUBLISHED`
9. Clean up temp files

### 5.2 Job: `fleet.check-health`

| Field    | Value                   |
| -------- | ----------------------- |
| Queue    | `fleet-queue`           |
| Type     | `check-health`          |
| Priority | Low                     |
| Schedule | Every 30 minutes (cron) |

Performs health checks on all active accounts (see Section 2.3).

---

## 6. Platform-Specific Publishing

### 6.1 Publisher Interface

```typescript
interface PlatformPublisher {
  publish(params: {
    videoPath: string;
    caption: string;
    credentials: AccountCredentials;
  }): Promise<{ postId: string; postUrl: string }>;

  postComment(params: {
    postId: string;
    comment: string;
    credentials: AccountCredentials;
    pin: boolean;
  }): Promise<{ commentId: string }>;

  checkHealth(credentials: AccountCredentials): Promise<AccountStatus>;

  refreshToken(credentials: AccountCredentials): Promise<AccountCredentials>;
}
```

### 6.2 Platform Adapter Pattern

Each platform implements the `PlatformPublisher` interface:

```typescript
class TikTokPublisher implements PlatformPublisher { ... }
class InstagramPublisher implements PlatformPublisher { ... }
class YouTubePublisher implements PlatformPublisher { ... }

// Factory
function getPublisher(platform: AccountPlatform): PlatformPublisher {
  switch (platform) {
    case 'TIKTOK': return new TikTokPublisher();
    case 'INSTAGRAM': return new InstagramPublisher();
    case 'YOUTUBE': return new YouTubePublisher();
    default: throw new Error(`Unsupported platform: ${platform}`);
  }
}
```

---

## 7. Variation-to-Account Assignment

When distributing an Asset to a Cluster, variations are assigned to accounts:

### 7.1 Round-Robin Strategy (Default)

```typescript
function assignVariations(variations: Variation[], accounts: Account[]): Map<string, string> {
  const assignments = new Map<string, string>(); // accountId → variationId

  for (let i = 0; i < accounts.length; i++) {
    const variation = variations[i % variations.length];
    assignments.set(accounts[i].id, variation.id);
  }

  return assignments;
}
```

**Rule:** Each account in a cluster gets a **different** variation. If there are more accounts than variations, wrap around. If more variations than accounts, extras are not used.

---

## 8. Status Transitions

```
Distribution Status Flow:
─────────────────────────
SCHEDULED ──────► PUBLISHING ──────► PUBLISHED
     │                │
     ▼                ▼
  CANCELLED         FAILED
                      │
                      ▼ (retry)
                  PUBLISHING (up to 3 retries)
```

---

## 9. Error Handling

| Error              | Platform Response          | Action                                                |
| ------------------ | -------------------------- | ----------------------------------------------------- |
| Rate limited (429) | Platform returns 429       | Set account `RATE_LIMITED`, retry in 1 hour           |
| Unauthorized (401) | Token expired              | Attempt token refresh, retry                          |
| Content rejected   | Platform-specific error    | Mark `FAILED`, log reason, notify user                |
| Network timeout    | No response                | Retry with backoff                                    |
| Video too large    | Max file size exceeded     | Compress and retry (or fail)                          |
| Account suspended  | Platform reports violation | Set account `SUSPENDED`, cancel pending distributions |

---

## 10. Configuration

```bash
# Fleet Worker
FLEET_PUBLISH_CONCURRENCY=3
FLEET_HEALTH_CHECK_INTERVAL=30m
FLEET_COOLDOWN_DEFAULT=30            # minutes
FLEET_MAX_RETRIES=3
FLEET_RETRY_DELAY=300000             # 5 minutes in ms

# Platform API Keys (per-integration)
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
INSTAGRAM_APP_ID=...
INSTAGRAM_APP_SECRET=...
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...

# Encryption
CREDENTIAL_ENCRYPTION_KEY=...       # AES-256 key for credential storage
```

---

## 11. Testing

### 11.1 Unit Tests

| Test                                         | File                        |
| -------------------------------------------- | --------------------------- |
| Scheduling algorithm (time slot calculation) | `scheduler.service.spec.ts` |
| Human-like jitter within bounds              | `scheduler.service.spec.ts` |
| Cooldown enforcement                         | `scheduler.service.spec.ts` |
| Variation-to-account assignment              | `fleet.service.spec.ts`     |
| Platform publisher factory                   | `publisher.service.spec.ts` |

### 11.2 Integration Tests

| Test                                                         | File                        |
| ------------------------------------------------------------ | --------------------------- |
| Post /distributions creates records for all cluster accounts | `fleet.e2e-spec.ts`         |
| Distribution respects cooldown between same account          | `fleet.e2e-spec.ts`         |
| Cancel pending distribution returns 200                      | `fleet.e2e-spec.ts`         |
| Publish job flow with mocked platform API                    | `fleet.integration-spec.ts` |
