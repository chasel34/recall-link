# AI Processing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement automatic tag and summary generation using Google Gemini via ai-sdk, with semantic tag merging and manual retry support.

**Architecture:** AI processing triggered after fetch job completion. Uses ai-sdk (v6) with Google Gemini for two-step generation: (1) generate tags and summary, (2) merge tags semantically with existing tags. Tags stored in independent table with many-to-many relationship to items.

**Tech Stack:** ai-sdk v6, @ai-sdk/google, Zod, SQLite

---

## Dependencies Required

**IMPORTANT:** Before starting, you need to install these dependencies:

```bash
cd apps/api
pnpm add ai @ai-sdk/google
```

**IMPORTANT:** Before implementing AI service (Task 4), use Context7 to get ai-sdk documentation:

```
Use mcp__context7__resolve-library-id to find "ai-sdk" or "vercel ai-sdk"
Use mcp__context7__query-docs with the library ID to get documentation for:
- How to use generateObject with Google Gemini
- How to configure Google provider with custom baseURL
- Schema validation with Zod
```

Do NOT proceed with Task 4 until you have the ai-sdk documentation.

---

## Task 1: Update Database Schema

**Files:**
- Modify: `apps/api/src/db/schema.sql`

**Step 1: Add tags tables to schema**

Add to `apps/api/src/db/schema.sql` after items table:

```sql
-- Tags table (independent management)
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  item_count INTEGER DEFAULT 0
);

-- Item-Tags many-to-many relationship
CREATE TABLE IF NOT EXISTS item_tags (
  item_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (item_id, tag_id),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_item_tags_item_id ON item_tags(item_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id ON item_tags(tag_id);
```

**Step 2: Test schema creation**

Run:
```bash
cd apps/api
rm -f data/recall.db
pnpm dev
```

In another terminal:
```bash
sqlite3 apps/api/data/recall.db ".schema tags"
sqlite3 apps/api/data/recall.db ".schema item_tags"
```

Expected: Shows CREATE TABLE statements for both tables

**Step 3: Commit**

```bash
git add src/db/schema.sql
git commit -m "feat(db): add tags and item_tags tables for tag management"
```

---

## Task 2: Create Tags Database Access Layer

**Files:**
- Create: `apps/api/src/features/tags/tags.db.ts`
- Create: `apps/api/src/features/tags/tags.db.test.ts`

**Step 1: Write the failing test**

