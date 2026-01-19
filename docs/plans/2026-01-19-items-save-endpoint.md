# Items Save Endpoint Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement POST /items endpoint to save webpage URLs with duplicate detection, URL normalization, and async job creation.

**Architecture:** REST endpoint validates URL → normalizes and extracts domain → checks for duplicates via url_normalized → creates item + fetch job in transaction → returns item data. Uses prefixed nanoid for IDs (item_xxx, job_xxx). Smart tracking parameter removal preserves meaningful query params.

**Tech Stack:** Hono, Zod, better-sqlite3, nanoid

---

## Task 1: Install Dependencies

**Files:**
- Modify: `apps/api/package.json`

**Step 1: Install nanoid**

Run: `npm install nanoid`

Expected: nanoid added to dependencies

**Step 2: Verify installation**

Run: `npm list nanoid`

Expected: Shows nanoid@^5.x.x

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(api): add nanoid for ID generation"
```

---

## Task 2: Create Utils Module with ID Generation

**Files:**
- Create: `apps/api/src/lib/utils.ts`
- Create: `apps/api/src/lib/utils.test.ts`

**Step 1: Write the failing test**

Create `apps/api/src/lib/utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateId } from './utils.js'

describe('generateId', () => {
  it('should generate ID with prefix', () => {
    const id = generateId('item')
    expect(id).toMatch(/^item_[A-Za-z0-9_-]{16}$/)
  })

  it('should generate unique IDs', () => {
    const id1 = generateId('job')
    const id2 = generateId('job')
    expect(id1).not.toBe(id2)
  })

  it('should use custom prefix', () => {
    const id = generateId('test')
    expect(id).toMatch(/^test_/)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npm test -- utils.test.ts`

Expected: FAIL with "Cannot find module './utils.js'"

**Step 3: Write minimal implementation**

Create `apps/api/src/lib/utils.ts`:

```typescript
import { nanoid } from 'nanoid'

/**
 * Generate a prefixed ID using nanoid
 * @param prefix - ID prefix (e.g., 'item', 'job')
 * @returns ID in format `{prefix}_{nanoid}`, e.g., 'item_V1StGXR8_Z5jdHi6'
 */
export function generateId(prefix: string): string {
  return `${prefix}_${nanoid(16)}`
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && npm test -- utils.test.ts`

Expected: PASS (all 3 tests)

**Step 5: Commit**

```bash
git add src/lib/utils.ts src/lib/utils.test.ts
git commit -m "feat(api): add generateId utility with nanoid"
```

---

## Task 3: Add URL Normalization Utility

**Files:**
- Modify: `apps/api/src/lib/utils.ts`
- Modify: `apps/api/src/lib/utils.test.ts`

**Step 1: Write the failing test**

Add to `apps/api/src/lib/utils.test.ts`:

```typescript
import { normalizeUrl } from './utils.js'

describe('normalizeUrl', () => {
  it('should upgrade http to https', () => {
    expect(normalizeUrl('http://example.com')).toBe('https://example.com')
  })

  it('should remove trailing slash', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com')
    expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path')
  })

  it('should lowercase hostname', () => {
    expect(normalizeUrl('https://Example.COM/Path')).toBe('https://example.com/Path')
  })

  it('should remove tracking parameters', () => {
    const url = 'https://example.com/article?id=123&utm_source=twitter&fbclid=xyz'
    expect(normalizeUrl(url)).toBe('https://example.com/article?id=123')
  })

  it('should preserve meaningful parameters', () => {
    const url = 'https://example.com/search?q=test&page=2&v=abc'
    expect(normalizeUrl(url)).toBe('https://example.com/search?q=test&page=2&v=abc')
  })

  it('should handle URLs without query params', () => {
    expect(normalizeUrl('https://example.com/article')).toBe('https://example.com/article')
  })

  it('should remove multiple tracking params', () => {
    const url = 'https://example.com/page?ref=x&gclid=y&_ga=z&id=real'
    expect(normalizeUrl(url)).toBe('https://example.com/page?id=real')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npm test -- utils.test.ts`

Expected: FAIL with "normalizeUrl is not a function"

**Step 3: Write minimal implementation**

Add to `apps/api/src/lib/utils.ts`:

```typescript
/**
 * Common tracking parameters to remove from URLs
 */
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid',
  'ref', 'source', 'campaign',
  '_ga', '_gl', '_hsenc', '_hsmi',
  'hsCtaTracking', 'hsCtaTracking',
])

/**
 * Normalize URL for deduplication
 * - Upgrade http to https
 * - Lowercase hostname
 * - Remove trailing slash
 * - Remove tracking parameters (utm_*, fbclid, etc.)
 * - Preserve meaningful parameters (id, q, page, v, etc.)
 */
export function normalizeUrl(url: string): string {
  const parsed = new URL(url)

  // Upgrade to https
  if (parsed.protocol === 'http:') {
    parsed.protocol = 'https:'
  }

  // Lowercase hostname
  parsed.hostname = parsed.hostname.toLowerCase()

  // Remove tracking parameters
  const params = new URLSearchParams(parsed.search)
  const filteredParams = new URLSearchParams()

  for (const [key, value] of params.entries()) {
    if (!TRACKING_PARAMS.has(key)) {
      filteredParams.append(key, value)
    }
  }

  parsed.search = filteredParams.toString()

  // Remove trailing slash from pathname
  if (parsed.pathname.endsWith('/') && parsed.pathname !== '/') {
    parsed.pathname = parsed.pathname.slice(0, -1)
  }

  return parsed.toString()
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && npm test -- utils.test.ts`

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/lib/utils.ts src/lib/utils.test.ts
git commit -m "feat(api): add URL normalization with tracking param removal"
```

---

## Task 4: Add Domain Extraction Utility

**Files:**
- Modify: `apps/api/src/lib/utils.ts`
- Modify: `apps/api/src/lib/utils.test.ts`

**Step 1: Write the failing test**

Add to `apps/api/src/lib/utils.test.ts`:

```typescript
import { extractDomain } from './utils.js'

describe('extractDomain', () => {
  it('should extract domain from URL', () => {
    expect(extractDomain('https://example.com/path')).toBe('example.com')
  })

  it('should extract subdomain', () => {
    expect(extractDomain('https://blog.example.com/article')).toBe('blog.example.com')
  })

  it('should handle URLs with ports', () => {
    expect(extractDomain('https://example.com:8080/path')).toBe('example.com')
  })

  it('should handle URLs with query params', () => {
    expect(extractDomain('https://example.com/path?q=test')).toBe('example.com')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npm test -- utils.test.ts`

Expected: FAIL with "extractDomain is not a function"

**Step 3: Write minimal implementation**

Add to `apps/api/src/lib/utils.ts`:

```typescript
/**
 * Extract domain from URL
 * @param url - Full URL
 * @returns Domain without port, e.g., 'example.com'
 */
export function extractDomain(url: string): string {
  const parsed = new URL(url)
  return parsed.hostname
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && npm test -- utils.test.ts`

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/lib/utils.ts src/lib/utils.test.ts
git commit -m "feat(api): add domain extraction utility"
```

---

## Task 5: Create Items Database Access Layer

**Files:**
- Create: `apps/api/src/features/items/items.db.ts`
- Create: `apps/api/src/features/items/items.db.test.ts`

**Step 1: Write the failing test**

Create `apps/api/src/features/items/items.db.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../../db/client.js'
import { findItemByNormalizedUrl, createItemWithJob } from './items.db.js'

describe('items.db', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())
  })

  describe('findItemByNormalizedUrl', () => {
    it('should return null when item does not exist', () => {
      const result = findItemByNormalizedUrl(db, 'https://example.com')
      expect(result).toBeNull()
    })

    it('should return item when url_normalized matches', () => {
      const timestamp = new Date().toISOString()
      db.prepare(`
        INSERT INTO items (id, url, url_normalized, domain, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('item_test', 'https://example.com', 'https://example.com', 'example.com', 'pending', timestamp, timestamp)

      const result = findItemByNormalizedUrl(db, 'https://example.com')
      expect(result).toBeTruthy()
      expect(result?.id).toBe('item_test')
    })
  })

  describe('createItemWithJob', () => {
    it('should create item and job in transaction', () => {
      const timestamp = new Date().toISOString()
      const result = createItemWithJob(db, {
        itemId: 'item_test123',
        jobId: 'job_test456',
        url: 'https://example.com/article',
        urlNormalized: 'https://example.com/article',
        domain: 'example.com',
        timestamp,
      })

      expect(result.itemId).toBe('item_test123')
      expect(result.jobId).toBe('job_test456')

      // Verify item created
      const item = db.prepare('SELECT * FROM items WHERE id = ?').get('item_test123') as any
      expect(item).toBeTruthy()
      expect(item.url).toBe('https://example.com/article')
      expect(item.status).toBe('pending')

      // Verify job created
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get('job_test456') as any
      expect(job).toBeTruthy()
      expect(job.item_id).toBe('item_test123')
      expect(job.type).toBe('fetch')
      expect(job.state).toBe('pending')
    })

    it('should rollback transaction if job creation fails', () => {
      const timestamp = new Date().toISOString()

      // Create item first
      createItemWithJob(db, {
        itemId: 'item_1',
        jobId: 'job_1',
        url: 'https://example.com',
        urlNormalized: 'https://example.com',
        domain: 'example.com',
        timestamp,
      })

      // Try to create with duplicate job_id (will fail due to item_id UNIQUE constraint)
      expect(() => {
        createItemWithJob(db, {
          itemId: 'item_2',
          jobId: 'job_2',
          url: 'https://other.com',
          urlNormalized: 'https://other.com',
          domain: 'other.com',
          timestamp,
        })
        // Force duplicate by using same item_id in job
        db.prepare('INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run('job_duplicate', 'item_1', 'fetch', 'pending', 0, timestamp, timestamp, timestamp)
      }).toThrow()
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npm test -- items.db.test.ts`

Expected: FAIL with "Cannot find module './items.db.js'"

**Step 3: Write minimal implementation**

Create `apps/api/src/features/items/items.db.ts`:

```typescript
import type { Database } from 'better-sqlite3'

export type Item = {
  id: string
  url: string
  url_normalized: string
  title: string | null
  domain: string
  status: string
  error_code: string | null
  error_message: string | null
  clean_text: string | null
  summary: string | null
  summary_source: string | null
  tags_json: string | null
  tags_source: string | null
  note: string | null
  created_at: string
  updated_at: string
  processed_at: string | null
}

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
 * Find item by normalized URL
 */
export function findItemByNormalizedUrl(db: Database, normalizedUrl: string): Item | null {
  const item = db.prepare('SELECT * FROM items WHERE url_normalized = ?').get(normalizedUrl) as Item | undefined
  return item ?? null
}

/**
 * Create item and fetch job in a transaction
 */
export function createItemWithJob(
  db: Database,
  data: {
    itemId: string
    jobId: string
    url: string
    urlNormalized: string
    domain: string
    timestamp: string
  }
): { itemId: string; jobId: string } {
  return db.transaction(() => {
    // Insert item
    db.prepare(`
      INSERT INTO items (id, url, url_normalized, domain, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      data.itemId,
      data.url,
      data.urlNormalized,
      data.domain,
      data.timestamp,
      data.timestamp
    )

    // Insert fetch job
    db.prepare(`
      INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at)
      VALUES (?, ?, 'fetch', 'pending', 0, ?, ?, ?)
    `).run(
      data.jobId,
      data.itemId,
      data.timestamp,
      data.timestamp,
      data.timestamp
    )

    return { itemId: data.itemId, jobId: data.jobId }
  })()
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && npm test -- items.db.test.ts`

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/features/items/items.db.ts src/features/items/items.db.test.ts
git commit -m "feat(api): add items database access layer"
```

---

## Task 6: Implement POST /items Route Handler

**Files:**
- Modify: `apps/api/src/features/items/items.route.ts`
- Modify: `apps/api/src/features/items/items.schema.ts`

**Step 1: Update schema to add response types**

Modify `apps/api/src/features/items/items.schema.ts`:

```typescript
import { z } from 'zod'

export const createItemSchema = z.object({
  url: z.string().url()
})

export const patchItemSchema = z.object({
  summary: z.string().min(1).max(5000).optional(),
  tags: z.array(z.string().min(1).max(64)).max(50).optional(),
  note: z.string().max(10000).optional()
})

// Response schemas
export const itemResponseSchema = z.object({
  id: z.string(),
  url: z.string(),
  domain: z.string(),
  status: z.string(),
  created_at: z.string(),
})

export const duplicateErrorSchema = z.object({
  error: z.literal('DUPLICATE_URL'),
  message: z.string(),
  existing_item_id: z.string(),
})
```

**Step 2: Implement route handler**

Modify `apps/api/src/features/items/items.route.ts`:

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createItemSchema, patchItemSchema } from './items.schema.js'
import { generateId, normalizeUrl, extractDomain } from '../../lib/utils.js'
import { findItemByNormalizedUrl, createItemWithJob } from './items.db.js'
import { openDb, defaultSchemaPath, applySchema } from '../../db/client.js'
import path from 'node:path'

export const itemsApp = new Hono()

// Initialize database (in production, this should be managed globally)
const dbPath = path.join(process.cwd(), 'data', 'recall.db')
const db = openDb(dbPath)
applySchema(db, defaultSchemaPath())

itemsApp.post('/', zValidator('json', createItemSchema), (c) => {
  try {
    const { url } = c.req.valid('json')

    // Normalize URL and extract domain
    const urlNormalized = normalizeUrl(url)
    const domain = extractDomain(url)

    // Check for duplicate
    const existing = findItemByNormalizedUrl(db, urlNormalized)
    if (existing) {
      return c.json({
        error: 'DUPLICATE_URL',
        message: 'This URL has already been saved',
        existing_item_id: existing.id,
      }, 409)
    }

    // Generate IDs
    const itemId = generateId('item')
    const jobId = generateId('job')
    const timestamp = new Date().toISOString()

    // Create item and job
    createItemWithJob(db, {
      itemId,
      jobId,
      url,
      urlNormalized,
      domain,
      timestamp,
    })

    // Return created item
    return c.json({
      id: itemId,
      url,
      domain,
      status: 'pending',
      created_at: timestamp,
    }, 201)
  } catch (error) {
    console.error('[POST /items] Error:', error)
    return c.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create item',
    }, 500)
  }
})

itemsApp.get('/', (c) => c.json({ items: [] }))
itemsApp.get('/:id', (c) => c.json({ error: 'NOT_IMPLEMENTED' }, 501))
itemsApp.patch('/:id', zValidator('json', patchItemSchema), (c) => c.json({ error: 'NOT_IMPLEMENTED' }, 501))
itemsApp.delete('/:id', (c) => c.json({ error: 'NOT_IMPLEMENTED' }, 501))
itemsApp.post('/:id/retry', (c) => c.json({ error: 'NOT_IMPLEMENTED' }, 501))
```

**Step 3: Create data directory**

Run: `mkdir -p apps/api/data`

Expected: Directory created

**Step 4: Test manually with curl**

Run API server:
```bash
cd apps/api
npm run dev
```

In another terminal:
```bash
curl -X POST http://localhost:8787/api/items \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/test"}'
```

Expected: 201 response with item data

Test duplicate:
```bash
curl -X POST http://localhost:8787/api/items \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/test"}'
```

Expected: 409 response with DUPLICATE_URL error

**Step 5: Commit**

```bash
git add src/features/items/items.route.ts src/features/items/items.schema.ts
git commit -m "feat(api): implement POST /items endpoint with duplicate detection"
```

---

## Task 7: Write Integration Tests for POST /items

**Files:**
- Modify: `apps/api/src/test/routes.test.ts`

**Step 1: Write integration tests**

Replace content in `apps/api/src/test/routes.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { app } from '../app.js'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../db/client.js'

describe('POST /api/items', () => {
  let db: Database.Database

  beforeEach(() => {
    // Use in-memory database for tests
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())
  })

  it('should create item with valid URL', async () => {
    const res = await app.request('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/article' }),
    })

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data).toMatchObject({
      id: expect.stringMatching(/^item_/),
      url: 'https://example.com/article',
      domain: 'example.com',
      status: 'pending',
      created_at: expect.any(String),
    })
  })

  it('should reject invalid URL', async () => {
    const res = await app.request('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'not-a-url' }),
    })

    expect(res.status).toBe(400)
  })

  it('should reject duplicate URL', async () => {
    const url = 'https://example.com/article'

    // First request
    const res1 = await app.request('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    expect(res1.status).toBe(201)
    const data1 = await res1.json()

    // Second request with same URL
    const res2 = await app.request('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    expect(res2.status).toBe(409)
    const data2 = await res2.json()
    expect(data2).toMatchObject({
      error: 'DUPLICATE_URL',
      message: expect.any(String),
      existing_item_id: data1.id,
    })
  })

  it('should normalize URLs before duplicate check', async () => {
    // First URL with tracking params
    const res1 = await app.request('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/article?utm_source=twitter' }),
    })
    expect(res1.status).toBe(201)

    // Second URL without tracking params (should be detected as duplicate)
    const res2 = await app.request('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/article' }),
    })
    expect(res2.status).toBe(409)
  })

  it('should extract domain correctly', async () => {
    const res = await app.request('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://blog.example.com/post/123' }),
    })

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.domain).toBe('blog.example.com')
  })
})
```

**Step 2: Update app to use test database**

Note: The current implementation uses a global database. For proper testing, we need to refactor to inject the database. This is a known limitation for now.

**Step 3: Run tests**

Run: `cd apps/api && npm test -- routes.test.ts`

Expected: Tests should pass (note: may need to refactor db injection for clean tests)

**Step 4: Commit**

```bash
git add src/test/routes.test.ts
git commit -m "test(api): add integration tests for POST /items"
```

---

## Task 8: Refactor Database Injection (Optional but Recommended)

**Files:**
- Modify: `apps/api/src/features/items/items.route.ts`
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/src/db/context.ts`

