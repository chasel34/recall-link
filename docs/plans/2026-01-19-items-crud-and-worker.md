# Items CRUD API and Worker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement complete Items CRUD API (list with pagination/filtering/sorting, get, update, delete) and Worker system (internal mode) for fetching webpage content with readability extraction.

**Architecture:** REST endpoints use database access layer for queries with dynamic SQL building. Worker runs as optional background service in same process, polls jobs table with locking mechanism, processes fetch tasks using node-fetch + readability, handles failures with exponential backoff retry.

**Tech Stack:** Hono, Zod, better-sqlite3, @mozilla/readability, jsdom

---

## Dependencies Required

**IMPORTANT:** Before starting, you need to install these dependencies:

```bash
cd apps/api
pnpm add @mozilla/readability jsdom
pnpm add -D @types/jsdom
```

Do NOT proceed until dependencies are installed.

---

## Task 1: Add Items Database Query Functions

**Files:**
- Modify: `apps/api/src/features/items/items.db.ts`
- Modify: `apps/api/src/features/items/items.db.test.ts`

**Step 1: Write the failing test for listItems**

Add to `apps/api/src/features/items/items.db.test.ts`:

```typescript
import { listItems, getItemById, updateItem, deleteItem } from './items.db.js'

describe('listItems', () => {
  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())

    // Insert test data
    const timestamp = new Date().toISOString()
    const items = [
      { id: 'item_1', url: 'https://a.com', url_normalized: 'https://a.com', domain: 'a.com', status: 'completed', created_at: '2026-01-01T00:00:00.000Z' },
      { id: 'item_2', url: 'https://b.com', url_normalized: 'https://b.com', domain: 'b.com', status: 'pending', created_at: '2026-01-02T00:00:00.000Z' },
      { id: 'item_3', url: 'https://a.com/2', url_normalized: 'https://a.com/2', domain: 'a.com', status: 'failed', created_at: '2026-01-03T00:00:00.000Z' },
    ]

    for (const item of items) {
      db.prepare(`
        INSERT INTO items (id, url, url_normalized, domain, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(item.id, item.url, item.url_normalized, item.domain, item.status, item.created_at, item.created_at)
    }
  })

  it('should return all items with default pagination', () => {
    const result = listItems(db, {})
    expect(result.items).toHaveLength(3)
    expect(result.total).toBe(3)
  })

  it('should paginate results', () => {
    const result = listItems(db, { limit: 2, offset: 1 })
    expect(result.items).toHaveLength(2)
    expect(result.total).toBe(3)
  })

  it('should filter by status', () => {
    const result = listItems(db, { status: 'pending' })
    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('item_2')
  })

  it('should filter by domain', () => {
    const result = listItems(db, { domain: 'a.com' })
    expect(result.items).toHaveLength(2)
  })

  it('should filter by created_after', () => {
    const result = listItems(db, { created_after: '2026-01-02T00:00:00.000Z' })
    expect(result.items).toHaveLength(2)
  })

  it('should filter by created_before', () => {
    const result = listItems(db, { created_before: '2026-01-02T00:00:00.000Z' })
    expect(result.items).toHaveLength(1)
  })

  it('should sort by created_at desc by default', () => {
    const result = listItems(db, {})
    expect(result.items[0].id).toBe('item_3')
    expect(result.items[2].id).toBe('item_1')
  })

  it('should sort by created_at asc', () => {
    const result = listItems(db, { sort_by: 'created_at', sort_order: 'asc' })
    expect(result.items[0].id).toBe('item_1')
    expect(result.items[2].id).toBe('item_3')
  })

  it('should combine filters and sorting', () => {
    const result = listItems(db, {
      domain: 'a.com',
      sort_by: 'created_at',
      sort_order: 'asc',
      limit: 10,
      offset: 0
    })
    expect(result.items).toHaveLength(2)
    expect(result.items[0].id).toBe('item_1')
  })
})

