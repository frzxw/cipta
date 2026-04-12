# Cipta — Guardian Module Specification

> **Module:** Guardian  
> **Package:** `apps/worker` (processor + services)  
> **Queues:** `guardian-queue`  
> **PRD Features:** F-005  
> **Priority:** CRITICAL — This module is the core competitive advantage  
> **Last Updated:** 2026-04-11

---

## 1. Module Overview

The Guardian ensures every video output is **cryptographically and visually unique** to bypass automated duplicate content detection on social media platforms. It generates N variations of each rendered Asset, where each variation has a completely different MD5 hash and visual fingerprint.

```
Rendered Asset → [Guardian Pipeline × N] → N Unique Variations
```

### Design Constraint

**Perceptual quality must remain identical.** All modifications must be imperceptible to the human eye/ear. Target: SSIM ≥ 0.98 between original and any variation.

---

## 2. Anti-Shadowban Techniques

### 2.1 Technique Matrix

| Technique              | Range             | Perceptible? | Hash Impact |
| ---------------------- | ----------------- | ------------ | ----------- |
| Metadata Stripping     | 100% removal      | No           | Medium      |
| Metadata Spoofing      | Device simulation | No           | Low         |
| Bitstream Jittering    | ±0.5–1.5% bitrate | No           | High        |
| Frame Zoom/Crop        | 0.3–1.0% zoom     | No           | High        |
| Color Micro-Shift      | ±1–3 units (HSL)  | No           | High        |
| Noise Overlay          | 0.5–1.5% opacity  | No           | Medium      |
| Audio Pitch Shift      | ±0.1–0.3%         | No           | High        |
| Frame Rate Micro-Shift | ±0.01 fps         | No           | Medium      |
| GOP Length Variation   | ±2–5 frames       | No           | High        |
| Start/End Trim         | ±0.1–0.5 frames   | No           | Medium      |

### 2.2 Randomization Seed

Each variation gets a unique random seed that deterministically generates all parameters. This allows reproducing a specific variation if needed.

```typescript
interface GuardianParams {
  seed: number;
  zoomPercent: number; // 0.3 - 1.0
  zoomOffsetX: number; // pixel offset, centered
  zoomOffsetY: number; // pixel offset, centered
  colorShift: {
    hue: number; // -3 to +3
    saturation: number; // -2 to +2
    brightness: number; // -1 to +1
  };
  bitrateJitterPercent: number; // -1.5 to +1.5
  noiseOpacity: number; // 0.005 to 0.015
  audioPitchShift: number; // -0.3 to +0.3 percent
  gopLength: number; // base ± 2-5
  startTrimMs: number; // 0 to 50ms
  endTrimMs: number; // 0 to 50ms
}
```

---

## 3. FFmpeg Implementation

### 3.1 Master Variation Command

```bash
ffmpeg -y \
  -ss ${START_TRIM_S} \
  -i input.mp4 \
  -t ${DURATION_MINUS_TRIMS} \
  -vf "
    # 1. Random zoom/crop
    scale=iw*${1+ZOOM_PERCENT/100}:ih*${1+ZOOM_PERCENT/100}:flags=lanczos,
    crop=1080:1920:${OFFSET_X}:${OFFSET_Y},

    # 2. Color micro-shift
    eq=brightness=${BRIGHTNESS}:saturation=${1+SATURATION/100},
    hue=h=${HUE_SHIFT},

    # 3. Invisible noise overlay
    noise=alls=${NOISE_STRENGTH}:allf=t
  " \
  # 4. Bitrate jitter
  -c:v libx264 \
  -preset medium \
  -crf ${BASE_CRF + CRF_JITTER} \
  -g ${GOP_LENGTH} \
  -bf 2 \
  # 5. Audio micro-shift
  -af "asetrate=44100*${1+PITCH_SHIFT/100},aresample=44100" \
  -c:a aac \
  -b:a ${192 * (1 + BITRATE_JITTER/100)}k \
  # 6. Clean metadata
  -map_metadata -1 \
  -fflags +bitexact \
  -flags:v +bitexact \
  -flags:a +bitexact \
  output_variation_${N}.mp4
```

