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
      const lockExpiry = new Date(now + 10 * 60 * 1000).toISOString()

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
      const lockExpiry = new Date(now - 1000).toISOString()

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
      const runAfter = new Date(now + 60 * 1000).toISOString()

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
