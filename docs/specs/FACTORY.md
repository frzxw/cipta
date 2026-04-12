# Cipta — Factory Module Specification

> **Module:** Factory  
> **Package:** `apps/api` (controller/service) + `apps/worker` (processor)  
> **Queues:** `factory-queue`  
> **PRD Features:** F-004  
> **Last Updated:** 2026-04-11

---

## 1. Module Overview

The Factory is Cipta's core video production engine. It transforms raw Chunks into polished, platform-ready vertical video assets using `fluent-ffmpeg` (Node.js wrapper for FFmpeg).

```
Chunk (raw segment) → Auto-Frame → Kinetic Captions → [B-Roll] → Rendered Asset
```

### Responsibilities

| Component           | Responsibility                                  | Runs In       |
| ------------------- | ----------------------------------------------- | ------------- |
| `FactoryController` | Trigger renders, list assets                    | `apps/api`    |
| `FactoryService`    | Validate chunks, dispatch render jobs           | `apps/api`    |
| `FactoryProcessor`  | Orchestrate the render pipeline                 | `apps/worker` |
| `RendererService`   | Build and execute FFmpeg command chains         | `apps/worker` |
| `CaptionService`    | Generate ASS/SRT subtitle files from transcript | `apps/worker` |
| `FramingService`    | Calculate crop coordinates for face tracking    | `apps/worker` |

---

## 2. Render Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│                    FACTORY PIPELINE                           │
│                                                              │
│  ┌───────┐   ┌────────────┐   ┌──────────┐   ┌──────────┐  │
│  │ CHUNK │──▶│ AUTO-FRAME │──▶│ CAPTIONS │──▶│  OUTPUT  │  │
│  │ Input │   │ 16:9→9:16  │   │ Burn-in  │   │ Encode   │  │
│  └───────┘   └────────────┘   └──────────┘   └──────────┘  │
│                                                              │
│  Optional:                                                   │
│  ┌────────────┐   ┌───────────────┐                         │
│  │ B-ROLL     │   │ BRANDING      │                         │
│  │ Injection  │   │ Watermark/Logo│                         │
│  └────────────┘   └───────────────┘                         │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Job Types

### 3.1 `factory.render`

| Field       | Value             |
| ----------- | ----------------- |
| Queue       | `factory-queue`   |
| Type        | `render`          |
| Priority    | Normal            |
| Retries     | 2                 |
| Timeout     | 10 minutes        |
| Concurrency | 2 (CPU/GPU-heavy) |

**Payload:**

```typescript
interface RenderJobPayload {
  chunkId: string;
  workspaceId: string;
  renderProfileId: string;
  outputFormat: 'mp4';
  resolution: {
    width: number; // 1080
    height: number; // 1920
  };
}
```

**Processing Steps:**

1. Update `Asset.status` → `RENDERING`
2. Download chunk video from Cloud Storage to temp directory
3. Load transcript words for this chunk's time range
4. Run face detection to compute crop coordinates (frame 0, then every 2s)
5. Generate ASS subtitle file from transcript + caption style
6. Build FFmpeg filter graph (crop → scale → subtitles → encode)
7. Execute FFmpeg and track progress
8. Upload rendered asset to Cloud Storage
9. Update `Asset` with storage path, dimensions, codec, file size
10. Update `Asset.status` → `RENDERED`
11. Dispatch `guardian.generate-variations` job (if `variationCount > 0`)

---

## 4. FFmpeg Command Construction

### 4.1 Base Render Command

```bash
ffmpeg -y \
  -i input.mp4 \
  -vf "
    crop=ih*(9/16):ih:
      (iw-ih*(9/16))/2+${PAN_X}:0,
    scale=1080:1920:
      flags=lanczos,
    subtitles=captions.ass:
      force_style='FontSize=24'
  " \
  -c:v libx264 \
  -preset medium \
  -crf 18 \
  -profile:v high \
  -level 4.1 \
  -pix_fmt yuv420p \
  -c:a aac \
  -b:a 192k \
  -ar 44100 \
  -movflags +faststart \
  -r 30 \
  output.mp4
```

### 4.2 Hardware Acceleration Variants

**NVIDIA (NVENC):**

```bash
-c:v h264_nvenc \
-preset p4 \
-rc vbr \
-cq 18 \
-b:v 8M \
-maxrate 12M
```

**Apple (VideoToolbox):**

```bash
-c:v h264_videotoolbox \
-q:v 65 \
-allow_sw 1
```

**Selection Logic:**

