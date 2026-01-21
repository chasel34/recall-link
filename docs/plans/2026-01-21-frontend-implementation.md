# Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a modern, type-safe React web interface for Recall Link with TanStack Router, TanStack Query, and shadcn/ui components.

**Architecture:** File-based routing with TanStack Router for type-safe navigation, TanStack Query for server state management with automatic caching and invalidation, shadcn/ui components styled with Tailwind CSS for consistent UI, and Zustand for minimal client-side state (sidebar collapse).

**Tech Stack:** React 18, TypeScript, Vite, TanStack Router, TanStack Query, shadcn/ui, Tailwind CSS, Zustand, Zod

---

## Task 1: Initialize Vite React Project

**Files:**
- Create: `apps/web/` (new directory)
- Create: `apps/web/package.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/.env.example`

**Step 1: Create web app directory**

Run: `mkdir -p apps/web/src`

**Step 2: Initialize package.json with dependencies**

Create `apps/web/package.json`:

```json
{
  "name": "@recall-link/web",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.84.1",
    "@tanstack/react-router": "^1.114.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zod": "^3.24.1",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.3",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^4.1.3",
    "typescript": "^5.7.3",
    "vite": "^6.0.11"
  }
}
```

**Step 3: Create Vite configuration with path aliases**

Create `apps/web/vite.config.ts`:

```typescript
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
})
```

**Step 4: Create TypeScript configuration**

Create `apps/web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `apps/web/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

**Step 5: Create HTML entry point**

Create `apps/web/index.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Recall Link</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 6: Create React entry point**

Create `apps/web/src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**Step 7: Create minimal App component**

Create `apps/web/src/App.tsx`:

```tsx
function App() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Recall Link</h1>
      <p className="text-gray-600">Loading...</p>
    </div>
  )
}

export default App
```

**Step 8: Create Tailwind CSS file**

Create `apps/web/src/index.css`:

```css
@import "tailwindcss";
```

**Step 9: Create environment variable example**

Create `apps/web/.env.example`:

```env
VITE_API_URL=http://localhost:8787
```

Create `apps/web/.env`:

```env
VITE_API_URL=http://localhost:8787
```

**Step 10: Add .gitignore entries**

Create `apps/web/.gitignore`:

```
# Dependencies
node_modules

# Build output
dist

# Environment
.env
.env.local

# Editor
.DS_Store
```

**Step 11: Install dependencies**

Run: `cd apps/web && pnpm install`

**Step 12: Test dev server**

Run: `pnpm dev`
Expected: Server starts on http://localhost:3000, shows "Recall Link" heading

**Step 13: Commit**

```bash
git add apps/web
git commit -m "feat(web): initialize Vite React project with TypeScript and Tailwind

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Install and Configure shadcn/ui

**Files:**
- Create: `apps/web/components.json`
- Create: `apps/web/src/lib/utils.ts`
- Modify: `apps/web/tailwind.config.ts`

**Step 1: Initialize shadcn/ui configuration**

Run: `cd apps/web && npx shadcn@latest init`

When prompted:
- Style: Default
- Base color: Zinc
- CSS variables: Yes
- TypeScript: Yes
- Import alias: @

This creates `components.json` automatically.

**Step 2: Verify utils.ts was created**

Check file exists: `apps/web/src/lib/utils.ts`

Expected content (created by shadcn):

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Step 3: Install core UI components**

Run: `npx shadcn@latest add sidebar button card input dialog alert alert-dialog toast skeleton badge`

Expected: Components installed to `apps/web/src/components/ui/`

**Step 4: Verify component files exist**

Run: `ls src/components/ui/`

Expected output:
```
sidebar.tsx
button.tsx
card.tsx
input.tsx
dialog.tsx
alert.tsx
alert-dialog.tsx
toast.tsx
skeleton.tsx
badge.tsx
```

**Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): configure shadcn/ui and install core components

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Set Up Backend Search API

**Files:**
- Create: `apps/api/src/features/items/items.search.ts`
- Modify: `apps/api/src/features/items/items.route.ts`
- Create: `apps/api/src/features/items/items.search.test.ts`

**Step 1: Write failing test for search function**

Create `apps/api/src/features/items/items.search.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { searchItems } from './items.search.js'

