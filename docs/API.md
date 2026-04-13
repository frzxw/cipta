# Cipta — REST API Specification

> **Version:** 0.1.0-alpha  
> **Base URL:** `https://api.cipta.app/v1` (production) · `http://localhost:3001/v1` (development)  
> **Auth:** Bearer JWT  
> **Content-Type:** `application/json`  
> **Last Updated:** 2026-04-11

---

## 1. API Conventions

### 1.1 Response Envelope

All API responses follow a consistent envelope format:

**Success:**

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-04-11T08:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**Paginated Success:**

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "timestamp": "2026-04-11T08:00:00Z",
    "requestId": "req_abc123",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 152,
      "totalPages": 8
    }
  }
}
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "URL is required",
    "details": [{ "field": "url", "message": "must be a valid URL" }]
  },
  "meta": {
    "timestamp": "2026-04-11T08:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### 1.2 Error Codes

| HTTP Status | Error Code             | Description                              |
| ----------- | ---------------------- | ---------------------------------------- |
| 400         | `VALIDATION_ERROR`     | Request body/params failed validation    |
| 401         | `UNAUTHORIZED`         | Missing or invalid JWT                   |
| 403         | `FORBIDDEN`            | Insufficient role/permissions            |
| 404         | `NOT_FOUND`            | Resource does not exist                  |
| 409         | `CONFLICT`             | Duplicate resource (e.g., duplicate URL) |
| 422         | `UNPROCESSABLE_ENTITY` | Valid syntax but semantically invalid    |
| 429         | `RATE_LIMITED`         | Too many requests                        |
| 500         | `INTERNAL_ERROR`       | Server error                             |

### 1.3 Authentication

All endpoints (except `/auth/*`) require a valid JWT in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### 1.4 Pagination

Paginated endpoints accept:

| Param       | Type    | Default     | Description              |
| ----------- | ------- | ----------- | ------------------------ |
| `page`      | integer | 1           | Page number (1-indexed)  |
| `limit`     | integer | 20          | Items per page (max 100) |
| `sortBy`    | string  | `createdAt` | Field to sort by         |
| `sortOrder` | string  | `desc`      | `asc` or `desc`          |

### 1.5 Workspace Scoping

All resource endpoints are scoped to the user's active workspace via the `X-Workspace-Id` header:

```
X-Workspace-Id: ws_abc123
```

If omitted, the user's default workspace is used.

---

## 2. Authentication Endpoints

### POST `/auth/register`

Create a new user account.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd!",
  "displayName": "John Doe"
}
```

**Validation:**

- `email`: required, valid email, unique
- `password`: required, min 8 chars, 1 uppercase, 1 number, 1 special
- `displayName`: required, 2-50 chars

**Response (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "displayName": "John Doe",
      "createdAt": "2026-04-11T08:00:00Z"
    },
    "workspace": {
      "id": "ws_def456",
      "name": "John's Workspace",
      "slug": "johns-workspace",
      "role": "OWNER"
    },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ...",
      "expiresIn": 900
    }
  }
}
```

---

### POST `/auth/login`

Authenticate and receive tokens.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd!"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "displayName": "John Doe"
    },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ...",
      "expiresIn": 900
    }
  }
}
```

---

### POST `/auth/refresh`

Rotate tokens using a valid refresh token.

**Request:**

```json
{
  "refreshToken": "eyJ..."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 900
  }
}
```

---

### POST `/auth/logout`

Invalidate the refresh token family for the provided refresh token.

**Request:**

```json
{
  "refreshToken": "eyJ..."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

---

## 3. Source Endpoints (Ingestor)

### POST `/sources`

Ingest a new source from a URL.

**Request:**

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "projectId": "prj_abc123",
  "quality": "highest"
}
```

**Validation:**

- `url`: required, valid URL (YouTube, TikTok, Twitch supported)
- `projectId`: optional, valid UUID
- `quality`: optional, enum: `highest` | `1080p` | `720p` (default: `highest`)

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "src_abc123",
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "status": "PENDING",
    "jobId": "job_xyz789",
    "createdAt": "2026-04-11T08:00:00Z"
  }
}
```

---

### GET `/sources`

List all sources in the workspace.

**Query Params:** Standard pagination + `status` filter.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "src_abc123",
      "url": "https://youtube.com/...",
      "title": "Amazing Podcast Ep. 42",
      "platform": "youtube",
      "status": "READY",
      "durationSeconds": 3600,
      "thumbnailUrl": "https://storage.cipta.app/...",
      "createdAt": "2026-04-11T08:00:00Z"
    }
  ],
  "meta": { "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 } }
}
```

---

### GET `/sources/:id`

Get a single source with its transcript and viral spikes.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "src_abc123",
    "url": "https://youtube.com/...",
    "title": "Amazing Podcast Ep. 42",
    "platform": "youtube",
    "status": "READY",
    "durationSeconds": 3600,
    "thumbnailUrl": "https://storage.cipta.app/...",
    "metadata": { "uploader": "PodcastChannel", "uploadDate": "2026-04-01" },
    "transcript": {
      "id": "trn_abc123",
      "language": "en",
      "status": "COMPLETED",
      "wordCount": 8500
    },
    "viralSpikes": [
      {
        "id": "vs_001",
        "startTime": 142.5,
        "endTime": 198.3,
        "confidenceScore": 92,
        "category": "HUMOR",
        "suggestedTitle": "When he realized the mic was on",
        "status": "PENDING_REVIEW"
      }
    ],
    "createdAt": "2026-04-11T08:00:00Z"
  }
}
```