### 3.2 Metadata Spoofing (Post-Encode)

After encoding, inject spoofed metadata using FFmpeg or ExifTool:

```bash
# Strip all metadata first (already done with -map_metadata -1)

# Inject device-specific metadata
ffmpeg -y \
  -i variation.mp4 \
  -c copy \
  -metadata:s:v encoder="Apple VideoToolbox" \
  -metadata creation_time="${RANDOM_PAST_DATE}" \
  -metadata:s:v handler_name="Core Media Video" \
  -metadata major_brand="isom" \
  -metadata minor_version=512 \
  -metadata compatible_brands="isomiso2avc1mp41" \
  output_spoofed.mp4
```

### 3.3 Device Profiles for Spoofing

```typescript
const DEVICE_PROFILES = [
  {
    name: 'iPhone 15 Pro',
    encoder: 'Apple VideoToolbox',
    handler: 'Core Media Video',
    majorBrand: 'isom',
    compatibleBrands: 'isomiso2avc1mp41',
    resolution: [1080, 1920],
  },
  {
    name: 'Samsung Galaxy S24',
    encoder: 'c2.exynos.h264.encoder',
    handler: 'VideoHandle',
    majorBrand: 'isom',
    compatibleBrands: 'isomiso2mp41',
    resolution: [1080, 1920],
  },
  {
    name: 'Google Pixel 8',
    encoder: 'c2.android.h264.encoder',
    handler: 'VideoHandle',
    majorBrand: 'mp42',
    compatibleBrands: 'mp42isom',
    resolution: [1080, 1920],
  },
  {
    name: 'OnePlus 12',
    encoder: 'c2.qti.avc.encoder',
    handler: 'VideoHandle',
    majorBrand: 'isom',
    compatibleBrands: 'isomiso2avc1mp41',
    resolution: [1080, 1920],
  },
];

function getRandomDeviceProfile(): DeviceProfile {
  return DEVICE_PROFILES[Math.floor(Math.random() * DEVICE_PROFILES.length)];
}
```

---

## 4. Job Definition

### 4.1 `guardian.generate-variations`

| Field       | Value                          |
| ----------- | ------------------------------ |
| Queue       | `guardian-queue`               |
| Type        | `generate-variations`          |
| Priority    | Normal                         |
| Retries     | 1                              |
| Timeout     | 30 minutes (for large batches) |
| Concurrency | 5                              |

**Payload:**

```typescript
interface VariationJobPayload {
  assetId: string;
  workspaceId: string;
  variationCount: number; // 1-100
  guardianConfig?: {
    enableMetadataSpoofing: boolean;
    enableBitstreamJitter: boolean;
    enableVisualRandomization: boolean;
    enableAudioShift: boolean;
    qualityPreset: 'conservative' | 'balanced' | 'aggressive';
  };
}
```

**Processing Steps:**

1. Download rendered Asset from Cloud Storage
2. Generate `variationCount` unique `GuardianParams` (one per seed)
3. For each variation (parallelized, max 3 concurrent FFmpeg processes):
   a. Build FFmpeg command with variation-specific params
   b. Execute render
   c. Compute MD5 hash of output file
   d. Verify hash is unique (collision = re-render with new seed)
   e. Apply metadata spoofing
   f. Upload to Cloud Storage
   g. Create `Variation` record in DB
4. Update all Variation statuses to `READY`
5. Report overall progress (variation N of M)

### 4.2 Quality Presets

| Preset         | Zoom     | Color | Noise | Bitrate | Audio |
| -------------- | -------- | ----- | ----- | ------- | ----- |
| `conservative` | 0.3-0.5% | ±1    | 0.5%  | ±0.5%   | ±0.1% |
| `balanced`     | 0.5-0.8% | ±2    | 1.0%  | ±1.0%   | ±0.2% |
| `aggressive`   | 0.8-1.0% | ±3    | 1.5%  | ±1.5%   | ±0.3% |