describe('searchItems', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')

    // Create tables
    db.exec(`
      CREATE TABLE items (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        url_normalized TEXT NOT NULL UNIQUE,
        domain TEXT,
        title TEXT,
        summary TEXT,
        clean_text TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE VIRTUAL TABLE items_fts USING fts5(
        title, summary, clean_text,
        content='items',
        content_rowid='rowid'
      );
    `)
  })

  it('should search items by query string', () => {
    // Insert test data
    db.prepare(`
      INSERT INTO items (id, url, url_normalized, domain, title, summary, clean_text, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'item_1',
      'https://example.com/react',
      'https://example.com/react',
      'example.com',
      'React Tutorial',
      'Learn React hooks',
      'React hooks are powerful',
      'completed',
      '2024-01-20T10:00:00Z',
      '2024-01-20T10:00:00Z'
    )

    // Sync FTS
    db.exec(`
      INSERT INTO items_fts (rowid, title, summary, clean_text)
      SELECT rowid, title, summary, clean_text FROM items WHERE id = 'item_1'
    `)

    const result = searchItems(db, 'react', { limit: 20, offset: 0 })

    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('item_1')
    expect(result.total).toBe(1)
  })

  it('should return empty result when no matches', () => {
    const result = searchItems(db, 'nonexistent', { limit: 20, offset: 0 })

    expect(result.items).toHaveLength(0)
    expect(result.total).toBe(0)
  })

  it('should support pagination', () => {
    // Insert multiple items
    for (let i = 1; i <= 5; i++) {
      db.prepare(`
        INSERT INTO items (id, url, url_normalized, domain, title, summary, clean_text, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `item_${i}`,
        `https://example.com/${i}`,
        `https://example.com/${i}`,
        'example.com',
        `Test ${i}`,
        'Test summary',
        'Test content',
        'completed',
        '2024-01-20T10:00:00Z',
        '2024-01-20T10:00:00Z'
      )

      db.exec(`
        INSERT INTO items_fts (rowid, title, summary, clean_text)
        SELECT rowid, title, summary, clean_text FROM items WHERE id = 'item_${i}'
      `)
    }

    const result = searchItems(db, 'test', { limit: 2, offset: 2 })

    expect(result.items).toHaveLength(2)
    expect(result.total).toBe(5)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pnpm test items.search.test.ts`

Expected: FAIL - "searchItems is not defined"

**Step 3: Implement search function**

Create `apps/api/src/features/items/items.search.ts`:

```typescript
import type Database from 'better-sqlite3'

export interface SearchFilters {
  limit?: number
  offset?: number
}

export interface SearchResult {
  items: Array<{
    id: string
    url: string
    domain: string | null
    title: string | null
    summary: string | null
    status: string
    created_at: string
  }>
  total: number
}

export function searchItems(
  db: Database.Database,
  query: string,
  filters: SearchFilters = {}
): SearchResult {
  const limit = filters.limit ?? 20
  const offset = filters.offset ?? 0

  // Search using FTS5
  const items = db
    .prepare(
      `
      SELECT i.id, i.url, i.domain, i.title, i.summary, i.status, i.created_at
      FROM items i
      JOIN items_fts fts ON i.rowid = fts.rowid
      WHERE items_fts MATCH ?
      ORDER BY rank
      LIMIT ? OFFSET ?
      `
    )
    .all(query, limit, offset) as SearchResult['items']

  // Get total count
  const countResult = db
    .prepare(
      `
      SELECT COUNT(*) as count
      FROM items_fts
      WHERE items_fts MATCH ?
      `
    )
    .get(query) as { count: number }

  return {
    items,
    total: countResult.count,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test items.search.test.ts`

Expected: PASS - All 3 tests pass

**Step 5: Add search endpoint to items route**

Modify `apps/api/src/features/items/items.route.ts`:

Add import at top:
```typescript
import { searchItems } from './items.search.js'
```

Update the GET / handler (around line 65-96) to handle search:

```typescript
itemsApp.get('/', zValidator('query', listItemsQuerySchema), (c) => {
  try {
    const db = getDb()
    const filters = c.req.valid('query')

    let result

    // Handle search query
    if (filters.q) {
      result = searchItems(db, filters.q, filters)
    } else if (filters.tags) {
      const tagNames = filters.tags.split(',').map((tag) => tag.trim())
      result = listItemsByTags(db, tagNames, filters)
    } else {
      result = listItems(db, filters)
    }

    const itemsWithTags = result.items.map((item) => ({
      ...item,
      tags: getItemTags(db, item.id),
    }))

    return c.json({
      items: itemsWithTags,
      total: result.total,
      limit: filters.limit ?? 20,
      offset: filters.offset ?? 0,
    })
  } catch (error) {
    console.error('[GET /items] Error:', error)
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to list items',
      },
      500
    )
  }
})
```

**Step 6: Update schema to include search query**

Modify `apps/api/src/features/items/items.schema.ts`:

Find `listItemsQuerySchema` and add `q` field:

```typescript
export const listItemsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
  tags: z.string().optional(),
  q: z.string().optional(), // Add this line
})
```

**Step 7: Test the search API**

Run: `cd apps/api && pnpm dev`

In another terminal:
```bash
# Create a test item
curl -X POST http://localhost:8787/api/items \
  -H "Content-Type: application/json" \
  -d '{"url": "https://react.dev"}'

# Wait for fetch job to complete, then search
curl "http://localhost:8787/api/items?q=react"
```

Expected: Returns matching items with search results

**Step 8: Commit**

```bash
git add apps/api/src/features/items
git commit -m "feat(api): implement full-text search for items

- Add searchItems function using SQLite FTS5
- Update GET /items to support ?q= query parameter
- Add comprehensive search tests

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Set Up TanStack Router

**Files:**
- Create: `apps/web/src/routes/__root.tsx`
- Create: `apps/web/src/routes/index.tsx`
- Create: `apps/web/src/routes/items/index.tsx`
- Create: `apps/web/src/routes/items/$id.tsx`
- Create: `apps/web/src/routes/items/tags/$tag.tsx`
- Create: `apps/web/src/routeTree.gen.ts` (generated)
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/App.tsx`

**Step 1: Install TanStack Router devtools**

Run: `cd apps/web && pnpm add -D @tanstack/router-devtools @tanstack/router-plugin`

**Step 2: Update Vite config to enable router plugin**

Modify `apps/web/vite.config.ts`:

```typescript
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [TanStackRouterVite(), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
})
```

**Step 3: Create root route**

Create `apps/web/src/routes/__root.tsx`:

```tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export const Route = createRootRoute({
  component: () => (
    <>
      <div className="min-h-screen bg-background">
        <Outlet />
      </div>
      <TanStackRouterDevtools />
    </>
  ),
})
```

**Step 4: Create home index route**

Create `apps/web/src/routes/index.tsx`:

```tsx
import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => <Navigate to="/items" />,
})
```

**Step 5: Create items index route**

Create `apps/web/src/routes/items/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const itemsSearchSchema = z.object({
  q: z.string().optional(),
  page: z.number().int().positive().optional(),
})