---

### DELETE `/sources/:id`

Delete a source and all derived data (transcripts, chunks, assets, variations).

**Response (200):**

```json
{
  "success": true,
  "data": { "message": "Source deleted successfully" }
}
```

---

## 4. Viral Spike Endpoints

### PATCH `/viral-spikes/:id`

Approve, reject, or adjust a viral spike.

**Request:**

```json
{
  "status": "APPROVED",
  "startTime": 140.0,
  "endTime": 200.0,
  "suggestedTitle": "Custom title override"
}
```

**Validation:**

- `status`: optional, enum: `APPROVED` | `REJECTED`
- `startTime`, `endTime`: optional, float, `endTime > startTime`, min duration 15s, max 90s

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "vs_001",
    "status": "APPROVED",
    "startTime": 140.0,
    "endTime": 200.0,
    "suggestedTitle": "Custom title override"
  }
}
```

---

### POST `/viral-spikes/:id/chunk`

Create a Chunk from an approved Viral Spike and begin extraction.

**Response (201):**

```json
{
  "success": true,
  "data": {
    "chunkId": "chk_abc123",
    "viralSpikeId": "vs_001",
    "status": "PENDING",
    "jobId": "job_xyz790"
  }
}
```

---

## 5. Factory Endpoints

### POST `/factory/render`

Trigger rendering of a Chunk into a finished Asset.

**Request:**

```json
{
  "chunkId": "chk_abc123",
  "renderProfileId": "rp_def456",
  "variationCount": 10
}
```

**Validation:**

- `chunkId`: required, valid UUID, Chunk must be in `READY` status
- `renderProfileId`: optional, valid UUID (uses workspace default if omitted)
- `variationCount`: optional, integer, 1-100, default 10

**Response (202):**

```json
{
  "success": true,
  "data": {
    "assetId": "ast_abc123",
    "chunkId": "chk_abc123",
    "renderProfileId": "rp_def456",
    "variationCount": 10,
    "jobId": "job_xyz791",
    "status": "PENDING"
  }
}
```

---

### GET `/assets`

List all rendered assets in the workspace.

**Query Params:** Standard pagination + `status`, `chunkId` filters.

**Response (200):** Paginated list of Asset objects with variation counts.

---

### GET `/assets/:id`

Get a single asset with its variations.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "ast_abc123",
    "chunkId": "chk_abc123",
    "status": "RENDERED",
    "storageUrl": "https://storage.cipta.app/...",
    "fileSizeBytes": 15728640,
    "durationMs": 45000,
    "width": 1080,
    "height": 1920,
    "codec": "h264",
    "variations": [
      {
        "id": "var_001",
        "md5Hash": "a1b2c3d4...",
        "storageUrl": "https://storage.cipta.app/...",
        "fileSizeBytes": 15730000,
        "guardianParams": {
          "zoom": 0.7,
          "colorShift": { "hue": 1, "saturation": -0.5 },
          "bitrateJitter": 0.8,
          "noiseOpacity": 0.008
        },
        "status": "READY"
      }
    ],
    "createdAt": "2026-04-11T08:00:00Z"
  }
}
```

---

## 6. Render Profile Endpoints

### POST `/render-profiles`

Create a new render profile.

**Request:**

```json
{
  "name": "Bold Podcast Style",
  "captionStyle": {
    "fontFamily": "Montserrat",
    "fontSize": 48,
    "fontWeight": "bold",
    "primaryColor": "#FFFFFF",
    "highlightColor": "#FF6B35",
    "strokeColor": "#000000",
    "strokeWidth": 3,
    "animation": "word-pop",
    "position": "center"
  },
  "frameConfig": {
    "aspectRatio": "9:16",
    "faceTracking": true,
    "padding": 20
  },
  "brollConfig": {
    "enabled": false
  },
  "isDefault": false
}
```

**Response (201):** Created render profile object.

---

### GET `/render-profiles`

List render profiles for the workspace.

### GET `/render-profiles/:id`

Get a single render profile.

### PATCH `/render-profiles/:id`

Update a render profile.

### DELETE `/render-profiles/:id`

Delete a render profile.

---

## 7. Account Endpoints (Fleet)

### POST `/accounts`

Connect a new social media account.