describe('getItemById', () => {
  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())

    const timestamp = new Date().toISOString()
    db.prepare(`
      INSERT INTO items (id, url, url_normalized, domain, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('item_test', 'https://example.com', 'https://example.com', 'example.com', 'pending', timestamp, timestamp)
  })

  it('should return item by id', () => {
    const item = getItemById(db, 'item_test')
    expect(item).toBeTruthy()
    expect(item?.id).toBe('item_test')
  })

  it('should return null if item does not exist', () => {
    const item = getItemById(db, 'item_nonexistent')
    expect(item).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pnpm test -- items.db.test.ts`

Expected: FAIL with "listItems is not a function"

**Step 3: Write minimal implementation**

Add to `apps/api/src/features/items/items.db.ts`:

```typescript
export type ListItemsFilters = {
  status?: 'pending' | 'completed' | 'failed'
  domain?: string
  created_after?: string
  created_before?: string
  sort_by?: 'created_at' | 'updated_at' | 'domain'
  sort_order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export type ListItemsResult = {
  items: Item[]
  total: number
}

/**
 * List items with pagination, filtering, and sorting
 */
export function listItems(db: Database, filters: ListItemsFilters = {}): ListItemsResult {
  const {
    status,
    domain,
    created_after,
    created_before,
    sort_by = 'created_at',
    sort_order = 'desc',
    limit = 20,
    offset = 0,
  } = filters

  // Build WHERE clause
  const conditions: string[] = []
  const params: any[] = []

  if (status) {
    conditions.push('status = ?')
    params.push(status)
  }

  if (domain) {
    conditions.push('domain = ?')
    params.push(domain)
  }

  if (created_after) {
    conditions.push('created_at >= ?')
    params.push(created_after)
  }

  if (created_before) {
    conditions.push('created_at <= ?')
    params.push(created_before)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Get total count
  const countSql = `SELECT COUNT(*) as count FROM items ${whereClause}`
  const { count } = db.prepare(countSql).get(...params) as { count: number }

  // Get items
  const validSortBy = ['created_at', 'updated_at', 'domain'].includes(sort_by) ? sort_by : 'created_at'
  const validSortOrder = sort_order === 'asc' ? 'ASC' : 'DESC'

  const itemsSql = `
    SELECT * FROM items
    ${whereClause}
    ORDER BY ${validSortBy} ${validSortOrder}
    LIMIT ? OFFSET ?
  `
  const items = db.prepare(itemsSql).all(...params, limit, offset) as Item[]

  return {
    items,
    total: count,
  }
}

/**
 * Get item by ID
 */
export function getItemById(db: Database, id: string): Item | null {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as Item | undefined
  return item ?? null
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && pnpm test -- items.db.test.ts`

Expected: PASS (listItems and getItemById tests)

**Step 5: Commit**

```bash
git add src/features/items/items.db.ts src/features/items/items.db.test.ts
git commit -m "feat(api): add listItems and getItemById database functions"
```

---

## Task 2: Add Update and Delete Database Functions

**Files:**
- Modify: `apps/api/src/features/items/items.db.ts`
- Modify: `apps/api/src/features/items/items.db.test.ts`

**Step 1: Write the failing test for updateItem**

Add to `apps/api/src/features/items/items.db.test.ts`:

```typescript
describe('updateItem', () => {
  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())

    const timestamp = new Date().toISOString()
    db.prepare(`
      INSERT INTO items (id, url, url_normalized, domain, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('item_test', 'https://example.com', 'https://example.com', 'example.com', 'pending', timestamp, timestamp)
  })

  it('should update summary with user source', () => {
    const result = updateItem(db, 'item_test', { summary: 'My summary' })
    expect(result.changes).toBe(1)

    const item = getItemById(db, 'item_test')
    expect(item?.summary).toBe('My summary')
    expect(item?.summary_source).toBe('user')
  })

  it('should update tags with user source', () => {
    const result = updateItem(db, 'item_test', { tags: ['react', 'typescript'] })
    expect(result.changes).toBe(1)

    const item = getItemById(db, 'item_test')
    expect(item?.tags_json).toBe('["react","typescript"]')
    expect(item?.tags_source).toBe('user')
  })

  it('should update note', () => {
    const result = updateItem(db, 'item_test', { note: 'Important article' })
    expect(result.changes).toBe(1)

    const item = getItemById(db, 'item_test')
    expect(item?.note).toBe('Important article')
  })

  it('should update multiple fields at once', () => {
    const result = updateItem(db, 'item_test', {
      summary: 'Summary',
      tags: ['tag1'],
      note: 'Note',
    })
    expect(result.changes).toBe(1)

    const item = getItemById(db, 'item_test')
    expect(item?.summary).toBe('Summary')
    expect(item?.tags_json).toBe('["tag1"]')
    expect(item?.note).toBe('Note')
  })

  it('should update updated_at timestamp', () => {
    const before = new Date().toISOString()
    updateItem(db, 'item_test', { note: 'Test' })
    const after = new Date().toISOString()

    const item = getItemById(db, 'item_test')
    expect(item?.updated_at).toBeGreaterThanOrEqual(before)
    expect(item?.updated_at).toBeLessThanOrEqual(after)
  })

  it('should return 0 changes if item does not exist', () => {
    const result = updateItem(db, 'item_nonexistent', { note: 'Test' })
    expect(result.changes).toBe(0)
  })
})

describe('deleteItem', () => {
  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())

    const timestamp = new Date().toISOString()
    db.prepare(`
      INSERT INTO items (id, url, url_normalized, domain, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('item_test', 'https://example.com', 'https://example.com', 'example.com', 'pending', timestamp, timestamp)

    db.prepare(`
      INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('job_test', 'item_test', 'fetch', 'pending', 0, timestamp, timestamp, timestamp)
  })

  it('should delete item and associated jobs in transaction', () => {
    const result = deleteItem(db, 'item_test')
    expect(result.deletedJobs).toBe(1)
    expect(result.deletedItem).toBe(1)

    // Verify item deleted
    const item = getItemById(db, 'item_test')
    expect(item).toBeNull()

    // Verify job deleted
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get('job_test')
    expect(job).toBeUndefined()
  })

  it('should return 0 if item does not exist', () => {
    const result = deleteItem(db, 'item_nonexistent')
    expect(result.deletedItem).toBe(0)
    expect(result.deletedJobs).toBe(0)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pnpm test -- items.db.test.ts`

Expected: FAIL with "updateItem is not a function"

**Step 3: Write minimal implementation**

Add to `apps/api/src/features/items/items.db.ts`:

```typescript
export type UpdateItemData = {
  summary?: string
  tags?: string[]
  note?: string
}

/**
 * Update item fields (user editable)
 */
export function updateItem(db: Database, id: string, updates: UpdateItemData): { changes: number } {
  const sets: string[] = []
  const params: any[] = []

  if (updates.summary !== undefined) {
    sets.push('summary = ?', 'summary_source = ?')
    params.push(updates.summary, 'user')
  }

  if (updates.tags !== undefined) {
    sets.push('tags_json = ?', 'tags_source = ?')
    params.push(JSON.stringify(updates.tags), 'user')
  }

  if (updates.note !== undefined) {
    sets.push('note = ?')
    params.push(updates.note)
  }

  if (sets.length === 0) {
    return { changes: 0 }
  }

  sets.push('updated_at = ?')
  params.push(new Date().toISOString())

  params.push(id)

  const sql = `UPDATE items SET ${sets.join(', ')} WHERE id = ?`
  const result = db.prepare(sql).run(...params)

  return { changes: result.changes }
}

/**
 * Delete item and associated jobs in transaction
 */
export function deleteItem(db: Database, id: string): { deletedItem: number; deletedJobs: number } {
  return db.transaction(() => {
    // Delete associated jobs first
    const jobResult = db.prepare('DELETE FROM jobs WHERE item_id = ?').run(id)

    // Delete item
    const itemResult = db.prepare('DELETE FROM items WHERE id = ?').run(id)

    return {
      deletedItem: itemResult.changes,
      deletedJobs: jobResult.changes,
    }
  })()
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && pnpm test -- items.db.test.ts`

Expected: PASS (all items.db tests)

**Step 5: Commit**

```bash
git add src/features/items/items.db.ts src/features/items/items.db.test.ts
git commit -m "feat(api): add updateItem and deleteItem database functions"
```

---

## Task 3: Implement GET /items Endpoint

**Files:**
- Modify: `apps/api/src/features/items/items.route.ts`
- Modify: `apps/api/src/features/items/items.schema.ts`

**Step 1: Add query schema**

Modify `apps/api/src/features/items/items.schema.ts`:

```typescript
export const listItemsQuerySchema = z.object({
  status: z.enum(['pending', 'completed', 'failed']).optional(),
  domain: z.string().min(1).optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'domain']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})
```

**Step 2: Implement route handler**

Modify `apps/api/src/features/items/items.route.ts`:

```typescript
import { listItems, getItemById, updateItem, deleteItem } from './items.db.js'
import { listItemsQuerySchema } from './items.schema.js'

// Replace the stub GET / handler
itemsApp.get('/', zValidator('query', listItemsQuerySchema), (c) => {
  try {
    const db = getDb()
    const filters = c.req.valid('query')

    const result = listItems(db, filters)

    return c.json({
      items: result.items,
      total: result.total,
      limit: filters.limit ?? 20,
      offset: filters.offset ?? 0,
    })
  } catch (error) {
    console.error('[GET /items] Error:', error)
    return c.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to list items',
    }, 500)
  }
})
```

**Step 3: Test manually**

Run API server:
```bash
cd apps/api
WORKER_ENABLED=0 pnpm dev
```

In another terminal:
```bash
# List all items
curl "http://localhost:8787/api/items"