```typescript
function getEncoder(): string {
  const hwAccel = process.env.FFMPEG_HW_ACCEL || 'auto';

  if (hwAccel === 'none') return 'libx264';
  if (hwAccel === 'nvenc') return 'h264_nvenc';
  if (hwAccel === 'videotoolbox') return 'h264_videotoolbox';

  // auto-detect
  if (hasNvenc()) return 'h264_nvenc';
  if (hasVideoToolbox()) return 'h264_videotoolbox';
  return 'libx264'; // CPU fallback
}
```

### 4.3 Performance Rules

| Rule                                               | Rationale                                |
| -------------------------------------------------- | ---------------------------------------- |
| Use `-preset medium` (CPU) or `-preset p4` (NVENC) | Balance speed/quality                    |
| Use CRF 18 (not bitrate targeting)                 | Consistent quality regardless of content |
| Use `-movflags +faststart`                         | Enables streaming before full download   |
| Use `-r 30`                                        | Normalize to 30fps for social media      |
| Use `lanczos` scaling                              | Highest quality downscale algorithm      |
| Avoid re-encoding audio when possible              | Use `-c:a copy` if input is already AAC  |
| Process one segment at a time                      | Avoid memory explosion on large files    |

---

## 5. Auto-Framing (16:9 → 9:16)

### 5.1 Strategy

