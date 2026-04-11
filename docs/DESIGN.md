# Cipta — UI/UX Design System

> **Version:** 0.1.0-alpha  
> **Framework:** Next.js (App Router) + Tailwind CSS v4 + ShadcnUI  
> **Package:** `apps/web`  
> **Last Updated:** 2026-04-11

---

## 1. Design Philosophy

Cipta's dashboard ("Control Tower") is a **command center** — dense, data-rich, and immersive. Users manage high-volume content pipelines, so the UI must feel:

| Principle | Implementation |
|-----------|---------------|
| **Information Density** | Multi-panel layouts, compact tables, collapsible sections |
| **Real-Time Awareness** | Live progress bars, status badges, streaming job logs |
| **Dark-First** | Default dark theme; light theme optional |
| **Keyboard-Driven** | Power users navigate with shortcuts (⌘K command palette) |
| **Pipeline Clarity** | Visual pipeline flow: Source → Chunk → Asset → Distribution |

---

## 2. Color System

### 2.1 Brand Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--brand-primary` | `hsl(25, 95%, 53%)` | `#F97316` — Primary actions, active states |
| `--brand-primary-hover` | `hsl(25, 95%, 45%)` | Hover state of primary |
| `--brand-secondary` | `hsl(262, 83%, 58%)` | `#8B5CF6` — Secondary accents, AI indicators |
| `--brand-accent` | `hsl(173, 80%, 40%)` | `#14B8A6` — Success states, positive metrics |

### 2.2 Dark Theme (Default)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `hsl(224, 20%, 6%)` | `#0D0F14` — App background |
| `--bg-surface` | `hsl(224, 18%, 10%)` | `#151820` — Cards, panels |
| `--bg-elevated` | `hsl(224, 16%, 14%)` | `#1E2028` — Modals, dropdowns |
| `--bg-hover` | `hsl(224, 14%, 18%)` | `#282A34` — Hover backgrounds |
| `--border-default` | `hsl(224, 12%, 20%)` | `#2E3040` — Borders, dividers |
| `--border-subtle` | `hsl(224, 10%, 16%)` | `#262830` — Subtle dividers |
| `--text-primary` | `hsl(220, 20%, 95%)` | `#F0F2F7` — Primary text |
| `--text-secondary` | `hsl(220, 12%, 65%)` | `#9CA3B4` — Secondary text |
| `--text-muted` | `hsl(220, 8%, 45%)` | `#6B7280` — Muted text, labels |

### 2.3 Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--status-success` | `hsl(142, 71%, 45%)` | `#22C55E` — Completed, published |
| `--status-warning` | `hsl(38, 92%, 50%)` | `#F59E0B` — Rate limited, degraded |
| `--status-error` | `hsl(0, 84%, 60%)` | `#EF4444` — Failed, error states |
| `--status-info` | `hsl(217, 91%, 60%)` | `#3B82F6` — Processing, info |
| `--status-pending` | `hsl(220, 8%, 50%)` | `#808894` — Queued, waiting |

---

## 3. Typography

