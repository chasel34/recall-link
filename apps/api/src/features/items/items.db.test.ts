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
          jobId: 'job_2',
          url: 'https://other.com',
          urlNormalized: 'https://other.com',
          domain: 'other.com',
          timestamp,
        })
        db.prepare('INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run('job_duplicate', 'item_1', 'fetch', 'pending', 0, timestamp, timestamp, timestamp)
      }).toThrow()
    })
  })
})
