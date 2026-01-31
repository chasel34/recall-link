import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { app } from '../app.js'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../db/client.js'
import { setDb, closeDb } from '../db/context.js'
import { registerTestUser } from './test-auth.js'

vi.mock('@recall-link/jobs-handlers', () => ({
  handleAiProcess: vi.fn().mockResolvedValue({
    tags: ['React', 'TypeScript', '前端'],
    summary: '这是一篇关于 React 和 TypeScript 的教程文章。',
  }),
}))

describe('AI Processing Integration Tests', () => {
  let db: Database.Database
  let cookie: string
  let userId: string

  beforeEach(async () => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())
    setDb(db)
    vi.clearAllMocks()

    const auth = await registerTestUser(app)
    cookie = auth.cookie
    userId = auth.user.id
  })

  afterEach(() => {
    closeDb()
  })

  describe('POST /api/items/:id/analyze', () => {
    it('should create ai_process job', async () => {
      const timestamp = new Date().toISOString()
      db.prepare(
        `
          INSERT INTO items (id, user_id, url, url_normalized, domain, status, clean_text, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run(
        'item_test',
        userId,
        'https://example.com',
        'https://example.com',
        'example.com',
        'completed',
        'Test content',
        timestamp,
        timestamp
      )

      const res = await app.request('/api/items/item_test/analyze', {
        method: 'POST',
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.job_id).toMatch(/^job_/)

      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(data.job_id) as any
      expect(job.type).toBe('ai_process')
      expect(job.item_id).toBe('item_test')
    })

    it('should return 404 if item not found', async () => {
      const res = await app.request('/api/items/item_nonexistent/analyze', {
        method: 'POST',
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(404)
    })

    it('should return 400 if item has no content', async () => {
      const timestamp = new Date().toISOString()
      db.prepare(
        `
          INSERT INTO items (id, user_id, url, url_normalized, domain, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run('item_test', userId, 'https://example.com', 'https://example.com', 'example.com', 'pending', timestamp, timestamp)

      const res = await app.request('/api/items/item_test/analyze', {
        method: 'POST',
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('NO_CONTENT')
    })
  })

  describe('GET /api/tags', () => {
    it('should return empty array if no tags', async () => {
      const res = await app.request('/api/tags', { headers: { Cookie: cookie } })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.tags).toEqual([])
    })

    it('should return tags with metadata', async () => {
      const timestamp = new Date().toISOString()

      db.prepare(
        `
          INSERT INTO items (id, user_id, url, url_normalized, domain, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run('item_test', userId, 'https://example.com', 'https://example.com', 'example.com', 'completed', timestamp, timestamp)

      db.prepare('INSERT INTO tags (id, user_id, name, created_at, item_count) VALUES (?, ?, ?, ?, ?)').run(
        'tag_1',
        userId,
        'React',
        timestamp,
        1
      )
      db.prepare('INSERT INTO item_tags (item_id, tag_id, created_at) VALUES (?, ?, ?)').run(
        'item_test',
        'tag_1',
        timestamp
      )

      const res = await app.request('/api/tags', { headers: { Cookie: cookie } })
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

      db.prepare(
        `
          INSERT INTO items (id, user_id, url, url_normalized, domain, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run('item_test', userId, 'https://example.com', 'https://example.com', 'example.com', 'completed', timestamp, timestamp)

      db.prepare('INSERT INTO tags (id, user_id, name, created_at, item_count) VALUES (?, ?, ?, ?, ?)').run(
        'tag_1',
        userId,
        'React',
        timestamp,
        1
      )
      db.prepare('INSERT INTO tags (id, user_id, name, created_at, item_count) VALUES (?, ?, ?, ?, ?)').run(
        'tag_2',
        userId,
        'TypeScript',
        timestamp,
        1
      )
      db.prepare('INSERT INTO item_tags (item_id, tag_id, created_at) VALUES (?, ?, ?)').run(
        'item_test',
        'tag_1',
        timestamp
      )
      db.prepare('INSERT INTO item_tags (item_id, tag_id, created_at) VALUES (?, ?, ?)').run(
        'item_test',
        'tag_2',
        timestamp
      )

      const res = await app.request('/api/items/item_test', { headers: { Cookie: cookie } })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.tags).toEqual(['React', 'TypeScript'])
    })
  })

  describe('GET /api/items with tag filtering', () => {
    it('should filter items by tags', async () => {
      const timestamp = new Date().toISOString()

      db.prepare(
        `
          INSERT INTO items (id, user_id, url, url_normalized, domain, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run('item_1', userId, 'https://example.com/1', 'https://example.com/1', 'example.com', 'completed', timestamp, timestamp)

      db.prepare(
        `
          INSERT INTO items (id, user_id, url, url_normalized, domain, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run('item_2', userId, 'https://example.com/2', 'https://example.com/2', 'example.com', 'completed', timestamp, timestamp)

      db.prepare('INSERT INTO tags (id, user_id, name, created_at, item_count) VALUES (?, ?, ?, ?, ?)').run(
        'tag_1',
        userId,
        'React',
        timestamp,
        2
      )
      db.prepare('INSERT INTO tags (id, user_id, name, created_at, item_count) VALUES (?, ?, ?, ?, ?)').run(
        'tag_2',
        userId,
        'Vue',
        timestamp,
        1
      )

      db.prepare('INSERT INTO item_tags (item_id, tag_id, created_at) VALUES (?, ?, ?)').run(
        'item_1',
        'tag_1',
        timestamp
      )
      db.prepare('INSERT INTO item_tags (item_id, tag_id, created_at) VALUES (?, ?, ?)').run(
        'item_2',
        'tag_1',
        timestamp
      )
      db.prepare('INSERT INTO item_tags (item_id, tag_id, created_at) VALUES (?, ?, ?)').run(
        'item_2',
        'tag_2',
        timestamp
      )

      const res = await app.request('/api/items?tags=React', { headers: { Cookie: cookie } })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.items).toHaveLength(2)

      const res2 = await app.request('/api/items?tags=Vue', { headers: { Cookie: cookie } })
      expect(res2.status).toBe(200)
      const data2 = await res2.json()
      expect(data2.items).toHaveLength(1)
      expect(data2.items[0].id).toBe('item_2')
    })
  })
})