export const Route = createFileRoute('/items/')({
  validateSearch: itemsSearchSchema,
  component: ItemsPage,
})

function ItemsPage() {
  const search = Route.useSearch()

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Items</h1>
      <p className="text-gray-600">
        Search: {search.q || 'None'}, Page: {search.page || 1}
      </p>
    </div>
  )
}
```

**Step 6: Create item detail route**

Create `apps/web/src/routes/items/$id.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/items/$id')({
  component: ItemDetailPage,
})

function ItemDetailPage() {
  const { id } = Route.useParams()

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Item Detail</h1>
      <p className="text-gray-600">Item ID: {id}</p>
    </div>
  )
}
```

**Step 7: Create tag filter route**

Create `apps/web/src/routes/items/tags/$tag.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/items/tags/$tag')({
  component: TagItemsPage,
})

function TagItemsPage() {
  const { tag } = Route.useParams()

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Items Tagged: {tag}</h1>
    </div>
  )
}
```

**Step 8: Update main.tsx with router**

Modify `apps/web/src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './index.css'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
```

**Step 9: Delete old App.tsx**

Run: `rm apps/web/src/App.tsx`

**Step 10: Test routing**

Run: `cd apps/web && pnpm dev`

Visit:
- http://localhost:3000/ (redirects to /items)
- http://localhost:3000/items
- http://localhost:3000/items/123
- http://localhost:3000/items/tags/react

Expected: Each route displays correct page with params

**Step 11: Commit**

```bash
git add apps/web
git commit -m "feat(web): set up TanStack Router with file-based routing

- Configure router plugin for automatic route generation
- Create root layout route
- Add items list, detail, and tag filter routes
- Enable type-safe search params and route params

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Set Up TanStack Query and API Client

**Files:**
- Create: `apps/web/src/lib/api-client.ts`
- Create: `apps/web/src/lib/query-client.ts`
- Create: `apps/web/src/hooks/use-items.ts`
- Create: `apps/web/src/hooks/use-item.ts`
- Create: `apps/web/src/hooks/use-tags.ts`
- Modify: `apps/web/src/main.tsx`

**Step 1: Create API client**

Create `apps/web/src/lib/api-client.ts`:

```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export interface Item {
  id: string
  url: string
  domain: string | null
  title: string | null
  summary: string | null
  clean_text: string | null
  status: 'pending' | 'completed' | 'failed'
  tags: string[]
  created_at: string
  updated_at: string
}

export interface ListItemsParams {
  tags?: string
  q?: string
  page?: number
  limit?: number
  offset?: number
}

export interface ListItemsResponse {
  items: Item[]
  total: number
  limit: number
  offset: number
}

export interface Tag {
  tag: string
  count: number
}

export interface UpdateItemDto {
  summary?: string
  tags?: string[]
  note?: string
}

class ApiClient {
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  async listItems(params: ListItemsParams = {}): Promise<ListItemsResponse> {
    const searchParams = new URLSearchParams()

    if (params.tags) searchParams.set('tags', params.tags)
    if (params.q) searchParams.set('q', params.q)
    if (params.limit) searchParams.set('limit', params.limit.toString())
    if (params.offset) searchParams.set('offset', params.offset.toString())

    const query = searchParams.toString()
    return this.request<ListItemsResponse>(`/api/items${query ? `?${query}` : ''}`)
  }

  async getItem(id: string): Promise<Item> {
    return this.request<Item>(`/api/items/${id}`)
  }

  async createItem(url: string): Promise<Item> {
    return this.request<Item>('/api/items', {
      method: 'POST',
      body: JSON.stringify({ url }),
    })
  }

  async updateItem(id: string, data: UpdateItemDto): Promise<Item> {
    return this.request<Item>(`/api/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteItem(id: string): Promise<void> {
    await this.request<void>(`/api/items/${id}`, {
      method: 'DELETE',
    })
  }

  async listTags(): Promise<Tag[]> {
    const response = await this.request<{ tags: Tag[] }>('/api/tags')
    return response.tags
  }
}

export const apiClient = new ApiClient()
```

**Step 2: Create Query Client configuration**

Create `apps/web/src/lib/query-client.ts`:

```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
```

**Step 3: Create useItems hook**

Create `apps/web/src/hooks/use-items.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { apiClient, type ListItemsParams } from '@/lib/api-client'

export function useItems(params: ListItemsParams = {}) {
  return useQuery({
    queryKey: ['items', params],
    queryFn: () => apiClient.listItems(params),
  })
}
```

**Step 4: Create useItem hook**

Create `apps/web/src/hooks/use-item.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useItem(id: string) {
  return useQuery({
    queryKey: ['items', id],
    queryFn: () => apiClient.getItem(id),
    enabled: !!id,
  })
}
```

**Step 5: Create useTags hook**

Create `apps/web/src/hooks/use-tags.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => apiClient.listTags(),
  })
}
```

**Step 6: Wrap app with QueryClientProvider**

Modify `apps/web/src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import { queryClient } from './lib/query-client'
import './index.css'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
)
```

**Step 7: Test API hooks in items route**

Modify `apps/web/src/routes/items/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { useItems } from '@/hooks/use-items'