**Request:**

```json
{
  "platform": "TIKTOK",
  "platformAccountId": "user123",
  "displayName": "My TikTok",
  "credentials": {
    "apiKey": "...",
    "apiSecret": "..."
  }
}
```

**Validation:**

- `platform`: required, enum: `TIKTOK` | `INSTAGRAM` | `YOUTUBE`
- `platformAccountId`: required, string
- `credentials`: required, object (validated per platform)

**Response (201):** Created account object (credentials are never returned).

---

### GET `/accounts`

List all connected accounts in the workspace.

### GET `/accounts/:id`

Get account details with status.

### PATCH `/accounts/:id`

Update account display name or credentials.

### DELETE `/accounts/:id`

Disconnect and remove an account.

---

## 8. Cluster Endpoints (Fleet)

### POST `/clusters`

Create a new account cluster.

**Request:**

```json
{
  "name": "Tech Podcast Clips",
  "description": "Accounts dedicated to tech podcast content",
  "niche": "technology",
  "defaultRenderProfileId": "rp_def456",
  "accountIds": ["acc_001", "acc_002", "acc_003"]
}
```

**Response (201):** Created cluster with linked accounts.

---

### GET `/clusters`

List clusters with account counts.

### GET `/clusters/:id`

Get cluster details with accounts and distribution rules.

### PATCH `/clusters/:id`

Update cluster configuration.

### DELETE `/clusters/:id`

Delete a cluster (does not delete accounts).

### POST `/clusters/:id/accounts`

Add accounts to a cluster.

### DELETE `/clusters/:id/accounts/:accountId`

Remove an account from a cluster.

---

## 9. Distribution Endpoints (Fleet)

### POST `/distributions`

Schedule variations for distribution to a cluster.

**Request:**

```json
{
  "assetId": "ast_abc123",
  "clusterId": "cls_def456",
  "caption": "This moment was insane 🔥 #podcast #viral",
  "pinnedComment": "Full episode link in bio!",
  "scheduledAt": "2026-04-12T18:43:00Z"
}
```

**Validation:**

- `assetId`: required, must have `READY` variations
- `clusterId`: required, must have active accounts
- `caption`: optional, max 2200 chars
- `scheduledAt`: optional, must be in future (default: next optimal slot)

**Response (202):** List of created distribution records (one per account in cluster).

---

### GET `/distributions`

List all distributions. Filters: `status`, `accountId`, `clusterId`, date range.

### GET `/distributions/:id`

Get distribution details with platform post link.

### DELETE `/distributions/:id`

Cancel a scheduled (not yet published) distribution.

---

## 10. Job Tracking Endpoints

### GET `/jobs/:id`

Get job status and progress.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "job_xyz789",
    "queue": "ingestor-queue",
    "type": "download",
    "status": "ACTIVE",
    "progress": 65,
    "attemptsMade": 1,
    "startedAt": "2026-04-11T08:01:00Z",
    "createdAt": "2026-04-11T08:00:00Z"
  }
}
```

---

### GET `/jobs`

List recent jobs. Filters: `queue`, `status`, `type`.

---

## 11. Workspace Endpoints

### GET `/workspaces`

List user's workspaces.

### POST `/workspaces`

Create a new workspace.

### GET `/workspaces/:id`

Get workspace details.

### PATCH `/workspaces/:id`

Update workspace settings.

### POST `/workspaces/:id/members`

Invite a user to the workspace.

### DELETE `/workspaces/:id/members/:userId`

Remove a member from the workspace.

---

## 12. WebSocket Events

**Connection:** `wss://api.cipta.app/ws` with Bearer token auth.

### Server → Client Events

| Event                    | Payload                               | Description                 |
| ------------------------ | ------------------------------------- | --------------------------- |
| `job:progress`           | `{ jobId, progress, stage }`          | Job progress update (0-100) |
| `job:completed`          | `{ jobId, result }`                   | Job completed successfully  |
| `job:failed`             | `{ jobId, error }`                    | Job failed                  |
| `source:status`          | `{ sourceId, status }`                | Source status changed       |
| `asset:ready`            | `{ assetId, variations }`             | Asset render completed      |
| `distribution:published` | `{ distributionId, platformPostUrl }` | Content published           |

### Client → Server Events

| Event                 | Payload           | Description                       |
| --------------------- | ----------------- | --------------------------------- |
| `subscribe:job`       | `{ jobId }`       | Subscribe to job updates          |
| `subscribe:workspace` | `{ workspaceId }` | Subscribe to all workspace events |

---

## 13. Rate Limiting

| Scope            | Limit        | Window   |
| ---------------- | ------------ | -------- |
| Global per user  | 100 requests | 1 minute |
| Auth endpoints   | 10 requests  | 1 minute |
| Source ingestion | 20 requests  | 1 hour   |
| Render trigger   | 50 requests  | 1 hour   |

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1712822460
```