---

## 5. Hash Verification

### 5.1 MD5 Computation

```typescript
import { createHash } from 'crypto';
import { createReadStream } from 'fs';

async function computeMD5(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('md5');
    const stream = createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}
```

### 5.2 Collision Handling

```typescript
async function generateUniqueVariation(
  inputPath: string,
  existingHashes: Set<string>,
  maxAttempts: number = 3,
): Promise<{ outputPath: string; hash: string; params: GuardianParams }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const params = generateRandomParams(Date.now() + attempt);
    const outputPath = await renderVariation(inputPath, params);
    const hash = await computeMD5(outputPath);

    if (!existingHashes.has(hash)) {
      existingHashes.add(hash);
      return { outputPath, hash, params };
    }

    // Hash collision — extremely unlikely but handle it
    await fs.unlink(outputPath);
  }

  throw new Error('Failed to generate unique hash after max attempts');
}
```

---

## 6. Parameter Generation

```typescript
import { randomInt, randomFloat } from './utils';

function generateRandomParams(seed: number): GuardianParams {
  const rng = createSeededRNG(seed);

  return {
    seed,
    zoomPercent: rng.float(0.3, 1.0),
    zoomOffsetX: rng.int(-5, 5),
    zoomOffsetY: rng.int(-5, 5),
    colorShift: {
      hue: rng.float(-3, 3),
      saturation: rng.float(-2, 2),
      brightness: rng.float(-0.01, 0.01),
    },
    bitrateJitterPercent: rng.float(-1.5, 1.5),
    noiseOpacity: rng.float(0.005, 0.015),
    audioPitchShift: rng.float(-0.3, 0.3),
    gopLength: 250 + rng.int(-5, 5),
    startTrimMs: rng.int(0, 50),
    endTrimMs: rng.int(0, 50),
  };
}
```

---

## 7. Batch Processing Strategy

For large variation counts (50-100), process in parallel with bounded concurrency:

```typescript
import pLimit from 'p-limit';

const limit = pLimit(3); // Max 3 concurrent FFmpeg processes

async function generateBatch(
  inputPath: string,
  count: number,
  onProgress: (completed: number, total: number) => void,
): Promise<Variation[]> {
  const hashes = new Set<string>();
  const results: Variation[] = [];

  const tasks = Array.from({ length: count }, (_, i) =>
    limit(async () => {
      const variation = await generateUniqueVariation(inputPath, hashes);
      results.push(variation);
      onProgress(results.length, count);
      return variation;
    }),
  );

  await Promise.all(tasks);
  return results;
}
```

---

## 8. Testing

### 8.1 Unit Tests

| Test                                                      | Assertion                           |
| --------------------------------------------------------- | ----------------------------------- |
| Parameter generation produces values within valid ranges  | All params within defined bounds    |
| Different seeds produce different parameters              | No two param sets identical         |
| MD5 hash computation                                      | Known file → known hash             |
| FFmpeg command construction includes all variation params | Command string contains all filters |
| Device profile selection is random                        | Distribution across profiles        |

### 8.2 Integration Tests

| Test                                        | Assertion                    |
| ------------------------------------------- | ---------------------------- |
| Generate 5 variations of a test video       | 5 unique MD5 hashes          |
| SSIM between original and variation ≥ 0.98  | Quality maintained           |
| Metadata is fully stripped from output      | No original EXIF data        |
| Spoofed metadata matches a device profile   | `ffprobe` shows correct tags |
| Batch processing respects concurrency limit | Max 3 FFmpeg processes       |

### 8.3 SSIM Verification Command

```bash
ffmpeg -i original.mp4 -i variation.mp4 \
  -lavfi "ssim" -f null - 2>&1 | grep "All:"
# Expected: All:0.98xxxx (Y:0.99xxxx U:0.98xxxx V:0.98xxxx)
```