### 3.1 Font Stack

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
```

Load via Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### 3.2 Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `--text-display` | 32px / 2rem | 700 | 1.2 | Page titles |
| `--text-h1` | 24px / 1.5rem | 700 | 1.3 | Section headers |
| `--text-h2` | 20px / 1.25rem | 600 | 1.35 | Subsection headers |
| `--text-h3` | 16px / 1rem | 600 | 1.4 | Card titles |
| `--text-body` | 14px / 0.875rem | 400 | 1.5 | Body text |
| `--text-small` | 12px / 0.75rem | 500 | 1.4 | Labels, captions |
| `--text-micro` | 11px / 0.6875rem | 500 | 1.3 | Badges, timestamps |

---

## 4. Spacing & Layout

### 4.1 Spacing Scale

```css
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;
--space-4: 16px;  --space-5: 20px;  --space-6: 24px;
--space-8: 32px;  --space-10: 40px; --space-12: 48px;
--space-16: 64px;
```

### 4.2 Border Radius

```css
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 12px;
--radius-full: 9999px;
```

### 4.3 Dashboard Layout

```
┌──────────────────────────────────────────────────────────┐
│ TOPBAR (h: 48px)                                         │
│ Logo │ Search (⌘K) │ Notifications │ Workspace │ Avatar  │
├────────┬─────────────────────────────────────────────────┤
│        │                                                 │
│ SIDE   │  MAIN CONTENT                                  │
│ BAR    │                                                 │
│        │  ┌─────────────────────────────────────────┐   │
│ w:240px│  │  Page Header + Actions                  │   │
│        │  └─────────────────────────────────────────┘   │
│ nav    │                                                 │
│ items  │  ┌─────────────────────────────────────────┐   │
│        │  │  Primary Content Area                   │   │
│ ───────│  │  (Tables, Cards, Pipeline Visualization)│   │
│        │  │                                         │   │
│ Quick  │  └─────────────────────────────────────────┘   │
│ Stats  │                                                 │
│        │  ┌───────────────┐  ┌───────────────────────┐  │
│        │  │ Secondary     │  │ Activity Feed /       │  │
│        │  │ Panel         │  │ Job Monitor           │  │
│        │  └───────────────┘  └───────────────────────┘  │
└────────┴─────────────────────────────────────────────────┘
```

**Sidebar Navigation Items:**
1. 🏠 Dashboard (overview)
2. 📥 Sources (ingestor)
3. 🎬 Factory (production)
4. 🛡️ Assets (gallery)
5. 🚀 Fleet (distribution)
6. 📊 Analytics
7. ⚙️ Settings

---

## 5. Component Library

Built on **ShadcnUI** with Cipta theming. Key components:

### 5.1 Status Badge

Displays pipeline stage status. Used everywhere.

| Status | Color | Icon |
|--------|-------|------|
| `PENDING` | `--status-pending` | ⏳ Clock |
| `ACTIVE` / `PROCESSING` | `--status-info` | ⚡ Spinner |
| `COMPLETED` / `READY` | `--status-success` | ✅ Check |
| `FAILED` | `--status-error` | ❌ X |
| `RATE_LIMITED` | `--status-warning` | ⚠️ Warning |

### 5.2 Pipeline Progress Card

Visual tracker showing the stage of a Source through the pipeline:

```
┌──────────────┐
│  Source → Transcript → Spikes → Chunks → Assets → Distributed  │
│   [✅]      [✅]         [⚡]     [—]      [—]       [—]        │
│                          65%                                     │
└──────────────┘
```

### 5.3 Job Monitor Panel

Collapsible bottom panel showing active BullMQ job progress:

```
┌────────────────────────────────────────────────────────────────┐
│  🏭 Active Jobs (3)                                    [▽ ▴]  │
├────────────────────────────────────────────────────────────────┤
│  ⚡ Downloading "Podcast Ep.42"        ████████░░░  78%       │
│  ⚡ Rendering Chunk #chk_a3f           █████░░░░░░  45%       │
│  ⏳ Queued: Generate 10 Variations      ░░░░░░░░░░   0%       │
└────────────────────────────────────────────────────────────────┘
```

### 5.4 Video Preview Card

Thumbnail with hover-to-play preview, metadata overlay, and quick actions.

```
┌──────────────────────┐
│  ┌──────────────────┐│
│  │                  ││
│  │  Video Preview   ││
│  │  0:45 | 1080p    ││
│  │     ▶ Play       ││
│  └──────────────────┘│
│  "When he realized.."│
│  12 variations | ✅   │
│  [Distribute] [Edit] │
└──────────────────────┘
```

### 5.5 Source Input Widget

URL input with platform auto-detection and instant preview.

```
┌────────────────────────────────────────────────────────┐
│  🔗 Paste a URL to start                              │
│  ┌──────────────────────────────────────────────────┐ │
│  │ https://youtube.com/watch?v=...                  │ │
│  └──────────────────────────────────────────────────┘ │
│  ▶ YouTube detected │ Quality: [Highest ▾] │ [Ingest] │
└────────────────────────────────────────────────────────┘
```

---

## 6. Page Specifications

### 6.1 Dashboard (Home)

**Route:** `/`

**Content:**
- Pipeline overview stats (Sources → Chunks → Assets → Distributions today)
- Active jobs monitor
- Recent activity feed
- Quick-action cards (New Source, Quick Distribute)

### 6.2 Sources Page

**Route:** `/sources`

**Content:**
- Table: All sources with status, platform icon, duration, date
- Filter: status, platform, date range
- Click-through to Source detail (transcript viewer, spike review)

### 6.3 Source Detail Page

**Route:** `/sources/[id]`

**Content:**
- Video player (embedded)
- Interactive transcript viewer with spike highlighting
- Spike approval/rejection UI
- Chunk generation trigger

### 6.4 Factory Page

**Route:** `/factory`

**Content:**
- Queue of chunks awaiting rendering
- Active render jobs with progress
- Render profile selector
- Batch render trigger

### 6.5 Assets Gallery

**Route:** `/assets`

**Content:**
- Grid/list toggle view of rendered assets
- Variation count badges
- Bulk selection for distribution
- Preview modal with video player

### 6.6 Fleet Page

**Route:** `/fleet`

**Content:**
- Account list with status indicators
- Cluster management (create, edit, assign accounts)
- Distribution calendar view
- Distribution history with analytics

### 6.7 Settings Page

**Route:** `/settings`

**Content:**
- Workspace settings (name, slug, plan)
- Member management (invite, role assignment)
- Default render profile configuration
- API key management
- Notification preferences

---

## 7. Animation & Micro-Interactions

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Page transitions | Fade + slide up | 200ms | `ease-out` |
| Status badge change | Color morph + pulse | 300ms | `ease-in-out` |
| Progress bar update | Smooth width transition | 500ms | `linear` |
| Card hover | Subtle lift (translateY -2px) + border glow | 150ms | `ease-out` |
| Modal open | Backdrop fade + scale from 0.95 | 200ms | `ease-out` |
| Toast notification | Slide in from right | 300ms | `spring` |
| Sidebar collapse | Width transition | 200ms | `ease-in-out` |
| Loading skeleton | Shimmer pulse | 1500ms | `infinite ease-in-out` |

---

## 8. Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| `mobile` | < 768px | Sidebar becomes bottom nav; single column |
| `tablet` | 768px – 1024px | Collapsible sidebar; 2-column grid |
| `desktop` | 1024px – 1440px | Full sidebar; 3-column grid |
| `wide` | > 1440px | Full sidebar; 4-column grid; side panels |

---

## 9. Accessibility

| Requirement | Implementation |
|-------------|---------------|
| Color contrast | WCAG AA minimum (4.5:1 for text, 3:1 for UI) |
| Keyboard navigation | All interactive elements focusable, visible focus ring |
| Screen reader | Semantic HTML, ARIA labels on icons/badges |
| Motion preference | Respect `prefers-reduced-motion` — disable animations |
| Focus management | Trap focus in modals, restore on close |

---

## 10. Iconography

**Library:** Lucide React (consistent with ShadcnUI)

**Custom icons (if needed):** SVG, 24x24 viewport, 1.5px stroke, rounded line caps.

| Concept | Icon |
|---------|------|
| Source / Ingest | `Download` |
| Transcript | `FileText` |
| Viral Spike | `Zap` |
| Chunk | `Scissors` |
| Asset | `Film` |
| Variation | `Copy` |
| Distribution | `Send` |
| Cluster | `Server` |
| Account | `User` |
| Settings | `Settings` |
| Guardian | `Shield` |