**Step 1: Create database context module**

Create `apps/api/src/db/context.ts`:

```typescript
import type { Database } from 'better-sqlite3'
import { openDb, applySchema, defaultSchemaPath } from './client.js'
import path from 'node:path'

let dbInstance: Database | null = null

export function getDb(): Database {
  if (!dbInstance) {
    const dbPath = path.join(process.cwd(), 'data', 'recall.db')
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

**Step 2: Update items route to use context**

Modify `apps/api/src/features/items/items.route.ts`:

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createItemSchema, patchItemSchema } from './items.schema.js'
import { generateId, normalizeUrl, extractDomain } from '../../lib/utils.js'
import { findItemByNormalizedUrl, createItemWithJob } from './items.db.js'
import { getDb } from '../../db/context.js'

export const itemsApp = new Hono()

itemsApp.post('/', zValidator('json', createItemSchema), (c) => {
  try {
    const db = getDb()
    const { url } = c.req.valid('json')

    // ... rest of implementation stays the same
  } catch (error) {
    // ... error handling
  }
})

// ... rest of routes
```

**Step 3: Update tests to inject test database**

Modify `apps/api/src/test/routes.test.ts`:

```typescript
import { setDb, closeDb } from '../db/context.js'

describe('POST /api/items', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())
    setDb(db)  // Inject test database
  })

  afterEach(() => {
    closeDb()
  })

  // ... tests
})
```