const itemsSearchSchema = z.object({
  q: z.string().optional(),
  page: z.number().int().positive().optional(),
})

export const Route = createFileRoute('/items/')({
  validateSearch: itemsSearchSchema,
  component: ItemsPage,
})

function ItemsPage() {
  const search = Route.useSearch()
  const { data, isLoading, error } = useItems({ q: search.q })

  if (isLoading) return <div className="p-4">Loading...</div>
  if (error) return <div className="p-4 text-red-600">Error: {error.message}</div>

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Items ({data?.total || 0})</h1>
      <ul className="mt-4 space-y-2">
        {data?.items.map((item) => (
          <li key={item.id} className="border p-2 rounded">
            {item.title || item.url}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

**Step 8: Test in browser**

Run: `pnpm dev`

Visit: http://localhost:3000/items

Expected: Shows loading state, then displays items from API

**Step 9: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): set up TanStack Query and API client

- Create type-safe API client with CRUD methods
- Configure QueryClient with sensible defaults
- Add useItems, useItem, useTags hooks
- Integrate QueryClientProvider in app root

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Build Root Layout with Sidebar

**Files:**
- Create: `apps/web/src/components/layout/app-sidebar.tsx`
- Create: `apps/web/src/components/layout/app-layout.tsx`
- Modify: `apps/web/src/routes/__root.tsx`

**Step 1: Create AppSidebar component**

Create `apps/web/src/components/layout/app-sidebar.tsx`:

```tsx
import { Link, useRouterState } from '@tanstack/react-router'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { FileText, MessageSquare, Settings } from 'lucide-react'

export function AppSidebar() {
  const router = useRouterState()
  const currentPath = router.location.pathname

  const isActive = (path: string) => currentPath.startsWith(path)

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <h1 className="text-xl font-bold">Recall Link</h1>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive('/items')}>
              <Link to="/items">
                <FileText className="mr-2 h-4 w-4" />
                记录
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton disabled>
              <MessageSquare className="mr-2 h-4 w-4" />
              对话
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton disabled>
              <Settings className="mr-2 h-4 w-4" />
              设置
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  )
}
```

**Step 2: Install lucide-react icons**

Run: `cd apps/web && pnpm add lucide-react`

**Step 3: Create AppLayout wrapper**

Create `apps/web/src/components/layout/app-layout.tsx`:

```tsx
import { ReactNode } from 'react'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from './app-sidebar'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <div className="border-b px-4 py-2">
          <SidebarTrigger />
        </div>
        {children}
      </main>
    </SidebarProvider>
  )
}
```

**Step 4: Update root route to use layout**

Modify `apps/web/src/routes/__root.tsx`:

```tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { AppLayout } from '@/components/layout/app-layout'

export const Route = createRootRoute({
  component: () => (
    <>
      <AppLayout>
        <Outlet />
      </AppLayout>
      <TanStackRouterDevtools />
    </>
  ),
})
```

**Step 5: Test sidebar**

Run: `pnpm dev`

Visit: http://localhost:3000/items

Expected:
- Sidebar visible on left with "记录" active
- "对话" and "设置" are disabled/grayed
- Sidebar toggle button works
- Clicking "记录" navigates to /items

**Step 6: Commit**

```bash
git add apps/web/src/components/layout apps/web/src/routes/__root.tsx
git commit -m "feat(web): create app layout with sidebar navigation

- Build AppSidebar with primary navigation items
- Add AppLayout wrapper with SidebarProvider
- Highlight active navigation item
- Disable placeholder routes (对话, 设置)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Build Items List Page with Tag Sidebar

**Files:**
- Create: `apps/web/src/components/items/items-tag-sidebar.tsx`
- Create: `apps/web/src/components/items/items-grid.tsx`
- Create: `apps/web/src/components/items/item-card.tsx`
- Create: `apps/web/src/components/items/item-card-skeleton.tsx`
- Modify: `apps/web/src/routes/items/index.tsx`

**Step 1: Create tag sidebar component**

Create `apps/web/src/components/items/items-tag-sidebar.tsx`:

```tsx
import { Link, useParams } from '@tanstack/react-router'
import { useTags } from '@/hooks/use-tags'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export function ItemsTagSidebar() {
  const params = useParams({ strict: false })
  const currentTag = params.tag as string | undefined
  const { data: tags, isLoading } = useTags()

  if (isLoading) {
    return (
      <div className="w-48 border-r p-4 space-y-2">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="w-48 border-r p-4">
      <div className="space-y-1">
        <Link
          to="/items"
          className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            !currentTag
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          全部
        </Link>

        <div className="mt-4">
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            标签
          </h3>
          <div className="space-y-1">
            {tags?.map((tag) => (
              <Link
                key={tag.tag}
                to="/items/tags/$tag"
                params={{ tag: tag.tag }}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                  currentTag === tag.tag
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <span className="truncate">{tag.tag}</span>
                <Badge variant="secondary" className="ml-2">
                  {tag.count}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Create item card skeleton**

Create `apps/web/src/components/items/item-card-skeleton.tsx`:

```tsx
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function ItemCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-40 w-full" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <div className="flex gap-2 mt-3">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-3 w-32" />
      </CardFooter>
    </Card>
  )
}
```

**Step 3: Create item card component**

Create `apps/web/src/components/items/item-card.tsx`:

```tsx
import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Item } from '@/lib/api-client'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface ItemCardProps {
  item: Item
}

export function ItemCard({ item }: ItemCardProps) {
  const displayTitle = item.title || item.url
  const displaySummary = item.summary || '暂无摘要'
  const visibleTags = item.tags.slice(0, 3)
  const remainingCount = item.tags.length - 3

  return (
    <Link to="/items/$id" params={{ id: item.id }}>
      <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer">
        <CardHeader className="h-40 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
          {item.domain && (
            <div className="text-center">
              <div className="text-4xl mb-2">🔗</div>
              <p className="text-sm text-muted-foreground">{item.domain}</p>
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-4">
          <h3 className="font-semibold line-clamp-2 mb-2">{displayTitle}</h3>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {displaySummary}
          </p>
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {visibleTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {remainingCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  +{remainingCount}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          {item.domain} •{' '}
          {formatDistanceToNow(new Date(item.created_at), {
            addSuffix: true,
            locale: zhCN,
          })}
        </CardFooter>
      </Card>
    </Link>
  )
}
```

**Step 4: Install date-fns**

Run: `cd apps/web && pnpm add date-fns`

**Step 5: Create items grid component**

Create `apps/web/src/components/items/items-grid.tsx`:

```tsx
import type { Item } from '@/lib/api-client'
import { ItemCard } from './item-card'
import { ItemCardSkeleton } from './item-card-skeleton'

interface ItemsGridProps {
  items: Item[]
  isLoading?: boolean
}

export function ItemsGrid({ items, isLoading }: ItemsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <ItemCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-lg font-semibold mb-2">暂无保存的网页</h3>
        <p className="text-sm text-muted-foreground">
          点击右上角「保存网页」开始使用
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
```

**Step 6: Update items index route**

Modify `apps/web/src/routes/items/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { useItems } from '@/hooks/use-items'
import { ItemsTagSidebar } from '@/components/items/items-tag-sidebar'
import { ItemsGrid } from '@/components/items/items-grid'

const itemsSearchSchema = z.object({
  q: z.string().optional(),
  page: z.number().int().positive().optional(),
})

export const Route = createFileRoute('/items/')({
  validateSearch: itemsSearchSchema,
  component: ItemsPage,
})

function ItemsPage() {
  const search = Route.useSearch()
  const { data, isLoading } = useItems({ q: search.q })

  return (
    <div className="flex h-[calc(100vh-57px)]">
      <ItemsTagSidebar />
      <div className="flex-1 overflow-auto p-6">
        <ItemsGrid items={data?.items || []} isLoading={isLoading} />
      </div>
    </div>
  )
}
```

**Step 7: Update tag route to use same components**

Modify `apps/web/src/routes/items/tags/$tag.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useItems } from '@/hooks/use-items'
import { ItemsTagSidebar } from '@/components/items/items-tag-sidebar'
import { ItemsGrid } from '@/components/items/items-grid'

export const Route = createFileRoute('/items/tags/$tag')({
  component: TagItemsPage,
})

function TagItemsPage() {
  const { tag } = Route.useParams()
  const { data, isLoading } = useItems({ tags: tag })

  return (
    <div className="flex h-[calc(100vh-57px)]">
      <ItemsTagSidebar />
      <div className="flex-1 overflow-auto p-6">
        <h2 className="text-xl font-semibold mb-4">标签: {tag}</h2>
        <ItemsGrid items={data?.items || []} isLoading={isLoading} />
      </div>
    </div>
  )
}
```

**Step 8: Test items page**

Run: `pnpm dev`

Visit: http://localhost:3000/items

Expected:
- Tag sidebar on left with "全部" active
- Items displayed in responsive grid
- Hover effects on cards
- Click tag to filter by tag
- Empty state if no items

**Step 9: Commit**

```bash
git add apps/web/src/components/items apps/web/src/routes/items
git commit -m "feat(web): build items list page with tag filtering

- Create ItemCard component with hover effects
- Add ItemsGrid with skeleton loading states
- Build ItemsTagSidebar with tag list and counts
- Support tag filtering via URL params
- Add empty state for no items

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Build Item Detail Page

**Files:**
- Create: `apps/web/src/components/items/item-detail.tsx`
- Create: `apps/web/src/components/items/item-detail-skeleton.tsx`
- Create: `apps/web/src/hooks/use-delete-item.ts`
- Modify: `apps/web/src/routes/items/$id.tsx`

**Step 1: Create delete item hook**

Create `apps/web/src/hooks/use-delete-item.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useNavigate } from '@tanstack/react-router'
import { toast } from '@/hooks/use-toast'

export function useDeleteItem() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      toast({
        title: '删除成功',
        description: '网页已删除',
      })
      navigate({ to: '/items' })
    },
    onError: (error: Error) => {
      toast({
        title: '删除失败',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
```

**Step 2: Install and configure toast**

Run: `cd apps/web && npx shadcn@latest add toast`

**Step 3: Add Toaster to root layout**

Modify `apps/web/src/routes/__root.tsx`:

```tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { AppLayout } from '@/components/layout/app-layout'
import { Toaster } from '@/components/ui/toaster'

export const Route = createRootRoute({
  component: () => (
    <>
      <AppLayout>
        <Outlet />
      </AppLayout>
      <Toaster />
      <TanStackRouterDevtools />
    </>
  ),
})
```

**Step 4: Create item detail skeleton**

Create `apps/web/src/components/items/item-detail-skeleton.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export function ItemDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-16" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>

      <div className="border-t pt-6 space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-16 w-full" />
      </div>

      <div className="border-t pt-6 space-y-2">
        <Skeleton className="h-4 w-16" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>

      <div className="border-t pt-6 space-y-4">
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}
```

**Step 5: Create item detail component**

Create `apps/web/src/components/items/item-detail.tsx`:

```tsx
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Item } from '@/lib/api-client'
import { useDeleteItem } from '@/hooks/use-delete-item'

interface ItemDetailProps {
  item: Item
}

export function ItemDetail({ item }: ItemDetailProps) {
  const navigate = useNavigate()
  const deleteMutation = useDeleteItem()

  const handleDelete = () => {
    deleteMutation.mutate(item.id)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Action Bar */}
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/items' })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
        <Button variant="outline" size="sm" disabled>
          <Edit className="mr-2 h-4 w-4" />
          编辑标签
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                此操作无法撤销。确定要删除这个网页吗？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Title and Meta */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-3">
          {item.title || '无标题'}
        </h1>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            🔗 {item.url}
          </a>
          <p>
            📅 保存于{' '}
            {format(new Date(item.created_at), 'PPP', { locale: zhCN })}
          </p>
        </div>
      </div>

      {/* Summary */}
      {item.summary && (
        <div className="border-t pt-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">AI 摘要</h2>
          <p className="text-muted-foreground">{item.summary}</p>
        </div>
      )}

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="border-t pt-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">标签</h2>
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {item.clean_text && (
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">内容</h2>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: item.clean_text }}
          />
        </div>
      )}

      {!item.clean_text && item.status === 'pending' && (
        <div className="border-t pt-6 text-center text-muted-foreground">
          <p>正在获取网页内容...</p>
        </div>
      )}
    </div>
  )
}
```

**Step 6: Update item detail route**

Modify `apps/web/src/routes/items/$id.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useItem } from '@/hooks/use-item'
import { ItemDetail } from '@/components/items/item-detail'
import { ItemDetailSkeleton } from '@/components/items/item-detail-skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/items/$id')({
  component: ItemDetailPage,
})

function ItemDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: item, isLoading, error } = useItem(id)

  if (isLoading) {
    return (
      <div className="p-6">
        <ItemDetailSkeleton />
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>
            {error?.message || '网页不存在'}
          </AlertDescription>
        </Alert>
        <Button
          className="mt-4"
          onClick={() => navigate({ to: '/items' })}
        >
          返回列表
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6">
      <ItemDetail item={item} />
    </div>
  )
}
```

**Step 7: Test detail page**

Run: `pnpm dev`

1. Click on an item card from the list
2. Verify detail page shows:
   - Back button works
   - Title, URL, date display correctly
   - Summary and tags show if present
   - Content renders (if available)
   - Delete confirmation dialog works

**Step 8: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): build item detail page with delete functionality

- Create ItemDetail component with formatted content
- Add delete confirmation with AlertDialog
- Implement useDeleteItem hook with optimistic updates
- Add error and loading states
- Configure toast notifications

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Build Search Bar with Mode Toggle

**Files:**
- Create: `apps/web/src/components/items/items-search-bar.tsx`
- Create: `apps/web/src/hooks/use-search-mode.ts`
- Modify: `apps/web/src/routes/items/index.tsx`
- Install: ToggleGroup component

**Step 1: Install ToggleGroup component**

Run: `cd apps/web && npx shadcn@latest add toggle-group`

**Step 2: Create search mode store**

Create `apps/web/src/hooks/use-search-mode.ts`:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SearchMode = 'content' | 'tags'

interface SearchModeState {
  mode: SearchMode
  setMode: (mode: SearchMode) => void
}

export const useSearchMode = create<SearchModeState>()(
  persist(
    (set) => ({
      mode: 'content',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'search-mode',
    }
  )
)
```

**Step 3: Create search bar component**

Create `apps/web/src/components/items/items-search-bar.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Button } from '@/components/ui/button'
import { Search, Plus } from 'lucide-react'
import { useSearchMode } from '@/hooks/use-search-mode'
import { useTags } from '@/hooks/use-tags'

interface ItemsSearchBarProps {
  onCreateClick: () => void
}

export function ItemsSearchBar({ onCreateClick }: ItemsSearchBarProps) {
  const navigate = useNavigate({ from: '/items' })
  const search = useSearch({ from: '/items/' })
  const { mode, setMode } = useSearchMode()
  const { data: tags } = useTags()

  const [query, setQuery] = useState(search.q || '')
  const [filteredTags, setFilteredTags] = useState(tags || [])

  // Update URL when query changes (content mode only)
  useEffect(() => {
    if (mode === 'content') {
      const timer = setTimeout(() => {
        navigate({
          search: (prev) => ({ ...prev, q: query || undefined }),
        })
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [query, mode, navigate])

  // Filter tags when in tag mode
  useEffect(() => {
    if (mode === 'tags' && tags) {
      if (!query) {
        setFilteredTags(tags)
      } else {
        const filtered = tags.filter((tag) =>
          tag.tag.toLowerCase().includes(query.toLowerCase())
        )
        setFilteredTags(filtered)
      }
    }
  }, [query, mode, tags])

  return (
    <div className="border-b p-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              mode === 'content' ? '搜索内容...' : '搜索标签...'
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(value) => {
            if (value) setMode(value as 'content' | 'tags')
          }}
        >
          <ToggleGroupItem value="content" aria-label="搜索内容">
            内容
          </ToggleGroupItem>
          <ToggleGroupItem value="tags" aria-label="搜索标签">
            标签
          </ToggleGroupItem>
        </ToggleGroup>

        <Button onClick={onCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          保存网页
        </Button>
      </div>
    </div>
  )
}
```

**Step 4: Update items index route to use search bar**

Modify `apps/web/src/routes/items/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { useState } from 'react'
import { useItems } from '@/hooks/use-items'
import { ItemsTagSidebar } from '@/components/items/items-tag-sidebar'
import { ItemsGrid } from '@/components/items/items-grid'
import { ItemsSearchBar } from '@/components/items/items-search-bar'

const itemsSearchSchema = z.object({
  q: z.string().optional(),
  page: z.number().int().positive().optional(),
})

export const Route = createFileRoute('/items/')({
  validateSearch: itemsSearchSchema,
  component: ItemsPage,
})

function ItemsPage() {
  const search = Route.useSearch()
  const { data, isLoading } = useItems({ q: search.q })
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      <ItemsSearchBar onCreateClick={() => setShowCreateDialog(true)} />
      <div className="flex flex-1 overflow-hidden">
        <ItemsTagSidebar />
        <div className="flex-1 overflow-auto p-6">
          <ItemsGrid items={data?.items || []} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}
```

**Step 5: Test search bar**

Run: `pnpm dev`

1. Type in search box (content mode)
2. Verify URL updates with ?q= parameter
3. Verify items filter based on search
4. Switch to "标签" mode
5. Verify tag sidebar filters based on search
6. Click "保存网页" button (nothing happens yet)

**Step 6: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): add search bar with content/tag mode toggle

- Create ItemsSearchBar with debounced search input
- Add useSearchMode store for persisting search mode
- Implement tag filtering in tag mode
- Support content search via API in content mode
- Add create button placeholder

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: Build Create Item Dialog

**Files:**
- Create: `apps/web/src/components/items/create-item-dialog.tsx`
- Create: `apps/web/src/hooks/use-create-item.ts`
- Modify: `apps/web/src/routes/items/index.tsx`

**Step 1: Create mutation hook**

Create `apps/web/src/hooks/use-create-item.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from '@/hooks/use-toast'

export function useCreateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (url: string) => apiClient.createItem(url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      toast({
        title: '保存成功',
        description: '正在处理网页内容...',
      })
    },
    onError: (error: Error) => {
      toast({
        title: '保存失败',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
```

**Step 2: Create dialog component**

Create `apps/web/src/components/items/create-item-dialog.tsx`:

```tsx
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCreateItem } from '@/hooks/use-create-item'
import { z } from 'zod'

const urlSchema = z.string().url('请输入有效的 URL')

interface CreateItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateItemDialog({ open, onOpenChange }: CreateItemDialogProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const createMutation = useCreateItem()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate URL
    const validation = urlSchema.safeParse(url)
    if (!validation.success) {
      setError(validation.error.errors[0].message)
      return
    }

    try {
      await createMutation.mutateAsync(url)
      setUrl('')
      onOpenChange(false)
    } catch (err) {
      // Error handled by mutation onError
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setUrl('')
      setError(null)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>保存网页</DialogTitle>
          <DialogDescription>
            输入网页 URL，系统将自动提取内容并生成摘要和标签
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
            />

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 3: Integrate dialog into items page**

Modify `apps/web/src/routes/items/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { useState } from 'react'
import { useItems } from '@/hooks/use-items'
import { ItemsTagSidebar } from '@/components/items/items-tag-sidebar'
import { ItemsGrid } from '@/components/items/items-grid'
import { ItemsSearchBar } from '@/components/items/items-search-bar'
import { CreateItemDialog } from '@/components/items/create-item-dialog'

const itemsSearchSchema = z.object({
  q: z.string().optional(),
  page: z.number().int().positive().optional(),
})

export const Route = createFileRoute('/items/')({
  validateSearch: itemsSearchSchema,
  component: ItemsPage,
})

function ItemsPage() {
  const search = Route.useSearch()
  const { data, isLoading } = useItems({ q: search.q })
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-57px)]">
        <ItemsSearchBar onCreateClick={() => setShowCreateDialog(true)} />
        <div className="flex flex-1 overflow-hidden">
          <ItemsTagSidebar />
          <div className="flex-1 overflow-auto p-6">
            <ItemsGrid items={data?.items || []} isLoading={isLoading} />
          </div>
        </div>
      </div>

      <CreateItemDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </>
  )
}
```

**Step 4: Test create dialog**

Run: `pnpm dev`

1. Click "保存网页" button
2. Verify dialog opens
3. Enter invalid URL → shows error
4. Enter valid URL → saves and closes
5. Verify toast notification appears
6. Verify new item appears in list (may be pending)
7. Cancel button closes dialog

**Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): implement create item dialog with URL validation

- Create CreateItemDialog with Zod validation
- Add useCreateItem hook with optimistic updates
- Show success/error toast notifications
- Auto-close dialog on successful save
- Validate URL format before submission

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 11: Update Root Package and Test Full App

**Files:**
- Modify: `package.json` (root)
- Modify: `turbo.json`

**Step 1: Add web app to root workspace**

Modify root `package.json`:

Add to `scripts`:
```json
"dev:web": "pnpm --filter @recall-link/web dev",
"build:web": "pnpm --filter @recall-link/web build",
```

**Step 2: Update turbo.json**

Modify `turbo.json`:

Add to `pipeline`:
```json
"@recall-link/web#dev": {
  "cache": false,
  "persistent": true
},
"@recall-link/web#build": {
  "dependsOn": ["^build"],
  "outputs": ["dist/**"]
},
```

**Step 3: Test dev mode with both API and Web**

Terminal 1:
```bash
cd apps/api
pnpm dev
```

Terminal 2:
```bash
cd apps/web
pnpm dev
```

**Step 4: Full integration test checklist**

1. Visit http://localhost:3000
2. Redirects to /items ✓
3. Sidebar shows "记录" active ✓
4. Tag sidebar loads and displays tags ✓
5. Items grid displays with cards ✓
6. Click a tag → filters items ✓
7. Search for content → filters items ✓
8. Switch to tag mode → filters tags ✓
9. Click "保存网页" → dialog opens ✓
10. Save a URL → item appears in list ✓
11. Click item card → navigates to detail ✓
12. Detail page shows content ✓
13. Delete item → confirms and returns to list ✓
14. Empty state shows when no items ✓

**Step 5: Test responsive design**

1. Resize browser to mobile width (< 768px)
2. Verify sidebar collapses to hamburger menu
3. Verify grid shows single column
4. Verify search bar remains usable

**Step 6: Test type safety**

Run: `cd apps/web && pnpm typecheck`

Expected: No TypeScript errors

**Step 7: Build production bundle**

Run: `cd apps/web && pnpm build`

Expected: Build succeeds, dist/ folder created

**Step 8: Commit**

```bash
git add package.json turbo.json
git commit -m "chore: integrate web app into monorepo build system