Create `apps/api/src/features/tags/tags.db.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../../db/client.js'
import {
  findOrCreateTag,
  setItemTags,
  getItemTags,
  getAllTagNames,
  listTags,
} from './tags.db.js'

describe('tags.db', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())

    // Create test item
    const timestamp = new Date().toISOString()
    db.prepare(`
      INSERT INTO items (id, url, url_normalized, domain, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('item_test', 'https://example.com', 'https://example.com', 'example.com', 'pending', timestamp, timestamp)
  })

  describe('findOrCreateTag', () => {
    it('should create new tag if not exists', () => {
      const tagId = findOrCreateTag(db, 'React')
      expect(tagId).toMatch(/^tag_/)

      const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(tagId) as any
      expect(tag.name).toBe('React')
      expect(tag.item_count).toBe(0)
    })

    it('should return existing tag if already exists', () => {
      const id1 = findOrCreateTag(db, 'React')
      const id2 = findOrCreateTag(db, 'React')
      expect(id1).toBe(id2)

      const count = db.prepare('SELECT COUNT(*) as count FROM tags').get() as { count: number }
      expect(count.count).toBe(1)
    })
  })

  describe('setItemTags', () => {
    it('should set tags for item', () => {
      setItemTags(db, 'item_test', ['React', 'TypeScript', '前端'])

      const tags = getItemTags(db, 'item_test')
      expect(tags).toEqual(['React', 'TypeScript', '前端'])
    })

    it('should replace existing tags', () => {
      setItemTags(db, 'item_test', ['React', 'TypeScript'])
      setItemTags(db, 'item_test', ['Vue', 'JavaScript'])

      const tags = getItemTags(db, 'item_test')
      expect(tags).toEqual(['JavaScript', 'Vue']) // Sorted
    })

    it('should update item_count for tags', () => {
      setItemTags(db, 'item_test', ['React', 'TypeScript'])

      const react = db.prepare('SELECT item_count FROM tags WHERE name = ?').get('React') as { item_count: number }
      expect(react.item_count).toBe(1)
    })

    it('should delete item_tags when setting empty array', () => {
      setItemTags(db, 'item_test', ['React'])
      setItemTags(db, 'item_test', [])

      const tags = getItemTags(db, 'item_test')
      expect(tags).toEqual([])
    })
  })

  describe('getItemTags', () => {
    it('should return empty array if no tags', () => {
      const tags = getItemTags(db, 'item_test')
      expect(tags).toEqual([])
    })

    it('should return sorted tag names', () => {
      setItemTags(db, 'item_test', ['Vue', 'React', 'Angular'])
      const tags = getItemTags(db, 'item_test')
      expect(tags).toEqual(['Angular', 'React', 'Vue'])
    })
  })

  describe('getAllTagNames', () => {
    it('should return empty array if no tags', () => {
      const tags = getAllTagNames(db)
      expect(tags).toEqual([])
    })

    it('should return all tag names sorted', () => {
      findOrCreateTag(db, 'Vue')
      findOrCreateTag(db, 'React')
      findOrCreateTag(db, 'Angular')

      const tags = getAllTagNames(db)
      expect(tags).toEqual(['Angular', 'React', 'Vue'])
    })
  })

  describe('listTags', () => {
    it('should return empty array if no tags', () => {
      const tags = listTags(db)
      expect(tags).toEqual([])
    })

    it('should return tags with metadata', () => {
      setItemTags(db, 'item_test', ['React', 'TypeScript'])

      const tags = listTags(db)
      expect(tags).toHaveLength(2)
      expect(tags[0]).toMatchObject({
        id: expect.stringMatching(/^tag_/),
        name: expect.any(String),
        item_count: 1,
        created_at: expect.any(String),
      })
    })

    it('should sort by item_count desc then name asc', () => {
      // Create another item
      const timestamp = new Date().toISOString()
      db.prepare(`
        INSERT INTO items (id, url, url_normalized, domain, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('item_test2', 'https://example.com/2', 'https://example.com/2', 'example.com', 'pending', timestamp, timestamp)

      setItemTags(db, 'item_test', ['React', 'Vue'])
      setItemTags(db, 'item_test2', ['React'])

      const tags = listTags(db)
      expect(tags[0].name).toBe('React') // item_count = 2
      expect(tags[0].item_count).toBe(2)
      expect(tags[1].name).toBe('Vue') // item_count = 1
      expect(tags[1].item_count).toBe(1)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pnpm test -- tags.db.test.ts`

Expected: FAIL with "Cannot find module './tags.db.js'"

**Step 3: Write minimal implementation**

Create `apps/api/src/features/tags/tags.db.ts`:

```typescript
import type { Database } from 'better-sqlite3'
import { generateId } from '../../lib/utils.js'

export type Tag = {
  id: string
  name: string
  created_at: string
  item_count: number
}

/**
 * Find tag by name or create if not exists
 */
export function findOrCreateTag(db: Database, name: string): string {
  // Try to find existing tag
  const existing = db.prepare('SELECT id FROM tags WHERE name = ?').get(name) as { id: string } | undefined

  if (existing) {
    return existing.id
  }

  // Create new tag
  const id = generateId('tag')
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO tags (id, name, created_at, item_count)
    VALUES (?, ?, ?, 0)
  `).run(id, name, now)

  return id
}

/**
 * Set tags for an item (replaces existing tags)
 */
export function setItemTags(db: Database, itemId: string, tagNames: string[]): void {
  db.transaction(() => {
    // Delete existing item_tags
    db.prepare('DELETE FROM item_tags WHERE item_id = ?').run(itemId)

    // Create new item_tags
    const now = new Date().toISOString()
    for (const name of tagNames) {
      const tagId = findOrCreateTag(db, name)
      db.prepare(`
        INSERT INTO item_tags (item_id, tag_id, created_at)
        VALUES (?, ?, ?)
      `).run(itemId, tagId, now)
    }

    // Update all tag counts
    db.prepare(`
      UPDATE tags
      SET item_count = (
        SELECT COUNT(*) FROM item_tags WHERE tag_id = tags.id
      )
    `).run()
  })()
}

/**
 * Get tag names for an item (sorted)
 */
export function getItemTags(db: Database, itemId: string): string[] {
  const tags = db.prepare(`
    SELECT t.name
    FROM tags t
    JOIN item_tags it ON t.id = it.tag_id
    WHERE it.item_id = ?
    ORDER BY t.name ASC
  `).all(itemId) as { name: string }[]

  return tags.map(t => t.name)
}

/**
 * Get all tag names (sorted)
 */
export function getAllTagNames(db: Database): string[] {
  const tags = db.prepare('SELECT name FROM tags ORDER BY name ASC').all() as { name: string }[]
  return tags.map(t => t.name)
}

/**
 * List all tags with metadata
 */
export function listTags(db: Database): Tag[] {
  return db.prepare(`
    SELECT id, name, item_count, created_at
    FROM tags
    ORDER BY item_count DESC, name ASC
  `).all() as Tag[]
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && pnpm test -- tags.db.test.ts`

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/features/tags/tags.db.ts src/features/tags/tags.db.test.ts
git commit -m "feat(api): add tags database access layer"
```

---

## Task 3: Create AI Configuration Management

**Files:**
- Create: `apps/api/src/config/ai.config.ts`
- Create: `apps/api/src/config/ai.config.test.ts`
- Create: `apps/api/config/ai.json`

**Step 1: Write the failing test**

Create `apps/api/src/config/ai.config.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getAIConfig } from './ai.config.js'

describe('ai.config', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Clear env vars
    delete process.env.GEMINI_BASE_URL
    delete process.env.GEMINI_API_KEY
    delete process.env.GEMINI_MODEL
  })

  afterEach(() => {
    // Restore env vars
    process.env = { ...originalEnv }
  })

  it('should load config from environment variables', () => {
    process.env.GEMINI_BASE_URL = 'http://test.com/v1beta'
    process.env.GEMINI_API_KEY = 'test-key'
    process.env.GEMINI_MODEL = 'test-model'

    const config = getAIConfig()
    expect(config.baseURL).toBe('http://test.com/v1beta')
    expect(config.apiKey).toBe('test-key')
    expect(config.model).toBe('test-model')
  })

  it('should use defaults from config file', () => {
    const config = getAIConfig()
    expect(config.baseURL).toBe('http://127.0.0.1:8317/v1beta')
    expect(config.model).toBe('gemini-3-flash-preview')
  })

  it('should throw if apiKey is missing', () => {
    process.env.GEMINI_BASE_URL = 'http://test.com/v1beta'
    process.env.GEMINI_MODEL = 'test-model'
    // No API key

    expect(() => getAIConfig()).toThrow('GEMINI_API_KEY')
  })

  it('should prioritize env vars over config file', () => {
    process.env.GEMINI_API_KEY = 'env-key'
    process.env.GEMINI_MODEL = 'env-model'

    const config = getAIConfig()
    expect(config.apiKey).toBe('env-key')
    expect(config.model).toBe('env-model')
    expect(config.baseURL).toBe('http://127.0.0.1:8317/v1beta') // From config file
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pnpm test -- ai.config.test.ts`

Expected: FAIL with "Cannot find module './ai.config.js'"

**Step 3: Create default config file**

Create `apps/api/config/ai.json`:

```json
{
  "provider": "gemini",
  "gemini": {
    "baseURL": "http://127.0.0.1:8317/v1beta",
    "model": "gemini-3-flash-preview"
  }
}
```

**Step 4: Write minimal implementation**

Create `apps/api/src/config/ai.config.ts`:

```typescript
import fs from 'node:fs'
import path from 'node:path'

export type AIConfig = {
  baseURL: string
  apiKey: string
  model: string
}

type ConfigFile = {
  provider: string
  gemini: {
    baseURL: string
    model: string
  }
}

/**
 * Get AI configuration (env vars override config file)
 */
export function getAIConfig(): AIConfig {
  // Load config file
  const configPath = path.join(process.cwd(), 'config', 'ai.json')
  let fileConfig: ConfigFile | null = null

  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf-8')
    fileConfig = JSON.parse(content) as ConfigFile
  }

  // Merge: env vars override config file
  const baseURL = process.env.GEMINI_BASE_URL || fileConfig?.gemini.baseURL || ''
  const apiKey = process.env.GEMINI_API_KEY || ''
  const model = process.env.GEMINI_MODEL || fileConfig?.gemini.model || ''

  // Validate required fields
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required (set via env var or config file)')
  }

  if (!baseURL) {
    throw new Error('GEMINI_BASE_URL is required (set via env var or config file)')
  }

  if (!model) {
    throw new Error('GEMINI_MODEL is required (set via env var or config file)')
  }

  return { baseURL, apiKey, model }
}
```

**Step 5: Run test to verify it passes**

Run: `cd apps/api && pnpm test -- ai.config.test.ts`

Expected: PASS (all tests)

**Step 6: Commit**

```bash
git add src/config/ai.config.ts src/config/ai.config.test.ts config/ai.json
git commit -m "feat(api): add AI configuration management"
```

---

## Task 4: Create AI Service with ai-sdk

**IMPORTANT:** Before starting this task, use Context7 to get ai-sdk documentation.

**Files:**
- Create: `apps/api/src/services/ai.service.ts`
- Create: `apps/api/src/services/ai.service.test.ts`

**Step 1: Get ai-sdk documentation from Context7**

Use Context7 MCP tools:

```typescript
// 1. Resolve library ID
mcp__context7__resolve-library-id({
  libraryName: "vercel ai-sdk",
  query: "How to use ai-sdk with Google Gemini to generate structured objects"
})

// 2. Query documentation
mcp__context7__query-docs({
  libraryId: "<resolved-library-id>",
  query: "How to use generateObject with Google Gemini provider, custom baseURL configuration, and Zod schema validation"
})
```

Study the documentation before proceeding.

**Step 2: Write the failing test**

Create `apps/api/src/services/ai.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateTagsAndSummary, mergeTagsWithExisting } from './ai.service.js'

// Mock ai-sdk
vi.mock('ai', () => ({
  generateObject: vi.fn(),
}))

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => vi.fn()),
}))

vi.mock('../config/ai.config.js', () => ({
  getAIConfig: vi.fn(() => ({
    baseURL: 'http://test.com/v1beta',
    apiKey: 'test-key',
    model: 'test-model',
  })),
}))

describe('ai.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateTagsAndSummary', () => {
    it('should generate tags and summary', async () => {
      const { generateObject } = await import('ai')
      vi.mocked(generateObject).mockResolvedValue({
        object: {
          tags: ['React', '前端', '教程'],
          summary: '这是一篇关于 React 的教程文章。',
        },
      } as any)

      const result = await generateTagsAndSummary('Test article content...')

      expect(result.tags).toEqual(['React', '前端', '教程'])
      expect(result.summary).toBe('这是一篇关于 React 的教程文章。')
      expect(generateObject).toHaveBeenCalledWith(expect.objectContaining({
        schema: expect.any(Object),
        prompt: expect.stringContaining('请分析以下文章内容'),
      }))
    })

    it('should throw error on API failure', async () => {
      const { generateObject } = await import('ai')
      vi.mocked(generateObject).mockRejectedValue(new Error('API error'))

      await expect(generateTagsAndSummary('content')).rejects.toThrow('API error')
    })
  })

  describe('mergeTagsWithExisting', () => {
    it('should return new tags if no existing tags', async () => {
      const result = await mergeTagsWithExisting(['React', 'Vue'], [])
      expect(result).toEqual(['React', 'Vue'])
    })

    it('should merge tags using AI', async () => {
      const { generateObject } = await import('ai')
      vi.mocked(generateObject).mockResolvedValue({
        object: {
          tags: ['React', '前端性能', 'TypeScript'], // Merged: react→React, 前端优化→前端性能
        },
      } as any)

      const result = await mergeTagsWithExisting(
        ['react', '前端优化', 'TypeScript'],
        ['React', '前端性能', 'JavaScript']
      )

      expect(result).toEqual(['React', '前端性能', 'TypeScript'])
      expect(generateObject).toHaveBeenCalledWith(expect.objectContaining({
        prompt: expect.stringContaining('已有标签'),
      }))
    })
  })
})
```

**Step 3: Run test to verify it fails**

Run: `cd apps/api && pnpm test -- ai.service.test.ts`

Expected: FAIL with "Cannot find module './ai.service.js'"

**Step 4: Write minimal implementation**

Create `apps/api/src/services/ai.service.ts`:

```typescript
import { generateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'
import { getAIConfig } from '../config/ai.config.js'

// Schema for tags and summary generation
const tagsAndSummarySchema = z.object({
  tags: z.array(z.string()).min(3).max(5),
  summary: z.string().max(500),
})

// Schema for tag merging
const tagMergeSchema = z.object({
  tags: z.array(z.string()).min(3).max(5),
})

/**
 * Generate tags and summary for article content
 */
export async function generateTagsAndSummary(text: string): Promise<{
  tags: string[]
  summary: string
}> {
  const config = getAIConfig()
  const google = createGoogleGenerativeAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  })

  const result = await generateObject({
    model: google(config.model),
    schema: tagsAndSummarySchema,
    prompt: `
请分析以下文章内容，生成标签和摘要。

要求：
1. 标签：3-5个，每个2-6字，使用简体中文
   - 包含主题类（如：React、经济学）
   - 包含类型类（如：教程、长文、工具页）
   - 包含领域类（如：前端、投资、历史）

2. 摘要：150字内，简体中文
   - 清晰说明文章主要内容
   - 面向未来的自己，帮助回忆
   - 包含2-3个关键信息点

文章内容：
${text}
`,
  })

  return result.object
}

/**
 * Merge new tags with existing tags using semantic similarity
 * Always prefer existing tags when similar
 */
export async function mergeTagsWithExisting(
  newTags: string[],
  existingTags: string[]
): Promise<string[]> {
  // If no existing tags, return new tags as-is
  if (existingTags.length === 0) {
    return newTags
  }

  const config = getAIConfig()
  const google = createGoogleGenerativeAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  })

  const result = await generateObject({
    model: google(config.model),
    schema: tagMergeSchema,
    prompt: `
你是一个标签合并助手。用户生成了新标签，需要与已有标签进行语义对比和合并。

规则：
1. 如果新标签与已有标签语义相近，使用已有标签
2. 如果新标签是全新的，保留新标签
3. 优先保持已有标签的一致性

已有标签：
${existingTags.join(', ')}

新生成标签：
${newTags.join(', ')}

请返回合并后的标签列表（3-5个）。
`,
  })

  return result.object.tags
}
```

**Step 5: Run test to verify it passes**

Run: `cd apps/api && pnpm test -- ai.service.test.ts`

Expected: PASS (all tests with mocks)

**Step 6: Commit**

```bash
git add src/services/ai.service.ts src/services/ai.service.test.ts
git commit -m "feat(api): add AI service with tag generation and merging"
```

---

## Task 5: Create AI Job Processor

**Files:**
- Create: `apps/api/src/queue/processors/ai.processor.ts`
- Create: `apps/api/src/queue/processors/ai.processor.test.ts`

**Step 1: Write the failing test**

Create `apps/api/src/queue/processors/ai.processor.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../../db/client.js'
import { processAIJob, shouldRetryAIError } from './ai.processor.js'
import type { Job } from '../../features/jobs/jobs.db.js'

// Mock AI service
vi.mock('../../services/ai.service.js', () => ({
  generateTagsAndSummary: vi.fn(),
  mergeTagsWithExisting: vi.fn(),
}))

describe('ai.processor', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())
    vi.clearAllMocks()

    const timestamp = new Date().toISOString()
    db.prepare(`
      INSERT INTO items (id, url, url_normalized, domain, status, clean_text, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('item_test', 'https://example.com', 'https://example.com', 'example.com', 'completed', 'Test article content about React and TypeScript.', timestamp, timestamp)
  })

  describe('processAIJob', () => {
    it('should process AI job and update item', async () => {
      const { generateTagsAndSummary, mergeTagsWithExisting } = await import('../../services/ai.service.js')

      vi.mocked(generateTagsAndSummary).mockResolvedValue({
        tags: ['react', 'typescript', '前端'],
        summary: '这是一篇关于 React 和 TypeScript 的文章。',
      })

      vi.mocked(mergeTagsWithExisting).mockResolvedValue(['React', 'TypeScript', '前端'])

      const job: Job = {
        id: 'job_test',
        item_id: 'item_test',
        type: 'ai_process',
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

      await processAIJob(db, job)

      // Verify summary updated
      const item = db.prepare('SELECT * FROM items WHERE id = ?').get('item_test') as any
      expect(item.summary).toBe('这是一篇关于 React 和 TypeScript 的文章。')
      expect(item.summary_source).toBe('ai')

      // Verify tags created
      const tags = db.prepare(`
        SELECT t.name FROM tags t
        JOIN item_tags it ON t.id = it.tag_id
        WHERE it.item_id = ?
        ORDER BY t.name
      `).all('item_test') as { name: string }[]

      expect(tags.map(t => t.name)).toEqual(['React', 'TypeScript', '前端'])
    })

    it('should throw if item not found', async () => {
      const job: Job = {
        id: 'job_test',
        item_id: 'item_nonexistent',
        type: 'ai_process',
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

      await expect(processAIJob(db, job)).rejects.toThrow('Item not found')
    })

    it('should throw if item has no content', async () => {
      db.prepare('UPDATE items SET clean_text = NULL WHERE id = ?').run('item_test')

      const job: Job = {
        id: 'job_test',
        item_id: 'item_test',
        type: 'ai_process',
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

      await expect(processAIJob(db, job)).rejects.toThrow('no content')
    })
  })

  describe('shouldRetryAIError', () => {
    it('should retry on 429 rate limit', () => {
      const error = { status: 429, message: 'Rate limit' } as any
      expect(shouldRetryAIError(error)).toBe(true)
    })

    it('should retry on 5xx server error', () => {
      const error = { status: 500, message: 'Server error' } as any
      expect(shouldRetryAIError(error)).toBe(true)
    })

    it('should retry on network timeout', () => {
      const error = { code: 'ETIMEDOUT', message: 'Timeout' } as any
      expect(shouldRetryAIError(error)).toBe(true)
    })

    it('should not retry on 401 auth error', () => {
      const error = { status: 401, message: 'Unauthorized' } as any
      expect(shouldRetryAIError(error)).toBe(false)
    })

    it('should not retry on 400 bad request', () => {
      const error = { status: 400, message: 'Bad request' } as any
      expect(shouldRetryAIError(error)).toBe(false)
    })

    it('should not retry on unknown error', () => {
      const error = new Error('Unknown')
      expect(shouldRetryAIError(error)).toBe(false)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pnpm test -- ai.processor.test.ts`

Expected: FAIL with "Cannot find module './ai.processor.js'"

**Step 3: Write minimal implementation**

Create `apps/api/src/queue/processors/ai.processor.ts`:

```typescript
import type { Database } from 'better-sqlite3'
import type { Job } from '../../features/jobs/jobs.db.js'
import { getItemById } from '../../features/items/items.db.js'
import { generateTagsAndSummary, mergeTagsWithExisting } from '../../services/ai.service.js'
import { getAllTagNames, setItemTags } from '../../features/tags/tags.db.js'

/**
 * Process AI job - generate tags and summary
 */
export async function processAIJob(db: Database, job: Job): Promise<void> {
  const item = getItemById(db, job.item_id)

  if (!item) {
    throw new Error(`Item not found: ${job.item_id}`)
  }

  if (!item.clean_text) {
    throw new Error('Item has no content to analyze')
  }

  console.log(`[ai] Processing ${item.url}`)

  // Step 1: Generate original tags and summary
  const { tags: newTags, summary } = await generateTagsAndSummary(item.clean_text)

  // Step 2: Get all existing tags
  const existingTags = getAllTagNames(db)

  // Step 3: Merge tags semantically
  const mergedTags = await mergeTagsWithExisting(newTags, existingTags)

  // Step 4: Update database in transaction
  db.transaction(() => {
    // Update summary
    const now = new Date().toISOString()
    db.prepare(`
      UPDATE items
      SET summary = ?, summary_source = 'ai', updated_at = ?
      WHERE id = ?
    `).run(summary, now, item.id)

    // Set tags
    setItemTags(db, item.id, mergedTags)
  })()

  console.log(`[ai] Completed ${item.url} - Tags: ${mergedTags.join(', ')}`)
}

/**
 * Determine if AI error should be retried
 */
export function shouldRetryAIError(error: any): boolean {
  // 429 rate limit → retry with longer backoff
  if (error.status === 429) return true

  // 5xx server error → retry
  if (error.status >= 500) return true

  // Network timeout → retry
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') return true

  // 401/403 auth error → don't retry (config issue)
  if (error.status === 401 || error.status === 403) return false

  // 4xx client error → don't retry
  if (error.status >= 400 && error.status < 500) return false

  // Default: don't retry
  return false
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && pnpm test -- ai.processor.test.ts`

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/queue/processors/ai.processor.ts src/queue/processors/ai.processor.test.ts
git commit -m "feat(api): add AI job processor with smart retry logic"
```

---

## Task 6: Integrate AI Processor into Worker

**Files:**
- Modify: `apps/api/src/queue/worker.ts`

**Step 1: Add ai_process case to worker**

Modify `apps/api/src/queue/worker.ts`, in the `processJob` function:

```typescript
import { processAIJob, shouldRetryAIError } from './processors/ai.processor.js'

async function processJob(db: Database, job: Job): Promise<void> {
  switch (job.type) {
    case 'fetch':
      await processFetchJob(db, job)
      break
    case 'ai_process':
      await processAIJob(db, job)
      break
    default:
      throw new Error(`Unknown job type: ${job.type}`)
  }
}
```

**Step 2: Update error handling for AI jobs**

Modify `handleJobFailure` function in `worker.ts`:

```typescript
async function handleJobFailure(db: Database, job: Job, error: Error): Promise<void> {
  const nextAttempt = job.attempt + 1
  const maxAttempts = 3

  // Determine if should retry based on job type
  let shouldRetry = false
  if (job.type === 'ai_process') {
    shouldRetry = shouldRetryAIError(error)
  } else {
    // Default retry logic for other job types
    shouldRetry = true
  }

  if (shouldRetry && nextAttempt < maxAttempts) {
    // Calculate delay
    const isRateLimit = (error as any).status === 429
    const baseDelay = isRateLimit ? 5 : 2 // 5 min for rate limit, 2 min otherwise
    const delayMinutes = baseDelay * Math.pow(2, nextAttempt)
    const runAfter = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString()

    console.log(`[worker] Scheduling retry ${nextAttempt} for job ${job.id} after ${delayMinutes} min`)

    retryJob(db, job.id, {
      attempt: nextAttempt,
      run_after: runAfter,
      error_message: error.message,
    })
  } else {
    // Max retries reached or non-retryable error
    console.log(`[worker] Job ${job.id} failed permanently`)
    failJob(db, job.id, error.message)
    if (job.type === 'fetch' || job.type === 'ai_process') {
      failItem(db, job.item_id, error.message)
    }
  }
}
```

**Step 3: Test worker with AI job manually**

Start worker:
```bash
cd apps/api
WORKER_ENABLED=1 GEMINI_API_KEY=test-key pnpm dev
```

Expected: Worker starts and can process ai_process jobs

**Step 4: Commit**

```bash
git add src/queue/worker.ts
git commit -m "feat(api): integrate AI processor into worker with smart retry"
```

---

## Task 7: Auto-create AI Job after Fetch

**Files:**
- Modify: `apps/api/src/queue/processors/fetch.processor.ts`

**Step 1: Add job creation after fetch completion**

Modify `fetch.processor.ts`, at the end of `processFetchJob`:

```typescript
import { generateId } from '../../lib/utils.js'

export async function processFetchJob(db: Database, job: Job): Promise<void> {
  const item = getItemById(db, job.item_id)

  if (!item) {
    throw new Error(`Item not found: ${job.item_id}`)
  }

  console.log(`[fetch] Processing ${item.url}`)

  // Fetch and extract content...
  const response = await fetch(item.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; RecallBot/1.0)',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const html = await response.text()

  const dom = new JSDOM(html, { url: item.url })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()

  if (!article) {
    throw new Error('Failed to extract article content')
  }

  // Update item with extracted content
  updateItemContent(db, item.id, {
    title: article.title || (item.title ?? undefined),
    clean_text: article.textContent ?? undefined,
    status: 'completed',
  })

  console.log(`[fetch] Completed ${item.url}`)

  // Create ai_process job
  const aiJobId = generateId('job')
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at)
    VALUES (?, ?, 'ai_process', 'pending', 0, ?, ?, ?)
  `).run(aiJobId, item.id, now, now, now)

  console.log(`[fetch] Created ai_process job ${aiJobId} for item ${item.id}`)
}
```

**Step 2: Test end-to-end flow**

```bash
# Start worker
WORKER_ENABLED=1 GEMINI_API_KEY=test-key pnpm dev

# In another terminal, create item
curl -X POST http://localhost:8787/api/items \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

Expected: Worker logs show fetch → ai_process job creation

**Step 3: Commit**

```bash
git add src/queue/processors/fetch.processor.ts
git commit -m "feat(api): auto-create ai_process job after fetch completion"
```

---

## Task 8: Add Manual Analyze API Endpoint

**Files:**
- Modify: `apps/api/src/features/items/items.route.ts`

**Step 1: Add POST /:id/analyze endpoint**

Add to `items.route.ts`:

```typescript
itemsApp.post('/:id/analyze', (c) => {
  try {
    const db = getDb()
    const id = c.req.param('id')

    // Check if item exists and has content
    const item = getItemById(db, id)
    if (!item) {
      return c.json({
        error: 'NOT_FOUND',
        message: 'Item not found',
      }, 404)
    }

    if (!item.clean_text) {
      return c.json({
        error: 'NO_CONTENT',
        message: 'Item has no content to analyze. Fetch content first.',
      }, 400)
    }

    // Create ai_process job
    const jobId = generateId('job')
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at)
      VALUES (?, ?, 'ai_process', 'pending', 0, ?, ?, ?)
    `).run(jobId, id, now, now, now)

    return c.json({ job_id: jobId }, 201)
  } catch (error) {
    console.error('[POST /items/:id/analyze] Error:', error)
    return c.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create analysis job',
    }, 500)
  }
})
```

**Step 2: Test manually**

```bash
# Create item
ITEM_ID=$(curl -X POST http://localhost:8787/api/items \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}' | jq -r '.id')

# Wait for fetch to complete, then trigger analyze
sleep 5
curl -X POST "http://localhost:8787/api/items/$ITEM_ID/analyze"
```

Expected: 201 response with job_id

**Step 3: Commit**

```bash
git add src/features/items/items.route.ts
git commit -m "feat(api): add POST /items/:id/analyze endpoint for manual AI processing"
```

---

## Task 9: Add Tags API Endpoints

**Files:**
- Create: `apps/api/src/features/tags/tags.route.ts`
- Modify: `apps/api/src/routes/api.ts`

**Step 1: Create tags route**

Create `apps/api/src/features/tags/tags.route.ts`:

```typescript
import { Hono } from 'hono'
import { getDb } from '../../db/context.js'
import { listTags } from './tags.db.js'

export const tagsApp = new Hono()

tagsApp.get('/', (c) => {
  try {
    const db = getDb()
    const tags = listTags(db)

    return c.json({ tags })
  } catch (error) {
    console.error('[GET /tags] Error:', error)
    return c.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get tags',
    }, 500)
  }
})
```

**Step 2: Register tags route**

Modify `apps/api/src/routes/api.ts`:

```typescript
import { tagsApp } from '../features/tags/tags.route.js'

// Add to existing routes
apiRoutes.route('/tags', tagsApp)
```

**Step 3: Test manually**

```bash
curl http://localhost:8787/api/tags
```

Expected: `{ tags: [...] }`

**Step 4: Commit**

```bash
git add src/features/tags/tags.route.ts src/routes/api.ts
git commit -m "feat(api): add GET /tags endpoint"
```

---

## Task 10: Update Items API to Return Tags

**Files:**
- Modify: `apps/api/src/features/items/items.route.ts`
- Modify: `apps/api/src/features/items/items.schema.ts`

**Step 1: Update GET /:id to include tags**

Modify `items.route.ts`, in GET /:id handler:

```typescript
import { getItemTags } from '../tags/tags.db.js'

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

    // Get tags
    const tags = getItemTags(db, id)

    return c.json({
      ...item,
      tags,
    })
  } catch (error) {
    console.error('[GET /items/:id] Error:', error)
    return c.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get item',
    }, 500)
  }
})
```

**Step 2: Update GET / to include tags and support filtering**

Add tags parameter to schema in `items.schema.ts`:

```typescript
export const listItemsQuerySchema = z.object({
  status: z.enum(['pending', 'completed', 'failed']).optional(),
  domain: z.string().min(1).optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  tags: z.string().optional(), // Comma-separated tag names
  sort_by: z.enum(['created_at', 'updated_at', 'domain']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})
```

Update GET / handler in `items.route.ts`:

```typescript
itemsApp.get('/', zValidator('query', listItemsQuerySchema), (c) => {
  try {
    const db = getDb()
    const filters = c.req.valid('query')

    // Get items (with tag filtering if specified)
    let result
    if (filters.tags) {
      const tagNames = filters.tags.split(',').map(t => t.trim())
      result = listItemsByTags(db, tagNames, filters)
    } else {
      result = listItems(db, filters)
    }

    // Attach tags to each item
    const itemsWithTags = result.items.map(item => ({
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
    return c.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to list items',
    }, 500)
  }
})
```

**Step 3: Implement listItemsByTags in items.db.ts**

Add to `apps/api/src/features/items/items.db.ts`:

```typescript
export function listItemsByTags(
  db: Database,
  tagNames: string[],
  filters: ListItemsFilters = {}
): ListItemsResult {
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
    conditions.push('i.status = ?')
    params.push(status)
  }

  if (domain) {
    conditions.push('i.domain = ?')
    params.push(domain)
  }

  if (created_after) {
    conditions.push('i.created_at >= ?')
    params.push(created_after)
  }

  if (created_before) {
    conditions.push('i.created_at <= ?')
    params.push(created_before)
  }

  // Add tag filter
  const tagPlaceholders = tagNames.map(() => '?').join(',')
  params.push(...tagNames)

  const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''

  // Get total count
  const countSql = `
    SELECT COUNT(DISTINCT i.id) as count
    FROM items i
    JOIN item_tags it ON i.id = it.item_id
    JOIN tags t ON it.tag_id = t.id
    WHERE t.name IN (${tagPlaceholders})
    ${whereClause}
  `
  const { count } = db.prepare(countSql).get(...params) as { count: number }

  // Get items
  const validSortBy = ['created_at', 'updated_at', 'domain'].includes(sort_by) ? sort_by : 'created_at'
  const validSortOrder = sort_order === 'asc' ? 'ASC' : 'DESC'

  const itemsSql = `
    SELECT DISTINCT i.*
    FROM items i
    JOIN item_tags it ON i.id = it.item_id
    JOIN tags t ON it.tag_id = t.id
    WHERE t.name IN (${tagPlaceholders})
    ${whereClause}
    ORDER BY i.${validSortBy} ${validSortOrder}
    LIMIT ? OFFSET ?
  `
  const items = db.prepare(itemsSql).all(...params, limit, offset) as Item[]

  return { items, total: count }
}
```

**Step 4: Test manually**

```bash
# Get item with tags
curl "http://localhost:8787/api/items/$ITEM_ID"

# List items filtered by tags
curl "http://localhost:8787/api/items?tags=React,TypeScript"
```

Expected: Items include tags array

**Step 5: Commit**

```bash
git add src/features/items/items.route.ts src/features/items/items.schema.ts src/features/items/items.db.ts
git commit -m "feat(api): add tags to items API responses and tag filtering"
```

---

## Task 11: Write Integration Tests

**Files:**
- Create: `apps/api/src/test/ai-integration.test.ts`

**Step 1: Write integration test**

Create `apps/api/src/test/ai-integration.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { app } from '../app.js'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../db/client.js'
import { setDb, closeDb } from '../db/context.js'

// Mock AI service
vi.mock('../services/ai.service.js', () => ({
  generateTagsAndSummary: vi.fn().mockResolvedValue({
    tags: ['React', 'TypeScript', '前端'],
    summary: '这是一篇关于 React 和 TypeScript 的教程文章。',
  }),
  mergeTagsWithExisting: vi.fn().mockImplementation((newTags, existingTags) => {
    if (existingTags.length === 0) return Promise.resolve(newTags)
    // Simple merge: prefer existing
    return Promise.resolve(['React', 'TypeScript', '前端'])
  }),
}))

describe('AI Processing Integration Tests', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())
    setDb(db)
    vi.clearAllMocks()
  })

  afterEach(() => {
    closeDb()
  })

  describe('POST /api/items/:id/analyze', () => {
    it('should create ai_process job', async () => {
      // Create item with content
      const timestamp = new Date().toISOString()
      db.prepare(`
        INSERT INTO items (id, url, url_normalized, domain, status, clean_text, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('item_test', 'https://example.com', 'https://example.com', 'example.com', 'completed', 'Test content', timestamp, timestamp)

      const res = await app.request('/api/items/item_test/analyze', {
        method: 'POST',
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.job_id).toMatch(/^job_/)

      // Verify job created
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(data.job_id) as any
      expect(job.type).toBe('ai_process')
      expect(job.item_id).toBe('item_test')
    })

    it('should return 404 if item not found', async () => {
      const res = await app.request('/api/items/item_nonexistent/analyze', {
        method: 'POST',
      })

      expect(res.status).toBe(404)
    })

    it('should return 400 if item has no content', async () => {
      const timestamp = new Date().toISOString()
      db.prepare(`
        INSERT INTO items (id, url, url_normalized, domain, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('item_test', 'https://example.com', 'https://example.com', 'example.com', 'pending', timestamp, timestamp)

      const res = await app.request('/api/items/item_test/analyze', {
        method: 'POST',
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('NO_CONTENT')
    })
  })

  describe('GET /api/tags', () => {
    it('should return empty array if no tags', async () => {
      const res = await app.request('/api/tags')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.tags).toEqual([])
    })

    it('should return tags with metadata', async () => {
      const timestamp = new Date().toISOString()

      // Create item and tags
      db.prepare(`
        INSERT INTO items (id, url, url_normalized, domain, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('item_test', 'https://example.com', 'https://example.com', 'example.com', 'completed', timestamp, timestamp)

      db.prepare('INSERT INTO tags (id, name, created_at, item_count) VALUES (?, ?, ?, ?)').run('tag_1', 'React', timestamp, 1)
      db.prepare('INSERT INTO item_tags (item_id, tag_id, created_at) VALUES (?, ?, ?)').run('item_test', 'tag_1', timestamp)

      const res = await app.request('/api/tags')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.tags).toHaveLength(1)
      expect(data.tags[0]).toMatchObject({
        id: 'tag_1',
        name: 'React',
        item_count: 1,
      })
    })
  })

  describe('GET /api/items/:id with tags', () => {
    it('should return item with tags array', async () => {
      const timestamp = new Date().toISOString()

      // Create item
      db.prepare(`
        INSERT INTO items (id, url, url_normalized, domain, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('item_test', 'https://example.com', 'https://example.com', 'example.com', 'completed', timestamp, timestamp)

      // Add tags
      db.prepare('INSERT INTO tags (id, name, created_at, item_count) VALUES (?, ?, ?, ?)').run('tag_1', 'React', timestamp, 1)
      db.prepare('INSERT INTO tags (id, name, created_at, item_count) VALUES (?, ?, ?, ?)').run('tag_2', 'TypeScript', timestamp, 1)
      db.prepare('INSERT INTO item_tags (item_id, tag_id, created_at) VALUES (?, ?, ?)').run('item_test', 'tag_1', timestamp)
      db.prepare('INSERT INTO item_tags (item_id, tag_id, created_at) VALUES (?, ?, ?)').run('item_test', 'tag_2', timestamp)

      const res = await app.request('/api/items/item_test')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.tags).toEqual(['React', 'TypeScript'])
    })
  })

  describe('GET /api/items with tag filtering', () => {
    it('should filter items by tags', async () => {
      const timestamp = new Date().toISOString()

      // Create items
      db.prepare(`
        INSERT INTO items (id, url, url_normalized, domain, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('item_1', 'https://example.com/1', 'https://example.com/1', 'example.com', 'completed', timestamp, timestamp)

      db.prepare(`
        INSERT INTO items (id, url, url_normalized, domain, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('item_2', 'https://example.com/2', 'https://example.com/2', 'example.com', 'completed', timestamp, timestamp)

      // Add tags
      db.prepare('INSERT INTO tags (id, name, created_at, item_count) VALUES (?, ?, ?, ?)').run('tag_1', 'React', timestamp, 2)
      db.prepare('INSERT INTO tags (id, name, created_at, item_count) VALUES (?, ?, ?, ?)').run('tag_2', 'Vue', timestamp, 1)

      db.prepare('INSERT INTO item_tags (item_id, tag_id, created_at) VALUES (?, ?, ?)').run('item_1', 'tag_1', timestamp)
      db.prepare('INSERT INTO item_tags (item_id, tag_id, created_at) VALUES (?, ?, ?)').run('item_2', 'tag_1', timestamp)
      db.prepare('INSERT INTO item_tags (item_id, tag_id, created_at) VALUES (?, ?, ?)').run('item_2', 'tag_2', timestamp)

      // Filter by React
      const res = await app.request('/api/items?tags=React')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.items).toHaveLength(2)

      // Filter by Vue
      const res2 = await app.request('/api/items?tags=Vue')
      expect(res2.status).toBe(200)
      const data2 = await res2.json()
      expect(data2.items).toHaveLength(1)
      expect(data2.items[0].id).toBe('item_2')
    })
  })
})
```

**Step 2: Run tests**

Run: `cd apps/api && pnpm test -- ai-integration.test.ts`

Expected: PASS (all integration tests)

**Step 3: Commit**

```bash
git add src/test/ai-integration.test.ts
git commit -m "test(api): add AI processing integration tests"
```

---

## Task 12: Update API Documentation

**Files:**
- Modify: `apps/api/README.md`

**Step 1: Add AI processing documentation**

Add to `apps/api/README.md`:

```markdown
## AI Processing

### Configuration

Set environment variables:

```bash
GEMINI_BASE_URL=http://127.0.0.1:8317/v1beta
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-3-flash-preview
```

Or use `config/ai.json` for defaults.

### POST /api/items/:id/analyze

Manually trigger AI analysis for an item.

**Response (201):**
```json
{
  "job_id": "job_xxx"
}
```

**Errors:**
- 404: Item not found
- 400: Item has no content

### GET /api/tags

Get all tags with metadata.

**Response (200):**
```json
{
  "tags": [
    {
      "id": "tag_xxx",
      "name": "React",
      "item_count": 5,
      "created_at": "2026-01-20T10:00:00.000Z"
    }
  ]
}
```

Tags are sorted by item_count (desc) then name (asc).

### GET /api/items

Now includes `tags` array in responses and supports filtering.

**Query Parameters:**
- `tags` - Filter by tags (comma-separated, e.g., `?tags=React,TypeScript`)

**Response:**
```json
{
  "items": [
    {
      "id": "item_xxx",
      "url": "...",
      "summary": "...",
      "summary_source": "ai",
      "tags": ["React", "TypeScript", "前端"],
      ...
    }
  ],
  "total": 42
}
```

### Automatic AI Processing

After fetch job completes, an `ai_process` job is automatically created. The worker will:

1. Generate 3-5 tags and a summary (简体中文)
2. Merge tags semantically with existing tags
3. Update item with summary and tags

### Smart Retry Logic

AI jobs have intelligent retry:
- **Retry:** 429 rate limit (longer backoff), 5xx errors, network timeouts
- **No retry:** 401/403 auth errors, 4xx client errors

### Tag Merging

When generating tags, the AI compares with existing tags:
- Similar tags → use existing tag (e.g., "react" → "React")
- New tags → create new tag

This prevents tag fragmentation.
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs(api): add AI processing documentation"
```

---

## Task 13: End-to-End Testing with Real Articles

**Files:**
- Create: `apps/api/TESTING.md`

**Step 1: Create testing guide**

Create `apps/api/TESTING.md`:

```markdown
# AI Processing End-to-End Testing

## Setup

1. Set your Gemini API key:

```bash
export GEMINI_API_KEY=your_actual_api_key
```

2. Start the server with worker:

```bash
cd apps/api
WORKER_ENABLED=1 pnpm dev
```

## Test Cases

### Test 1: Chinese Tech Article

**URL:** https://baoyu.io/translations/context-engineering-part-of-ml

**Expected:**
- Tags: 机器学习, 上下文工程, AI, 教程 (or similar)
- Summary: 关于机器学习中上下文工程的文章 (150字内)

**Steps:**

```bash
# Create item
ITEM1=$(curl -s -X POST http://localhost:8787/api/items \
  -H "Content-Type: application/json" \
  -d '{"url":"https://baoyu.io/translations/context-engineering-part-of-ml"}' | jq -r '.id')

echo "Created item: $ITEM1"

# Wait for fetch + AI processing (check logs)
sleep 30

# Get item with tags and summary
curl -s "http://localhost:8787/api/items/$ITEM1" | jq '{url, summary, tags}'
```

### Test 2: English Tech Article

**URL:** https://prateeksurana.me/blog/guide-to-go-for-javascript-developers

**Expected:**
- Tags: Go, JavaScript, 编程, 教程 (简体中文)
- Summary: 关于 JavaScript 开发者学习 Go 的指南 (简体中文, 150字内)

**Steps:**

```bash
ITEM2=$(curl -s -X POST http://localhost:8787/api/items \
  -H "Content-Type: application/json" \
  -d '{"url":"https://prateeksurana.me/blog/guide-to-go-for-javascript-developers"}' | jq -r '.id')

echo "Created item: $ITEM2"
sleep 30

curl -s "http://localhost:8787/api/items/$ITEM2" | jq '{url, summary, tags}'
```

**Verify:** Tags and summary are in 简体中文, even though article is English.

### Test 3: Chinese Personal Blog

**URL:** https://tw93.fun/2025-07-17/money.html

**Expected:**
- Tags: 财务, 理财, 个人成长 (or similar)
- Summary: 关于理财和财务管理的文章 (150字内)

**Steps:**

```bash
ITEM3=$(curl -s -X POST http://localhost:8787/api/items \
  -H "Content-Type: application/json" \
  -d '{"url":"https://tw93.fun/2025-07-17/money.html"}' | jq -r '.id')

echo "Created item: $ITEM3"
sleep 30

curl -s "http://localhost:8787/api/items/$ITEM3" | jq '{url, summary, tags}'
```

### Test 4: Tag Merging

After processing all three articles, check tag merging:

```bash
# Get all tags
curl -s http://localhost:8787/api/tags | jq '.tags[] | {name, item_count}'
```

**Verify:**
- No duplicate tags with slight variations (e.g., "JavaScript" vs "javascript")
- Tags are semantically merged

### Test 5: Manual Re-analyze

Manually trigger re-analysis:

```bash
# Re-analyze item 1
curl -s -X POST "http://localhost:8787/api/items/$ITEM1/analyze" | jq '.'

# Wait for processing
sleep 15

# Check updated tags/summary
curl -s "http://localhost:8787/api/items/$ITEM1" | jq '{summary, tags}'
```

### Test 6: Tag Filtering

Filter items by tags:

```bash
# Get all items with "教程" tag
curl -s "http://localhost:8787/api/items?tags=教程" | jq '.items[] | {url, tags}'

# Get items with multiple tags
curl -s "http://localhost:8787/api/items?tags=JavaScript,Go" | jq '.items[] | {url, tags}'
```

## Success Criteria

- ✅ All 3 articles processed successfully
- ✅ Tags and summaries are in 简体中文
- ✅ Summaries are concise (≤150 字)
- ✅ Tags are semantically merged (no fragmentation)
- ✅ Tag counts are accurate
- ✅ Tag filtering works correctly
- ✅ Manual re-analyze works
```

**Step 2: Commit**

```bash
git add TESTING.md
git commit -m "docs(api): add AI processing end-to-end testing guide"
```

---

## Completion Checklist

- [ ] Install ai-sdk dependencies
- [ ] Update database schema (tags tables)
- [ ] Create tags database access layer
- [ ] Create AI configuration management
- [ ] Get ai-sdk documentation from Context7
- [ ] Create AI service with tag generation and merging
- [ ] Create AI job processor
- [ ] Integrate AI processor into worker
- [ ] Auto-create AI job after fetch
- [ ] Add manual analyze API endpoint
- [ ] Add tags API endpoint
- [ ] Update items API to return tags
- [ ] Write integration tests
- [ ] Update API documentation
- [ ] End-to-end testing with real articles

## Testing the Complete System

After implementing all tasks:

1. **Start server with worker and AI enabled:**
   ```bash
   cd apps/api
   WORKER_ENABLED=1 GEMINI_API_KEY=your_key pnpm dev
   ```

2. **Create an item and watch it process:**
   ```bash
   curl -X POST http://localhost:8787/api/items \
     -H "Content-Type: application/json" \
     -d '{"url":"https://baoyu.io/translations/context-engineering-part-of-ml"}'
   ```

3. **Check worker logs:**
   - Should see fetch job
   - Then ai_process job
   - Tags and summary generation

4. **Verify results:**
   ```bash
   curl "http://localhost:8787/api/items/item_xxx" | jq '{summary, tags}'
   curl "http://localhost:8787/api/tags" | jq '.'
   ```

5. **Test tag filtering:**
   ```bash
   curl "http://localhost:8787/api/items?tags=机器学习" | jq '.items[] | .url'
   ```

6. **Follow TESTING.md for complete test suite**

---

## Future Enhancements

After this plan is complete, consider:
- Tag management UI (rename, merge, delete tags)
- Tag synonyms/aliases
- Multi-language tag support
- AI model selection per task
- Batch re-analyze all items
- Tag suggestions based on content
