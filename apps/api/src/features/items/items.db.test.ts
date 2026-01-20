import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../../db/client.js'
import {
  findItemByNormalizedUrl,
  createItemWithJob,
  listItems,
  getItemById,
  updateItem,
  deleteItem,
} from './items.db.js'

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

      const item = db.prepare('SELECT * FROM items WHERE id = ?').get('item_test123') as any
      expect(item).toBeTruthy()
      expect(item.url).toBe('https://example.com/article')
      expect(item.status).toBe('pending')

      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get('job_test456') as any
      expect(job).toBeTruthy()
      expect(job.item_id).toBe('item_test123')
      expect(job.type).toBe('fetch')
      expect(job.state).toBe('pending')
    })

    it('should rollback transaction if job creation fails', () => {
      const timestamp = new Date().toISOString()

      createItemWithJob(db, {
        itemId: 'item_1',
        jobId: 'job_1',
        url: 'https://example.com',
        urlNormalized: 'https://example.com',
        domain: 'example.com',
        timestamp,
      })

      expect(() => {
        createItemWithJob(db, {
          itemId: 'item_2',
          jobId: 'job_1',
          url: 'https://other.com',
          urlNormalized: 'https://other.com',
          domain: 'other.com',
          timestamp,
        })
      }).toThrow()

      const item2 = db.prepare('SELECT * FROM items WHERE id = ?').get('item_2') as any
      expect(item2).toBeUndefined()
    })
  })

  describe('listItems', () => {
    beforeEach(() => {
      db = new Database(':memory:')
      applySchema(db, defaultSchemaPath())

      const items = [
        {
          id: 'item_1',
          url: 'https://a.com',
          url_normalized: 'https://a.com',
          domain: 'a.com',
          status: 'completed',
          created_at: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'item_2',
          url: 'https://b.com',
          url_normalized: 'https://b.com',
          domain: 'b.com',
          status: 'pending',
          created_at: '2026-01-02T00:00:00.000Z',
        },
        {
          id: 'item_3',
          url: 'https://a.com/2',
          url_normalized: 'https://a.com/2',
          domain: 'a.com',
          status: 'failed',
          created_at: '2026-01-03T00:00:00.000Z',
        },
      ]

      for (const item of items) {
        db.prepare(`
          INSERT INTO items (id, url, url_normalized, domain, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          item.id,
          item.url,
          item.url_normalized,
          item.domain,
          item.status,
          item.created_at,
          item.created_at
        )
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
        offset: 0,
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
      `).run(
        'item_test',
        'https://example.com',
        'https://example.com',
        'example.com',
        'pending',
        timestamp,
        timestamp
      )
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

  describe('updateItem', () => {
    beforeEach(() => {
      db = new Database(':memory:')
      applySchema(db, defaultSchemaPath())

      const timestamp = new Date().toISOString()
      db.prepare(`
        INSERT INTO items (id, url, url_normalized, domain, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'item_test',
        'https://example.com',
        'https://example.com',
        'example.com',
        'pending',
        timestamp,
        timestamp
      )
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
      const before = Date.now()
      updateItem(db, 'item_test', { note: 'Test' })
      const after = Date.now()

      const item = getItemById(db, 'item_test')
      const updatedAt = item?.updated_at ? Date.parse(item.updated_at) : 0
      expect(updatedAt).toBeGreaterThanOrEqual(before)
      expect(updatedAt).toBeLessThanOrEqual(after)
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
      `).run(
        'item_test',
        'https://example.com',
        'https://example.com',
        'example.com',
        'pending',
        timestamp,
        timestamp
      )

      db.prepare(`
        INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('job_test', 'item_test', 'fetch', 'pending', 0, timestamp, timestamp, timestamp)
    })

    it('should delete item and associated jobs in transaction', () => {
      const result = deleteItem(db, 'item_test')
      expect(result.deletedJobs).toBe(1)
      expect(result.deletedItem).toBe(1)

      const item = getItemById(db, 'item_test')
      expect(item).toBeNull()

      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get('job_test')
      expect(job).toBeUndefined()
    })

    it('should return 0 if item does not exist', () => {
      const result = deleteItem(db, 'item_nonexistent')
      expect(result.deletedItem).toBe(0)
      expect(result.deletedJobs).toBe(0)
    })
  })
})
