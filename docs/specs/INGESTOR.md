# Cipta — Ingestor Module Specification

> **Module:** Ingestor  
> **Package:** `apps/api` (controller/service) + `apps/worker` (processor)  
> **Queues:** `ingestor-queue`  
> **PRD Features:** F-001, F-002, F-003  
> **Last Updated:** 2026-04-11

---

## 1. Module Overview

The Ingestor is the entry point of the content pipeline. It handles three sequential stages:

```
URL Input → Download (yt-dlp) → Transcribe (Whisper) → Analyze (LLM) → Structured Output
```

### Responsibilities

| Component | Responsibility | Runs In |
|-----------|---------------|---------|
| `IngestorController` | Accept source URLs, list sources | `apps/api` |
| `IngestorService` | Validate, persist, dispatch jobs | `apps/api` |
| `IngestorProcessor` | Execute download, transcription, analysis | `apps/worker` |
| `DownloaderService` | Wrap `yt-dlp` for media acquisition | `apps/worker` |
| `TranscriberService` | Wrap Whisper API for speech-to-text | `apps/worker` |
| `AnalyzerService` | Wrap LLM for viral spike detection | `apps/worker` |

---

## 2. Data Flow

```
┌─────────┐     ┌──────────────┐     ┌─────────────────┐
│  User   │────▶│ API          │────▶│ Redis (BullMQ)  │
│ (paste  │POST │ IngestorSvc  │add  │ ingestor-queue  │
│  URL)   │     │ Create Source │job  │                 │
└─────────┘     └──────┬───────┘     └────────┬────────┘
                       │ save                  │ consume
                       ▼                       ▼
                ┌──────────────┐     ┌─────────────────┐
                │ PostgreSQL   │     │ Worker           │
                │ sources      │◀────│ IngestorProcessor│
                │ transcripts  │save │                  │
                │ viral_spikes │     │ 1. Download      │
                └──────────────┘     │ 2. Transcribe    │
                                     │ 3. Analyze       │
                ┌──────────────┐     │                  │
                │ Cloud Storage│◀────│ Upload media     │
                │ (S3/GCS)     │     └─────────────────┘
                └──────────────┘
```

---

## 3. Job Types

### 3.1 `ingest.download`

| Field | Value |
|-------|-------|
| Queue | `ingestor-queue` |
| Type | `download` |
| Priority | Normal |
| Retries | 3 |
| Backoff | Exponential (1s, 4s, 16s) |
| Timeout | 30 minutes |

**Payload:**
```typescript
interface DownloadJobPayload {
  sourceId: string;
  workspaceId: string;
  url: string;
  quality: 'highest' | '1080p' | '720p';
}
```

**Processing Steps:**
1. Update `Source.status` → `DOWNLOADING`
2. Run `yt-dlp` to download media to temp directory
3. Extract metadata (title, duration, thumbnail, platform)
4. Upload video file to Cloud Storage
5. Upload thumbnail to Cloud Storage
6. Update `Source` record with metadata and storage paths
7. Update `Source.status` → `DOWNLOADED`
8. Dispatch `ingest.transcribe` job (chained)

### 3.2 `ingest.transcribe`

| Field | Value |
|-------|-------|
| Queue | `ingestor-queue` |
| Type | `transcribe` |
| Priority | Normal |
| Retries | 2 |
| Timeout | 15 minutes |

**Payload:**
```typescript
interface TranscribeJobPayload {
  sourceId: string;
  workspaceId: string;
  storagePath: string;
  language: string; // default: "en"
}
```

**Processing Steps:**
1. Update `Source.status` → `TRANSCRIBING`
2. Download audio from Cloud Storage (or extract from video)
3. Send to Whisper API with `response_format: verbose_json` and `timestamp_granularities: ["word"]`
4. Parse response into word-level timestamps array
5. Create `Transcript` record with structured JSON `words` field
6. Update `Transcript.status` → `COMPLETED`
7. Dispatch `ingest.analyze` job (chained)

### 3.3 `ingest.analyze`

| Field | Value |
|-------|-------|
| Queue | `ingestor-queue` |
| Type | `analyze` |
| Priority | Normal |
| Retries | 2 |
| Timeout | 5 minutes |

**Payload:**
```typescript
interface AnalyzeJobPayload {
  sourceId: string;
  workspaceId: string;
  transcriptId: string;
}
```

**Processing Steps:**
1. Update `Source.status` → `ANALYZING`
2. Load transcript text from DB
3. Call LLM with analysis prompt (see Section 5)
4. Parse LLM response into `ViralSpike[]`
5. Create `ViralSpike` records in batch
6. Update `Source.status` → `READY`

---

## 4. yt-dlp Integration

### 4.1 Command Template

```bash
yt-dlp \
  --format "bestvideo[height<=?2160]+bestaudio/best[height<=?2160]" \
  --merge-output-format mp4 \
  --write-thumbnail \
  --convert-thumbnails jpg \
  --output "%(id)s.%(ext)s" \
  --paths "/tmp/cipta/downloads/%(id)s" \
  --no-playlist \
  --no-overwrites \
  --restrict-filenames \
  --progress \
  --newline \
  --print-json \
  "${URL}"
```

### 4.2 Progress Tracking

Parse `yt-dlp` stdout for progress updates:
```
[download]  45.2% of 1.23GiB at 12.5MiB/s ETA 00:42
```

Regex: `/\[download\]\s+(\d+\.?\d*)%/`

Map to `job.updateProgress()`.

### 4.3 Platform Support