- Add web dev and build scripts to root package
- Configure turbo pipeline for web app
- Test full integration with API backend

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 12: Add README and Documentation

**Files:**
- Create: `apps/web/README.md`
- Modify: `README.md` (root)

**Step 1: Create web app README**

Create `apps/web/README.md`:

```markdown
# Recall Link - Web Interface

Modern, type-safe React web interface for Recall Link.

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TanStack Router** - File-based routing with type-safe params
- **TanStack Query** - Server state management
- **shadcn/ui** - UI components
- **Tailwind CSS** - Styling
- **Zustand** - Client state management

## Development

```bash
# Install dependencies
pnpm install

# Start dev server (port 3000)
pnpm dev

# Type check
pnpm typecheck

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Environment Variables

Create `.env` file:

```env
VITE_API_URL=http://localhost:8787
```

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # AppSidebar, AppLayout
│   └── items/           # Item-specific components
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and API client
├── routes/              # File-based routes (TanStack Router)
├── main.tsx             # App entry point
└── index.css            # Global styles
```

## Features

- 📋 Browse saved webpages in card grid view
- 🏷️ Filter by tags
- 🔍 Full-text search
- 📄 View detailed content with AI summary
- ➕ Save new webpages
- 🗑️ Delete items with confirmation
- 📱 Responsive design (mobile/tablet/desktop)

## Adding shadcn/ui Components

```bash
npx shadcn@latest add [component-name]
```

## Routes

- `/` - Redirects to /items
- `/items` - Items list page
- `/items/:id` - Item detail page
- `/items/tags/:tag` - Items filtered by tag

## Type Safety

- All routes are type-safe (params, search params)
- API client has full TypeScript definitions
- Zod validation for forms and schemas
```