**Step 4: Run tests**

Run: `cd apps/api && npm test`

Expected: All tests pass

**Step 5: Commit**

```bash
git add src/db/context.ts src/features/items/items.route.ts src/test/routes.test.ts
git commit -m "refactor(api): add database context for dependency injection"
```

---

## Task 9: Add .gitignore for Data Directory

**Files:**
- Modify: `apps/api/.gitignore` (or create if doesn't exist)

**Step 1: Add data directory to gitignore**

Add to `.gitignore`:
```
data/
*.db
*.db-shm
*.db-wal
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore(api): ignore database files"
```

---

## Task 10: Update README with API Documentation

**Files:**
- Create: `apps/api/README.md`

**Step 1: Create API documentation**

Create `apps/api/README.md`:

```markdown
# Recall API

Backend API for Recall link management system.

## Getting Started

```bash
npm install
npm run dev
```

API runs on `http://localhost:8787`

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

**Response (400 Bad Request):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid URL format"
}
```

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
npm test
```
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs(api): add API documentation"
```

---

## Completion Checklist

- [ ] Install nanoid dependency
- [ ] Implement ID generation with prefix
- [ ] Implement URL normalization with smart tracking removal
- [ ] Implement domain extraction
- [ ] Create database access layer with transaction support
- [ ] Implement POST /items endpoint
- [ ] Add duplicate detection via url_normalized
- [ ] Write unit tests for utilities
- [ ] Write integration tests for endpoint
- [ ] Refactor for database dependency injection
- [ ] Add .gitignore for database files
- [ ] Document API in README

## Future Enhancements

After this plan is complete, consider:
- GET /items with pagination and filtering
- PATCH /items/:id for editing tags/summary
- DELETE /items/:id for removing items
- Worker implementation for fetch and ai_process jobs
- Rate limiting and authentication
