---
name: Scaffold Dashboard Page
description: >
  Create a new Next.js App Router page with layout, loading, and error boundaries.
  Use when the user says "create a page", "add a dashboard page", "scaffold a route",
  "new page for <feature>", or "add a frontend view".
---

# Scaffold Dashboard Page

Creates a new Next.js App Router page inside `apps/web/` with all required boundary files.

## Trigger

User asks to add a new page or route to the Control Tower dashboard.

## Required Input

- **Route path** (e.g., `sources`, `fleet/clusters`, `settings`)
- **Page title** (e.g., "Sources", "Cluster Management", "Settings")
- **Data source**: which API endpoint(s) this page fetches from
- **Layout group**: `(auth)` or `(dashboard)`

## Steps

### 1. Create page directory

Create the route under `apps/web/app/(dashboard)/{route}/`:

```
{route}/
├── page.tsx        # Main page component (Server Component)
├── loading.tsx     # Skeleton loader
└── error.tsx       # Error boundary (Client Component)
```

### 2. Generate `page.tsx`

- Use a **Server Component** by default (no `'use client'`).
- Fetch initial data using `fetch()` with the API base URL.
- Include proper `<title>` and metadata via `export const metadata`.
- Use ShadcnUI components for layout (Card, Table, Badge, Button, etc.).
- Use the design tokens from `docs/DESIGN.md §2` (dark-first, brand colors).
- Use Lucide icons for entity concepts (see frontend-conventions rule for icon map).

### 3. Generate `loading.tsx`

- Return a skeleton layout matching the page structure.
- Use ShadcnUI `Skeleton` component.
- Animate with `1500ms ease-in-out infinite`.

### 4. Generate `error.tsx`

- Must be a Client Component (`'use client'`).
- Display error message with a retry button.
- Use `useEffect` to log the error.
- Provide `reset()` function from the error boundary props.

### 5. Add navigation link

Add the page to the sidebar navigation in the dashboard layout component.
Use the correct Lucide icon for the concept.

### 6. Verify build

// turbo
```
pnpm --filter web build
```

### 7. Verify visually

Start the dev server and navigate to the new page:

// turbo
```
pnpm --filter web dev
```

## Expected Output

A new dashboard page with loading skeleton, error boundary, sidebar navigation link, and correct data fetching, building successfully.