# With pagination
curl "http://localhost:8787/api/items?limit=10&offset=0"

# With filters
curl "http://localhost:8787/api/items?status=pending&domain=example.com"

# With sorting
curl "http://localhost:8787/api/items?sort_by=created_at&sort_order=asc"
```

Expected: JSON response with items array and total count

**Step 4: Commit**

```bash
git add src/features/items/items.route.ts src/features/items/items.schema.ts
git commit -m "feat(api): implement GET /items with pagination and filtering"
```

---

## Task 4: Implement GET /items/:id Endpoint

**Files:**
- Modify: `apps/api/src/features/items/items.route.ts`

**Step 1: Implement route handler**

Modify `apps/api/src/features/items/items.route.ts`:

```typescript
// Replace the stub GET /:id handler
itemsApp.get('/:id', (c) => {
  try {
    const db = getDb()
    const id = c.req.param('id')

    const item = getItemById(db, id)

    if (!item) {
      return c.json({
        error: 'NOT_FOUND',
        message: 'Item not found',
      }, 404)
    }

    return c.json(item)
  } catch (error) {
    console.error('[GET /items/:id] Error:', error)
    return c.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get item',
    }, 500)
  }
})
```

**Step 2: Test manually**

```bash
# Get existing item (use ID from previous POST)
curl "http://localhost:8787/api/items/item_xxx"

# Get non-existent item
curl "http://localhost:8787/api/items/item_nonexistent"
```

Expected: 200 with item data, or 404 with error

**Step 3: Commit**

```bash
git add src/features/items/items.route.ts
git commit -m "feat(api): implement GET /items/:id endpoint"
```

---

## Task 5: Implement PATCH /items/:id Endpoint

**Files:**
- Modify: `apps/api/src/features/items/items.route.ts`

**Step 1: Implement route handler**

Modify `apps/api/src/features/items/items.route.ts`:

```typescript
// Replace the stub PATCH /:id handler
itemsApp.patch('/:id', zValidator('json', patchItemSchema), (c) => {
  try {
    const db = getDb()
    const id = c.req.param('id')
    const updates = c.req.valid('json')

    // Check if item exists
    const existing = getItemById(db, id)
    if (!existing) {
      return c.json({
        error: 'NOT_FOUND',
        message: 'Item not found',
      }, 404)
    }

    // Update item
    const result = updateItem(db, id, updates)

    if (result.changes === 0) {
      return c.json({
        error: 'NO_CHANGES',
        message: 'No fields to update',
      }, 400)
    }

    // Return updated item
    const updated = getItemById(db, id)
    return c.json(updated)
  } catch (error) {
    console.error('[PATCH /items/:id] Error:', error)
    return c.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to update item',
    }, 500)
  }
})
```

**Step 2: Test manually**

```bash
# Update summary
curl -X PATCH "http://localhost:8787/api/items/item_xxx" \
  -H "Content-Type: application/json" \
  -d '{"summary":"My custom summary"}'

# Update tags
curl -X PATCH "http://localhost:8787/api/items/item_xxx" \
  -H "Content-Type: application/json" \
  -d '{"tags":["react","typescript","tutorial"]}'

# Update note
curl -X PATCH "http://localhost:8787/api/items/item_xxx" \
  -H "Content-Type: application/json" \
  -d '{"note":"Read this later"}'

# Update multiple fields
curl -X PATCH "http://localhost:8787/api/items/item_xxx" \
  -H "Content-Type: application/json" \
  -d '{"summary":"Summary","tags":["tag1"],"note":"Note"}'
```

Expected: 200 with updated item data

**Step 3: Commit**

```bash
git add src/features/items/items.route.ts
git commit -m "feat(api): implement PATCH /items/:id endpoint"
```

---

## Task 6: Implement DELETE /items/:id Endpoint

**Files:**
- Modify: `apps/api/src/features/items/items.route.ts`

**Step 1: Implement route handler**

Modify `apps/api/src/features/items/items.route.ts`:

```typescript
// Replace the stub DELETE /:id handler
itemsApp.delete('/:id', (c) => {
  try {
    const db = getDb()
    const id = c.req.param('id')

    const result = deleteItem(db, id)

    if (result.deletedItem === 0) {
      return c.json({
        error: 'NOT_FOUND',
        message: 'Item not found',
      }, 404)
    }

    return c.json({
      message: 'Item deleted',
      deleted_jobs: result.deletedJobs,
    })
  } catch (error) {
    console.error('[DELETE /items/:id] Error:', error)
    return c.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to delete item',
    }, 500)
  }
})
```

**Step 2: Test manually**

```bash
# Delete item
curl -X DELETE "http://localhost:8787/api/items/item_xxx"