**Step 2: Update root README**

Modify root `README.md`:

Add after the API section:

```markdown
### Web Interface

```bash
pnpm dev:web           # Start web dev server (port 3000)
pnpm build:web         # Build for production
```

See [`apps/web/README.md`](apps/web/README.md) for details.
```

**Step 3: Commit**

```bash
git add apps/web/README.md README.md
git commit -m "docs: add web app README and update root docs

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Final Summary

**Implementation Complete! ✅**

### What We Built

1. ✅ Vite + React + TypeScript project with Tailwind CSS
2. ✅ shadcn/ui component library configured
3. ✅ TanStack Router with file-based routing
4. ✅ TanStack Query for server state management
5. ✅ Full-text search API endpoint
6. ✅ App layout with collapsible sidebar navigation
7. ✅ Items list page with card grid and tag sidebar
8. ✅ Item detail page with delete functionality
9. ✅ Search bar with content/tag mode toggle
10. ✅ Create item dialog with URL validation
11. ✅ Responsive design for mobile/tablet/desktop
12. ✅ Toast notifications for user feedback
13. ✅ Loading states and error handling
14. ✅ Type-safe API client and hooks

### Testing Checklist

- [ ] Start API: `cd apps/api && pnpm dev`
- [ ] Start Web: `cd apps/web && pnpm dev`
- [ ] Visit http://localhost:3000
- [ ] Browse items in grid view
- [ ] Filter by tags
- [ ] Search content
- [ ] Save new webpage
- [ ] View item detail
- [ ] Delete item
- [ ] Test responsive layout (resize browser)

### Known Limitations (Future Work)

- [ ] SSE real-time job updates (TODO in design doc)
- [ ] Edit tags functionality (button disabled)
- [ ] Pagination for large lists
- [ ] Recent items feature
- [ ] Favorites feature
- [ ] Chat/RAG interface
- [ ] Settings page
- [ ] Dark mode toggle

### Next Steps

Run both services and test the full application flow!