1. **Face Detection:** Run lightweight face detection (using FFmpeg's `cropdetect` or a separate ML model) on keyframes
2. **Crop Calculation:** Center the crop window on the detected face(s)
3. **Dynamic Panning:** Smoothly interpolate crop position between keyframes to track subject movement
4. **Fallback:** If no face detected, center-crop the frame

### 5.2 Crop Dimensions

For 16:9 (1920×1080) input → 9:16 (1080×1920) output:

```
Crop width  = input_height × (9/16) = 1080 × 0.5625 = 607.5 → 608px
Crop height = input_height = 1080px
Scale to:     1080 × 1920
```

### 5.3 Face Tracking FFmpeg Filter

```
# Static center crop (no face tracking, simplest)
crop=ih*(9/16):ih:(iw-ih*(9/16))/2:0

# Dynamic pan with keyframes (face tracking)
crop=ih*(9/16):ih:'lerp(X1,X2,t)':0
```

For MVP: implement **static center crop** with face-detection-based X offset. Dynamic tracking is a v0.2 feature.

### 5.4 Face Detection Approach (MVP)

Use FFmpeg's built-in face detection when available, or fall back to sampling frames:

```typescript
async function detectFacePosition(
  videoPath: string,
  timestamp: number,
): Promise<{ x: number; y: number }> {
  // Extract frame at timestamp
  // Run face detection (OpenCV via opencv4nodejs, or call Python script)
  // Return center coordinates of detected face bounding box
  // Fallback: return center of frame
}
```

---

## 6. Kinetic Captions

### 6.1 Caption Styles

Captions are rendered as ASS (Advanced SubStation Alpha) subtitles burned into the video. The style is configurable via `RenderProfile.captionStyle`.

**Default Style:**

```json
{
  "fontFamily": "Montserrat",
  "fontSize": 48,
  "fontWeight": "bold",
  "primaryColor": "#FFFFFF",
  "highlightColor": "#FF6B35",
  "strokeColor": "#000000",
  "strokeWidth": 3,
  "backgroundColor": "transparent",
  "animation": "word-pop",
  "position": "center",
  "maxWordsPerLine": 5,
  "lineSpacing": 1.2
}
```

### 6.2 Animation Types

| Animation        | Description                                   | Implementation                           |
| ---------------- | --------------------------------------------- | ---------------------------------------- |
| `word-pop`       | Each word pops in one at a time               | ASS `\fad` + `\fscx` + `\fscy` transform |
| `word-highlight` | All words visible, current word changes color | ASS `\c` color override per word         |
| `karaoke`        | Standard karaoke fill effect                  | ASS `\k` tags                            |
| `bounce`         | Words bounce in with spring physics           | ASS `\move` + `\fscx` keyframes          |
| `none`           | Static subtitles, no animation                | Standard SRT-style display               |

### 6.3 ASS File Generation

```typescript
function generateASS(
  words: TranscriptWord[],
  style: CaptionStyle,
  startTime: number, // chunk start offset
  endTime: number,
): string {
  // 1. Group words into lines (max maxWordsPerLine)
  // 2. Calculate display timing for each line
  // 3. Apply animation transforms per word
  // 4. Output valid ASS script

  const header = `
[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Style: Default,${style.fontFamily},${style.fontSize},&H00${hexToASS(style.primaryColor)},&H00${hexToASS(style.highlightColor)},&H00${hexToASS(style.strokeColor)},&H00000000,${style.fontWeight === 'bold' ? -1 : 0},0,0,0,100,100,0,0,1,${style.strokeWidth},0,5,10,10,120,1

[Events]
`;
  // ... generate Dialogue lines per word group
}
```

---

## 7. Render Profile Schema

Full JSON schema for `RenderProfile` configuration:

```typescript
interface RenderProfileConfig {
  captionStyle: {
    fontFamily: string;
    fontSize: number; // 24-96px
    fontWeight: 'normal' | 'bold';
    primaryColor: string; // hex
    highlightColor: string; // hex
    strokeColor: string; // hex
    strokeWidth: number; // 0-5px
    backgroundColor: string; // hex or 'transparent'
    animation: 'word-pop' | 'word-highlight' | 'karaoke' | 'bounce' | 'none';
    position: 'top' | 'center' | 'bottom';
    maxWordsPerLine: number; // 3-8
    lineSpacing: number; // 1.0-2.0
  };

  frameConfig: {
    aspectRatio: '9:16' | '1:1' | '4:5';
    faceTracking: boolean;
    padding: number; // px around face detection box
    zoomLevel: number; // 1.0-1.5
  };

  brollConfig: {
    enabled: boolean;
    sources: string[]; // stock footage library IDs
    keywords: string[]; // contextual matching keywords
    maxDuration: number; // max B-roll clip duration (seconds)
    frequency: number; // insert every N seconds
  };

  outputConfig: {
    resolution: { width: number; height: number };
    codec: 'h264' | 'h265';
    quality: number; // CRF value (15-28)
    fps: number; // 24, 30, or 60
    audioBitrate: number; // kbps
  };
}
```

---

## 8. Progress Tracking

FFmpeg progress is parsed from stderr:

```
frame= 1234 fps= 62 q=18.0 size=   12800kB time=00:00:41.13 bitrate=2548.2kbits/s speed=2.07x
```

**Parsing Regex:**

```typescript
const progressRegex = /time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/;

function parseProgress(line: string, totalDuration: number): number {
  const match = line.match(progressRegex);
  if (!match) return -1;

  const currentTime =
    parseInt(match[1]) * 3600 +
    parseInt(match[2]) * 60 +
    parseInt(match[3]) +
    parseInt(match[4]) / 100;

  return Math.min(Math.round((currentTime / totalDuration) * 100), 100);
}
```

---

## 9. Error Handling

| Error                   | Detection                | Action                           |
| ----------------------- | ------------------------ | -------------------------------- |
| FFmpeg not found        | `which ffmpeg` fails     | Fail job, log installation guide |
| Invalid input file      | FFmpeg exits immediately | Mark FAILED, clean temp files    |
| Insufficient disk space | Pre-check before render  | Reject job, alert                |
| Font not found          | ASS render warning       | Fall back to default font        |
| GPU encoder unavailable | NVENC init failure       | Fall back to CPU (`libx264`)     |
| Process killed (OOM)    | Exit code 137            | Retry with lower concurrency     |
| Render exceeds timeout  | 10 minute limit          | Kill process, mark FAILED        |

---

## 10. Temp File Management

```
/tmp/cipta/factory/
├── {jobId}/
│   ├── input.mp4          # Downloaded chunk
│   ├── captions.ass       # Generated subtitle file
│   ├── output.mp4         # Rendered asset
│   └── frames/            # Extracted frames for face detection
│       ├── frame_000.jpg
│       ├── frame_002.jpg
│       └── ...
```

**Cleanup:** Delete `{jobId}/` directory after successful upload to Cloud Storage, or after 24 hours if job failed.

---

## 11. Testing

### 11.1 Unit Tests

| Test                        | File                       |
| --------------------------- | -------------------------- |
| FFmpeg command construction | `renderer.service.spec.ts` |
| ASS subtitle generation     | `caption.service.spec.ts`  |
| Crop coordinate calculation | `framing.service.spec.ts`  |
| Progress parsing            | `renderer.service.spec.ts` |
| HW acceleration detection   | `renderer.service.spec.ts` |

### 11.2 Integration Tests

| Test                                 | File                          |
| ------------------------------------ | ----------------------------- |
| Full render pipeline with test video | `factory.integration-spec.ts` |
| Render with different caption styles | `factory.integration-spec.ts` |
| GPU fallback to CPU                  | `factory.integration-spec.ts` |