# Verify deleted
curl "http://localhost:8787/api/items/item_xxx"
```

Expected: 200 with success message, then 404 on get

**Step 3: Commit**

```bash
git add src/features/items/items.route.ts
git commit -m "feat(api): implement DELETE /items/:id endpoint"
```

---

## Task 7: Create Jobs Database Access Layer

**Files:**
- Create: `apps/api/src/features/jobs/jobs.db.ts`
- Create: `apps/api/src/features/jobs/jobs.db.test.ts`

**Step 1: Write the failing test**

Create `apps/api/src/features/jobs/jobs.db.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../../db/client.js'
import { acquireJob, completeJob, failJob, retryJob, updateItemContent } from './jobs.db.js'

describe('jobs.db', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())

    const timestamp = new Date().toISOString()

    // Insert test item
    db.prepare(`
      INSERT INTO items (id, url, url_normalized, domain, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('item_test', 'https://example.com', 'https://example.com', 'example.com', 'pending', timestamp, timestamp)
  })

  describe('acquireJob', () => {
    it('should acquire pending job and lock it', () => {
      const timestamp = new Date().toISOString()
      db.prepare(`
        INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('job_1', 'item_test', 'fetch', 'pending', 0, timestamp, timestamp, timestamp)

      const job = acquireJob(db, 'worker_1')
      expect(job).toBeTruthy()
      expect(job?.id).toBe('job_1')
      expect(job?.locked_by).toBe('worker_1')
      expect(job?.lock_expires_at).toBeTruthy()
    })

    it('should not acquire locked job with valid lock', () => {
      const now = Date.now()
      const timestamp = new Date(now).toISOString()
      const lockExpiry = new Date(now + 10 * 60 * 1000).toISOString() // 10 min future

      db.prepare(`
        INSERT INTO jobs (id, item_id, type, state, attempt, run_after, locked_by, lock_expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('job_1', 'item_test', 'fetch', 'pending', 0, timestamp, 'worker_other', lockExpiry, timestamp, timestamp)

      const job = acquireJob(db, 'worker_1')
      expect(job).toBeNull()
    })

    it('should acquire job with expired lock', () => {
      const now = Date.now()
      const timestamp = new Date(now).toISOString()
      const lockExpiry = new Date(now - 1000).toISOString() // 1 sec past

      db.prepare(`
        INSERT INTO jobs (id, item_id, type, state, attempt, run_after, locked_by, lock_expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('job_1', 'item_test', 'fetch', 'pending', 0, timestamp, 'worker_old', lockExpiry, timestamp, timestamp)

      const job = acquireJob(db, 'worker_1')
      expect(job).toBeTruthy()
      expect(job?.locked_by).toBe('worker_1')
    })

    it('should not acquire job with future run_after', () => {
      const now = Date.now()
      const timestamp = new Date(now).toISOString()
      const runAfter = new Date(now + 60 * 1000).toISOString() // 1 min future

      db.prepare(`
        INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('job_1', 'item_test', 'fetch', 'pending', 0, runAfter, timestamp, timestamp)

      const job = acquireJob(db, 'worker_1')
      expect(job).toBeNull()
    })

    it('should return null if no jobs available', () => {
      const job = acquireJob(db, 'worker_1')
      expect(job).toBeNull()
    })
  })

  describe('completeJob', () => {
    it('should mark job as completed', () => {
      const timestamp = new Date().toISOString()
      db.prepare(`
        INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('job_1', 'item_test', 'fetch', 'pending', 0, timestamp, timestamp, timestamp)

      completeJob(db, 'job_1')

      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get('job_1') as any
      expect(job.state).toBe('completed')
      expect(job.finished_at).toBeTruthy()
    })
  })

  describe('failJob', () => {
    it('should mark job as failed with error', () => {
      const timestamp = new Date().toISOString()
      db.prepare(`
        INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('job_1', 'item_test', 'fetch', 'pending', 0, timestamp, timestamp, timestamp)

      failJob(db, 'job_1', 'Network error')

      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get('job_1') as any
      expect(job.state).toBe('failed')
      expect(job.last_error_message).toBe('Network error')
      expect(job.finished_at).toBeTruthy()
    })
  })

  describe('retryJob', () => {
    it('should update job for retry with exponential backoff', () => {
      const timestamp = new Date().toISOString()
      db.prepare(`
        INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('job_1', 'item_test', 'fetch', 'pending', 0, timestamp, timestamp, timestamp)

      const futureTime = new Date(Date.now() + 60000).toISOString()
      retryJob(db, 'job_1', {
        attempt: 1,
        run_after: futureTime,
        error_message: 'Temporary error',
      })

      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get('job_1') as any
      expect(job.state).toBe('pending')
      expect(job.attempt).toBe(1)
      expect(job.run_after).toBe(futureTime)
      expect(job.last_error_message).toBe('Temporary error')
      expect(job.locked_by).toBeNull()
      expect(job.lock_expires_at).toBeNull()
    })
  })

  describe('updateItemContent', () => {
    it('should update item with fetched content', () => {
      updateItemContent(db, 'item_test', {
        title: 'Test Article',
        clean_text: 'This is the content',
        status: 'completed',
      })

      const item = db.prepare('SELECT * FROM items WHERE id = ?').get('item_test') as any
      expect(item.title).toBe('Test Article')
      expect(item.clean_text).toBe('This is the content')
      expect(item.status).toBe('completed')
      expect(item.processed_at).toBeTruthy()
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pnpm test -- jobs.db.test.ts`

Expected: FAIL with "Cannot find module './jobs.db.js'"

**Step 3: Write minimal implementation**

Create `apps/api/src/features/jobs/jobs.db.ts`:

```typescript
import type { Database } from 'better-sqlite3'

export type Job = {
  id: string
  item_id: string
  type: string
  state: string
  attempt: number
  run_after: string
  locked_by: string | null
  lock_expires_at: string | null
  last_error_code: string | null
  last_error_message: string | null
  created_at: string
  updated_at: string
  started_at: string | null
  finished_at: string | null
}

/**
 * Acquire next available job with locking
 */
export function acquireJob(db: Database, workerId: string): Job | null {
  const now = new Date().toISOString()
  const lockExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 min lock

  return db.transaction(() => {
    // Find available job
    const job = db.prepare(`
      SELECT * FROM jobs
      WHERE state = 'pending'
        AND run_after <= ?
        AND (locked_by IS NULL OR lock_expires_at < ?)
      ORDER BY run_after ASC
      LIMIT 1
    `).get(now, now) as Job | undefined

    if (!job) {
      return null
    }

    // Lock the job
    db.prepare(`
      UPDATE jobs
      SET locked_by = ?, lock_expires_at = ?, started_at = ?, updated_at = ?
      WHERE id = ?
    `).run(workerId, lockExpiry, now, now, job.id)

    // Return locked job
    return {
      ...job,
      locked_by: workerId,
      lock_expires_at: lockExpiry,
      started_at: now,
    }
  })()
}

/**
 * Mark job as completed
 */
export function completeJob(db: Database, jobId: string): void {
  const now = new Date().toISOString()
  db.prepare(`
    UPDATE jobs
    SET state = 'completed', finished_at = ?, updated_at = ?
    WHERE id = ?
  `).run(now, now, jobId)
}

/**
 * Mark job as failed
 */
export function failJob(db: Database, jobId: string, errorMessage: string): void {
  const now = new Date().toISOString()
  db.prepare(`
    UPDATE jobs
    SET state = 'failed', last_error_message = ?, finished_at = ?, updated_at = ?
    WHERE id = ?
  `).run(errorMessage, now, now, jobId)
}

/**
 * Retry job with exponential backoff
 */
export function retryJob(
  db: Database,
  jobId: string,
  data: { attempt: number; run_after: string; error_message: string }
): void {
  const now = new Date().toISOString()
  db.prepare(`
    UPDATE jobs
    SET attempt = ?, run_after = ?, last_error_message = ?,
        locked_by = NULL, lock_expires_at = NULL, updated_at = ?
    WHERE id = ?
  `).run(data.attempt, data.run_after, data.error_message, now, jobId)
}

/**
 * Update item with fetched content
 */
export function updateItemContent(
  db: Database,
  itemId: string,
  data: { title?: string; clean_text?: string; status: string }
): void {
  const now = new Date().toISOString()

  const sets: string[] = []
  const params: any[] = []

  if (data.title) {
    sets.push('title = ?')
    params.push(data.title)
  }

  if (data.clean_text) {
    sets.push('clean_text = ?')
    params.push(data.clean_text)
  }

  sets.push('status = ?', 'processed_at = ?', 'updated_at = ?')
  params.push(data.status, now, now)

  params.push(itemId)

  const sql = `UPDATE items SET ${sets.join(', ')} WHERE id = ?`
  db.prepare(sql).run(...params)
}

/**
 * Mark item as failed
 */
export function failItem(db: Database, itemId: string, errorMessage: string): void {
  const now = new Date().toISOString()
  db.prepare(`
    UPDATE items
    SET status = 'failed', error_message = ?, updated_at = ?
    WHERE id = ?
  `).run(errorMessage, now, itemId)
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && pnpm test -- jobs.db.test.ts`

Expected: PASS (all jobs.db tests)

**Step 5: Commit**

```bash
git add src/features/jobs/jobs.db.ts src/features/jobs/jobs.db.test.ts
git commit -m "feat(api): add jobs database access layer with locking"
```

---

## Task 8: Create Fetch Job Processor

**Files:**
- Create: `apps/api/src/queue/processors/fetch.processor.ts`
- Create: `apps/api/src/queue/processors/fetch.processor.test.ts`

**Step 1: Write the failing test**

Create `apps/api/src/queue/processors/fetch.processor.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../../db/client.js'
import { processFetchJob } from './fetch.processor.js'
import type { Job } from '../../features/jobs/jobs.db.js'

// Mock fetch
global.fetch = vi.fn()

describe('processFetchJob', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())
    vi.clearAllMocks()

    const timestamp = new Date().toISOString()
    db.prepare(`
      INSERT INTO items (id, url, url_normalized, domain, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('item_test', 'https://example.com/article', 'https://example.com/article', 'example.com', 'pending', timestamp, timestamp)
  })

  it('should fetch and extract content successfully', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Test Article</title></head>
        <body>
          <article>
            <h1>Test Article</h1>
            <p>This is the main content of the article.</p>
            <p>It has multiple paragraphs.</p>
          </article>
        </body>
      </html>
    `

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => mockHtml,
    } as Response)

    const job: Job = {
      id: 'job_test',
      item_id: 'item_test',
      type: 'fetch',
      state: 'pending',
      attempt: 0,
      run_after: new Date().toISOString(),
      locked_by: 'worker_1',
      lock_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      last_error_code: null,
      last_error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      finished_at: null,
    }

    await processFetchJob(db, job)

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get('item_test') as any
    expect(item.title).toBe('Test Article')
    expect(item.clean_text).toContain('main content')
    expect(item.status).toBe('completed')
    expect(item.processed_at).toBeTruthy()
  })

  it('should handle HTTP errors', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
    } as Response)

    const job: Job = {
      id: 'job_test',
      item_id: 'item_test',
      type: 'fetch',
      state: 'pending',
      attempt: 0,
      run_after: new Date().toISOString(),
      locked_by: 'worker_1',
      lock_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      last_error_code: null,
      last_error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      finished_at: null,
    }

    await expect(processFetchJob(db, job)).rejects.toThrow('HTTP 404')
  })

  it('should handle network errors', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network failure'))

    const job: Job = {
      id: 'job_test',
      item_id: 'item_test',
      type: 'fetch',
      state: 'pending',
      attempt: 0,
      run_after: new Date().toISOString(),
      locked_by: 'worker_1',
      lock_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      last_error_code: null,
      last_error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      finished_at: null,
    }

    await expect(processFetchJob(db, job)).rejects.toThrow('Network failure')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pnpm test -- fetch.processor.test.ts`

Expected: FAIL with "Cannot find module './fetch.processor.js'"

**Step 3: Write minimal implementation**

Create `apps/api/src/queue/processors/fetch.processor.ts`:

```typescript
import type { Database } from 'better-sqlite3'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import type { Job } from '../../features/jobs/jobs.db.js'
import { updateItemContent } from '../../features/jobs/jobs.db.js'
import { getItemById } from '../../features/items/items.db.js'

/**
 * Process fetch job - download webpage and extract content
 */
export async function processFetchJob(db: Database, job: Job): Promise<void> {
  const item = getItemById(db, job.item_id)

  if (!item) {
    throw new Error(`Item not found: ${job.item_id}`)
  }

  console.log(`[fetch] Processing ${item.url}`)

  // Fetch HTML
  const response = await fetch(item.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; RecallBot/1.0)',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(30000), // 30s timeout
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const html = await response.text()

  // Parse with Readability
  const dom = new JSDOM(html, { url: item.url })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()

  if (!article) {
    throw new Error('Failed to extract article content')
  }

  // Update item with extracted content
  updateItemContent(db, item.id, {
    title: article.title || item.title || undefined,
    clean_text: article.textContent,
    status: 'completed',
  })

  console.log(`[fetch] Completed ${item.url}`)
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && pnpm test -- fetch.processor.test.ts`

Expected: PASS (all fetch.processor tests)

**Step 5: Commit**

```bash
git add src/queue/processors/fetch.processor.ts src/queue/processors/fetch.processor.test.ts
git commit -m "feat(api): add fetch job processor with readability"
```

---

## Task 9: Implement Worker Core Logic

**Files:**
- Modify: `apps/api/src/queue/worker.ts`

**Step 1: Implement worker loop**

Modify `apps/api/src/queue/worker.ts`:

```typescript
import type { Database } from 'better-sqlite3'
import { getDb } from '../db/context.js'
import { acquireJob, completeJob, failJob, retryJob } from '../features/jobs/jobs.db.js'
import { failItem } from '../features/jobs/jobs.db.js'
import { processFetchJob } from './processors/fetch.processor.js'
import type { Job } from '../features/jobs/jobs.db.js'
import { nanoid } from 'nanoid'

const POLL_INTERVAL_MS = 5000 // 5 seconds
const MAX_ATTEMPTS = 3

type WorkerConfig = {
  enabled: boolean
  pollInterval?: number
}

let workerInterval: NodeJS.Timeout | null = null
let workerId: string | null = null

/**
 * Start the worker
 */
export function startWorker(config: WorkerConfig): void {
  if (!config.enabled) {
    console.log('[worker] disabled')
    return
  }

  workerId = `worker_${nanoid(8)}`
  const pollInterval = config.pollInterval ?? POLL_INTERVAL_MS

  console.log(`[worker] starting ${workerId}`)

  // Start polling loop
  workerInterval = setInterval(() => {
    processNextJob().catch((error) => {
      console.error('[worker] Error in processNextJob:', error)
    })
  }, pollInterval)

  // Process one immediately
  processNextJob().catch((error) => {
    console.error('[worker] Error in initial processNextJob:', error)
  })
}

/**
 * Stop the worker
 */
export function stopWorker(): void {
  if (workerInterval) {
    clearInterval(workerInterval)
    workerInterval = null
    console.log(`[worker] stopped ${workerId}`)
    workerId = null
  }
}

/**
 * Process next available job
 */
async function processNextJob(): Promise<void> {
  if (!workerId) {
    return
  }

  const db = getDb()
  const job = acquireJob(db, workerId)

  if (!job) {
    // No jobs available
    return
  }

  console.log(`[worker] Acquired job ${job.id} (type: ${job.type}, attempt: ${job.attempt})`)

  try {
    // Process job based on type
    await processJob(db, job)

    // Mark as completed
    completeJob(db, job.id)
    console.log(`[worker] Completed job ${job.id}`)
  } catch (error) {
    console.error(`[worker] Job ${job.id} failed:`, error)

    // Handle failure with retry logic
    await handleJobFailure(db, job, error as Error)
  }
}

/**
 * Process job by type
 */
async function processJob(db: Database, job: Job): Promise<void> {
  switch (job.type) {
    case 'fetch':
      await processFetchJob(db, job)
      break
    default:
      throw new Error(`Unknown job type: ${job.type}`)
  }
}

/**
 * Handle job failure with retry logic
 */
async function handleJobFailure(db: Database, job: Job, error: Error): Promise<void> {
  const nextAttempt = job.attempt + 1

  if (nextAttempt >= MAX_ATTEMPTS) {
    // Max retries reached - mark as failed
    console.log(`[worker] Job ${job.id} failed after ${nextAttempt} attempts`)
    failJob(db, job.id, error.message)
    failItem(db, job.item_id, error.message)
  } else {
    // Schedule retry with exponential backoff
    const delayMinutes = Math.pow(2, nextAttempt) // 2, 4, 8 minutes
    const runAfter = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString()

    console.log(`[worker] Scheduling retry ${nextAttempt} for job ${job.id} after ${delayMinutes} min`)

    retryJob(db, job.id, {
      attempt: nextAttempt,
      run_after: runAfter,
      error_message: error.message,
    })
  }
}
```

**Step 2: Test worker manually**

Start API with worker enabled:
```bash
cd apps/api
WORKER_ENABLED=1 pnpm dev
```

In another terminal, create a job:
```bash
curl -X POST http://localhost:8787/api/items \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

Expected: Worker logs should show job being picked up and processed

**Step 3: Commit**

```bash
git add src/queue/worker.ts
git commit -m "feat(api): implement worker core logic with retry mechanism"
```

---

## Task 10: Fix Database Directory Auto-Creation

**Files:**
- Modify: `apps/api/src/db/context.ts`

**Step 1: Add directory creation**

Modify `apps/api/src/db/context.ts`:

```typescript
import type { Database } from 'better-sqlite3'
import { openDb, applySchema, defaultSchemaPath } from './client.js'
import path from 'node:path'
import fs from 'node:fs'

let dbInstance: Database | null = null

export function getDb(): Database {
  if (!dbInstance) {
    const dbPath = path.join(process.cwd(), 'data', 'recall.db')

    // Ensure data directory exists
    const dataDir = path.dirname(dbPath)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
      console.log(`[db] Created directory: ${dataDir}`)
    }

    dbInstance = openDb(dbPath)
    applySchema(dbInstance, defaultSchemaPath())
  }
  return dbInstance
}

export function setDb(db: Database): void {
  dbInstance = db
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
```

**Step 2: Test**

```bash
# Remove data directory
rm -rf apps/api/data

# Start server
cd apps/api
pnpm dev

# Create item
curl -X POST http://localhost:8787/api/items \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

Expected: data directory should be created automatically

**Step 3: Commit**

```bash
git add src/db/context.ts
git commit -m "fix(api): auto-create database directory if not exists"
```

---

## Task 11: Write Integration Tests for CRUD Endpoints

**Files:**
- Create: `apps/api/src/test/items-crud.test.ts`

**Step 1: Write integration tests**

Create `apps/api/src/test/items-crud.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { app } from '../app.js'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../db/client.js'
import { setDb, closeDb } from '../db/context.js'

describe('Items CRUD Integration Tests', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())
    setDb(db)
  })

  afterEach(() => {
    closeDb()
  })

  describe('GET /api/items', () => {
    it('should return empty list', async () => {
      const res = await app.request('/api/items')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.items).toEqual([])
      expect(data.total).toBe(0)
    })

    it('should return paginated items', async () => {
      // Create 3 items
      for (let i = 1; i <= 3; i++) {
        await app.request('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: `https://example.com/${i}` }),
        })
      }

      const res = await app.request('/api/items?limit=2&offset=0')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.items).toHaveLength(2)
      expect(data.total).toBe(3)
    })

    it('should filter by status', async () => {
      const res1 = await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/1' }),
      })
      const item1 = await res1.json()

      // Mark as completed
      db.prepare('UPDATE items SET status = ? WHERE id = ?').run('completed', item1.id)

      const res = await app.request('/api/items?status=completed')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.items).toHaveLength(1)
      expect(data.items[0].status).toBe('completed')
    })

    it('should filter by domain', async () => {
      await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/1' }),
      })

      await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://other.com/1' }),
      })

      const res = await app.request('/api/items?domain=example.com')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.items).toHaveLength(1)
      expect(data.items[0].domain).toBe('example.com')
    })

    it('should sort by created_at asc', async () => {
      await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/1' }),
      })

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10))

      await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/2' }),
      })

      const res = await app.request('/api/items?sort_by=created_at&sort_order=asc')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.items[0].url).toBe('https://example.com/1')
      expect(data.items[1].url).toBe('https://example.com/2')
    })
  })

  describe('GET /api/items/:id', () => {
    it('should return item by id', async () => {
      const createRes = await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' }),
      })
      const created = await createRes.json()

      const res = await app.request(`/api/items/${created.id}`)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe(created.id)
      expect(data.url).toBe('https://example.com')
    })

    it('should return 404 for non-existent item', async () => {
      const res = await app.request('/api/items/item_nonexistent')
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('NOT_FOUND')
    })
  })

  describe('PATCH /api/items/:id', () => {
    it('should update summary', async () => {
      const createRes = await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' }),
      })
      const created = await createRes.json()

      const res = await app.request(`/api/items/${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: 'My summary' }),
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.summary).toBe('My summary')
      expect(data.summary_source).toBe('user')
    })

    it('should update tags', async () => {
      const createRes = await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' }),
      })
      const created = await createRes.json()

      const res = await app.request(`/api/items/${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: ['react', 'typescript'] }),
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.tags_json).toBe('["react","typescript"]')
      expect(data.tags_source).toBe('user')
    })

    it('should update note', async () => {
      const createRes = await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' }),
      })
      const created = await createRes.json()

      const res = await app.request(`/api/items/${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Read later' }),
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.note).toBe('Read later')
    })

    it('should return 404 for non-existent item', async () => {
      const res = await app.request('/api/items/item_nonexistent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Test' }),
      })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/items/:id', () => {
    it('should delete item and associated jobs', async () => {
      const createRes = await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' }),
      })
      const created = await createRes.json()

      const res = await app.request(`/api/items/${created.id}`, {
        method: 'DELETE',
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.message).toBe('Item deleted')

      // Verify deleted
      const getRes = await app.request(`/api/items/${created.id}`)
      expect(getRes.status).toBe(404)
    })

    it('should return 404 for non-existent item', async () => {
      const res = await app.request('/api/items/item_nonexistent', {
        method: 'DELETE',
      })
      expect(res.status).toBe(404)
    })
  })
})
```

**Step 2: Run tests**

Run: `cd apps/api && pnpm test -- items-crud.test.ts`

Expected: PASS (all integration tests)

**Step 3: Commit**

```bash
git add src/test/items-crud.test.ts
git commit -m "test(api): add integration tests for items CRUD endpoints"
```

---

## Task 12: Update API Documentation

**Files:**
- Modify: `apps/api/README.md`

**Step 1: Update documentation**

Modify `apps/api/README.md` to add new endpoints:

```markdown
# Recall API

Backend API for Recall link management system.

## Getting Started

```bash
pnpm install
pnpm dev
```

API runs on `http://localhost:8787`

## Running with Worker

To enable background job processing:

```bash
WORKER_ENABLED=1 pnpm dev
```

## API Endpoints

### POST /api/items

Save a new webpage URL.

**Request:**
```json
{
  "url": "https://example.com/article"
}
```

**Response (201 Created):**
```json
{
  "id": "item_V1StGXR8_Z5jdHi6",
  "url": "https://example.com/article",
  "domain": "example.com",
  "status": "pending",
  "created_at": "2026-01-19T10:30:00.000Z"
}
```

**Response (409 Conflict - Duplicate URL):**
```json
{
  "error": "DUPLICATE_URL",
  "message": "This URL has already been saved",
  "existing_item_id": "item_abc123"
}
```

---

### GET /api/items

List saved items with pagination, filtering, and sorting.

**Query Parameters:**
- `limit` (number, default: 20, max: 100) - Items per page
- `offset` (number, default: 0) - Skip items
- `status` (string) - Filter by status: `pending`, `completed`, `failed`
- `domain` (string) - Filter by exact domain
- `created_after` (ISO datetime) - Filter by creation time
- `created_before` (ISO datetime) - Filter by creation time
- `sort_by` (string, default: `created_at`) - Sort field: `created_at`, `updated_at`, `domain`
- `sort_order` (string, default: `desc`) - Sort order: `asc`, `desc`

**Response (200):**
```json
{
  "items": [
    {
      "id": "item_xxx",
      "url": "https://example.com",
      "domain": "example.com",
      "status": "completed",
      "title": "Article Title",
      "clean_text": "Extracted content...",
      "summary": null,
      "tags_json": null,
      "note": null,
      "created_at": "2026-01-19T10:30:00.000Z",
      "updated_at": "2026-01-19T10:30:05.000Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

### GET /api/items/:id

Get a single item by ID.

**Response (200):**
```json
{
  "id": "item_xxx",
  "url": "https://example.com",
  "domain": "example.com",
  "status": "completed",
  "title": "Article Title",
  "clean_text": "Extracted content...",
  "summary": null,
  "tags_json": null,
  "note": null,
  "created_at": "2026-01-19T10:30:00.000Z",
  "updated_at": "2026-01-19T10:30:05.000Z"
}
```

**Response (404 Not Found):**
```json
{
  "error": "NOT_FOUND",
  "message": "Item not found"
}
```

---

### PATCH /api/items/:id

Update item metadata (user editable fields).

**Request:**
```json
{
  "summary": "Custom summary text",
  "tags": ["react", "typescript", "tutorial"],
  "note": "Read this later"
}
```

All fields are optional. Only provided fields will be updated.

**Response (200):**
Returns the updated item (same format as GET /api/items/:id)

---

### DELETE /api/items/:id

Delete an item and all associated jobs.

**Response (200):**
```json
{
  "message": "Item deleted",
  "deleted_jobs": 1
}
```

**Response (404 Not Found):**
```json
{
  "error": "NOT_FOUND",
  "message": "Item not found"
}
```

---

## Background Worker

The worker processes background jobs:

### Fetch Job
- Downloads webpage HTML
- Extracts main content using Readability
- Updates item with title and clean text
- Marks item as `completed` or `failed`

### Retry Logic
- Max 3 attempts per job
- Exponential backoff: 2, 4, 8 minutes
- Jobs are locked to prevent concurrent processing

## URL Normalization

URLs are normalized before duplicate detection:
- HTTP upgraded to HTTPS
- Hostname lowercased
- Trailing slashes removed
- Tracking parameters removed (utm_*, fbclid, gclid, etc.)
- Meaningful parameters preserved (id, q, page, v, etc.)

Examples:
- `http://Example.com/` → `https://example.com`
- `https://example.com/article?utm_source=twitter&id=123` → `https://example.com/article?id=123`

## Testing

```bash
pnpm test
```

## Dependencies

- **@mozilla/readability** - Article content extraction
- **jsdom** - DOM environment for Readability
- **nanoid** - ID generation
- **better-sqlite3** - SQLite database
- **hono** - Web framework
- **zod** - Schema validation
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs(api): update API documentation with CRUD and worker info"
```

---

## Completion Checklist

- [ ] Install @mozilla/readability, jsdom dependencies
- [ ] Implement listItems and getItemById database functions
- [ ] Implement updateItem and deleteItem database functions
- [ ] Implement GET /items endpoint with pagination/filtering/sorting
- [ ] Implement GET /items/:id endpoint
- [ ] Implement PATCH /items/:id endpoint
- [ ] Implement DELETE /items/:id endpoint
- [ ] Create jobs database access layer with locking
- [ ] Create fetch job processor with readability
- [ ] Implement worker core logic with retry mechanism
- [ ] Fix database directory auto-creation
- [ ] Write integration tests for CRUD endpoints
- [ ] Update API documentation

## Testing the Complete System

After implementing all tasks:

1. **Start API with worker:**
   ```bash
   cd apps/api
   WORKER_ENABLED=1 pnpm dev
   ```

2. **Create an item:**
   ```bash
   curl -X POST http://localhost:8787/api/items \
     -H "Content-Type: application/json" \
     -d '{"url":"https://example.com"}'
   ```

3. **Watch worker process the job** (check server logs)

4. **List items:**
   ```bash
   curl "http://localhost:8787/api/items"
   ```

5. **Get item details:**
   ```bash
   curl "http://localhost:8787/api/items/item_xxx"
   ```

6. **Update item:**
   ```bash
   curl -X PATCH "http://localhost:8787/api/items/item_xxx" \
     -H "Content-Type: application/json" \
     -d '{"summary":"Great article","tags":["tech"],"note":"Must read"}'
   ```

7. **Delete item:**
   ```bash
   curl -X DELETE "http://localhost:8787/api/items/item_xxx"
   ```

## Future Enhancements

After this plan is complete, consider:
- AI processing job type (generate summary and tags)
- Full-text search with FTS
- Chat/RAG functionality
- Events SSE for real-time updates
- Rate limiting and authentication