| Platform | URL Pattern | Notes |
|----------|------------|-------|
| YouTube | `youtube.com/watch?v=`, `youtu.be/` | Stable, primary target |
| TikTok | `tiktok.com/@user/video/` | May require cookies |
| Twitch | `twitch.tv/videos/`, clips | VODs and clips |
| Instagram | `instagram.com/reel/` | Requires login cookies |
| Twitter/X | `x.com/*/status/` | Requires cookies |

### 4.4 Error Handling

| Error | Action |
|-------|--------|
| `ERROR: Video unavailable` | Mark source as `FAILED`, record error |
| `ERROR: HTTP Error 429` | Retry with backoff |
| `ERROR: Unable to extract` | Retry once, then fail |
| Process timeout (30 min) | Kill process, mark `FAILED` |
| Disk space < 1GB | Reject job, alert |

---

## 5. LLM Analysis Prompt

### 5.1 System Prompt

```
You are a viral content analyst. You analyze podcast and video transcripts to identify 
segments with the highest potential to go viral on short-form social media (TikTok, 
Instagram Reels, YouTube Shorts).

Your task: Given a transcript with timestamps, identify "Viral Spikes" — segments that 
would make compelling 15-90 second clips.

Score each spike 0-100 based on: humor, controversy, emotional resonance, surprise 
factor, and retention hooks (questions, cliffhangers, bold statements).
```

### 5.2 User Prompt Template

```
Analyze this transcript and identify viral spikes:

---
TRANSCRIPT:
{transcript_text_with_timestamps}
---

Return a JSON array of viral spikes. Each spike must have:
- startTime: float (seconds)
- endTime: float (seconds)  
- confidenceScore: int (0-100)
- category: "HUMOR" | "CONTROVERSY" | "HOOK" | "EMOTIONAL" | "EDUCATIONAL"
- suggestedTitle: string (catchy, < 80 chars)
- reasoning: string (brief explanation of why this segment is viral)

Constraints:
- Minimum 5 spikes for content > 30 minutes
- Each spike: 15-90 seconds duration
- No overlapping spikes (minimum 10 second gap)
- Order by confidenceScore descending

Return ONLY valid JSON, no markdown or explanation.
```

### 5.3 Response Parsing

```typescript
interface LLMViralSpike {
  startTime: number;
  endTime: number;
  confidenceScore: number;
  category: 'HUMOR' | 'CONTROVERSY' | 'HOOK' | 'EMOTIONAL' | 'EDUCATIONAL';
  suggestedTitle: string;
  reasoning: string;
}

// Validation after parsing:
// 1. JSON.parse the response
// 2. Validate with zod schema
// 3. Filter spikes outside source duration
// 4. Resolve overlapping spikes (keep higher confidence)
// 5. Clamp confidence scores to 0-100
```

---

## 6. Transcript Data Structure

### 6.1 Word-Level Format

```json
{
  "words": [
    { "word": "And", "start": 0.0, "end": 0.28 },
    { "word": "then", "start": 0.28, "end": 0.52 },
    { "word": "he", "start": 0.52, "end": 0.68 },
    { "word": "said", "start": 0.68, "end": 1.04 },
    { "word": "something", "start": 1.04, "end": 1.56 },
    { "word": "incredible", "start": 1.56, "end": 2.24 }
  ]
}
```

### 6.2 Whisper API Configuration

```typescript
const transcriptionConfig = {
  model: 'whisper-1',
  response_format: 'verbose_json',
  timestamp_granularities: ['word'],
  language: 'en', // configurable per workspace
};
```

---

## 7. Status Transitions

```
Source Status Flow:
──────────────────
PENDING ──────► DOWNLOADING ──────► DOWNLOADED ──────► TRANSCRIBING
                    │                                       │
                    ▼                                       ▼
                  FAILED                              ANALYZING
                                                          │
                                                          ▼
                                                        READY
                                                          │
                                                          ▼ (if analysis fails)
                                                        FAILED

Transcript Status Flow:
───────────────────────
PENDING ──────► PROCESSING ──────► COMPLETED
                    │
                    ▼
                  FAILED
```

---

## 8. Configuration

### 8.1 Worker Environment Variables

```bash
# yt-dlp
YTDLP_PATH=/usr/local/bin/yt-dlp
YTDLP_COOKIES_PATH=              # Optional: path to cookies file
YTDLP_PROXY=                     # Optional: proxy URL

# Whisper
WHISPER_API_URL=https://api.openai.com/v1/audio/transcriptions
WHISPER_API_KEY=sk-...
WHISPER_MODEL=whisper-1

# LLM (Viral Analysis)
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o
LLM_MAX_TOKENS=4096
LLM_TEMPERATURE=0.3              # Low temperature for consistent analysis

# Storage
DOWNLOAD_TEMP_DIR=/tmp/cipta/downloads
MAX_DOWNLOAD_SIZE_GB=10
```

---

## 9. Testing

### 9.1 Unit Tests

| Test | File |
|------|------|
| URL validation (supported platforms) | `ingestor.service.spec.ts` |
| yt-dlp command construction | `downloader.service.spec.ts` |
| yt-dlp progress parsing | `downloader.service.spec.ts` |
| Whisper response parsing | `transcriber.service.spec.ts` |
| LLM response parsing & validation | `analyzer.service.spec.ts` |
| Overlapping spike resolution | `analyzer.service.spec.ts` |

### 9.2 Integration Tests

| Test | File |
|------|------|
| POST /sources creates source and dispatches job | `ingestor.e2e-spec.ts` |
| GET /sources returns workspace-scoped results | `ingestor.e2e-spec.ts` |
| Duplicate URL in same workspace returns 409 | `ingestor.e2e-spec.ts` |
| Full ingest pipeline (mock yt-dlp + Whisper + LLM) | `ingestor.integration-spec.ts` |
