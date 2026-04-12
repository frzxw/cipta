---
name: frontend-conventions
description: >
  Load when writing or modifying code in apps/web (Next.js Control Tower dashboard).
  Enforces the design system, component patterns, color tokens, typography, layout,
  and responsive breakpoints. Triggers on: React component creation, CSS/Tailwind usage,
  page creation, ShadcnUI usage, dashboard layout, animation, accessibility.
---

# Frontend Conventions (apps/web)

## 1. Framework & Tooling

- **Framework:** Next.js with App Router.
- **CSS:** Tailwind CSS v4.
- **Components:** ShadcnUI (Cipta-themed).
- **Icons:** Lucide React.
- **Fonts:** Inter (sans-serif), JetBrains Mono (monospace) via Google Fonts.
- **State:** React Query for server state, React context for client state.

## 2. Server/Client Component Rules

- Use **Server Components** by default. Only add `'use client'` when interactivity is needed.
- Fetch initial data in Server Components using `fetch()` — no client-side fetching for initial loads.
- Every route must have `loading.tsx` (skeleton) and `error.tsx` (error boundary).
- Use ShadcnUI components for all UI primitives — no custom primitives unless ShadcnUI lacks it.

## 3. Route Structure

```
app/
├── (auth)/         # Login, Register (route group — no sidebar)
├── (dashboard)/    # Main dashboard (route group — with sidebar)
│   ├── sources/    # Source management
│   ├── factory/    # Video production queue
│   ├── assets/     # Asset gallery
│   ├── fleet/      # Account & cluster management, distribution
│   └── settings/   # Workspace settings
├── layout.tsx      # Root layout
└── page.tsx        # Dashboard home (overview)
```

## 4. Design Philosophy

The "Control Tower" is a **command center** — dense, data-rich, and immersive:
- **Dark-First** — default dark theme, optional light.
- **Information Density** — multi-panel layouts, compact tables, collapsible sections.
- **Real-Time Awareness** — live progress bars, status badges, streaming job logs.
- **Keyboard-Driven** — power users navigate with ⌘K command palette.
- **Pipeline Clarity** — visual flow: Source → Chunk → Asset → Distribution.

## 5. Color System

### Brand Colors
| Token | Value |
|-------|-------|
| `--brand-primary` | `hsl(25, 95%, 53%)` — `#F97316` |
| `--brand-secondary` | `hsl(262, 83%, 58%)` — `#8B5CF6` |
| `--brand-accent` | `hsl(173, 80%, 40%)` — `#14B8A6` |

### Dark Theme (Default)
| Token | Value |
|-------|-------|
| `--bg-base` | `hsl(224, 20%, 6%)` — `#0D0F14` |
| `--bg-surface` | `hsl(224, 18%, 10%)` — `#151820` |
| `--bg-elevated` | `hsl(224, 16%, 14%)` — `#1E2028` |
| `--text-primary` | `hsl(220, 20%, 95%)` — `#F0F2F7` |
| `--text-secondary` | `hsl(220, 12%, 65%)` — `#9CA3B4` |

### Semantic Status Colors
| Status | Color |
|--------|-------|
| Success/Completed | `#22C55E` |
| Warning/Rate-limited | `#F59E0B` |
| Error/Failed | `#EF4444` |
| Info/Processing | `#3B82F6` |
| Pending/Queued | `#808894` |

## 6. Typography

- Sans: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Mono: `'JetBrains Mono', 'Fira Code', monospace`
- Body: 14px / 0.875rem, weight 400
- Headings: Use the type scale defined in `docs/DESIGN.md §3.2`

## 7. Layout

- **Topbar:** 48px height — Logo, Search (⌘K), Notifications, Workspace, Avatar.
- **Sidebar:** 240px width — collapsible. Items: Dashboard, Sources, Factory, Assets, Fleet, Analytics, Settings.
- **Main Content:** remaining width with padding.
- **Job Monitor Panel:** collapsible bottom panel showing active BullMQ jobs.

## 8. Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Sidebar → bottom nav, single column |
| Tablet | 768–1024px | Collapsible sidebar, 2-column grid |
| Desktop | 1024–1440px | Full sidebar, 3-column grid |
| Wide | > 1440px | Full sidebar, 4-column grid, side panels |

## 9. Animations

| Element | Duration | Easing |
|---------|----------|--------|
| Page transitions | 200ms | `ease-out` |
| Status badge change | 300ms | `ease-in-out` |
| Progress bar | 500ms | `linear` |
| Card hover | 150ms | `ease-out` |
| Modal open | 200ms | `ease-out` |
| Toast notification | 300ms | `spring` |
| Loading skeleton | 1500ms | `infinite ease-in-out` |

Always respect `prefers-reduced-motion` — disable animations when set.

## 10. Accessibility

- WCAG AA color contrast minimum (4.5:1 for text, 3:1 for UI components).
- All interactive elements must be keyboard-focusable with visible focus rings.
- Semantic HTML + ARIA labels on icon-only buttons and badges.
- Trap focus in modals, restore on close.

## 11. Icon Mapping

| Concept | Lucide Icon |
|---------|------------|
| Source/Ingest | `Download` |
| Transcript | `FileText` |
| Viral Spike | `Zap` |
| Chunk | `Scissors` |
| Asset | `Film` |
| Variation | `Copy` |
| Distribution | `Send` |
| Cluster | `Server` |
| Account | `User` |
| Guardian | `Shield` |
