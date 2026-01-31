import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../../db/client.js'
import { processAIJob, shouldRetryAIError } from './ai.processor.js'
import type { Job } from '@recall-link/jobs'

vi.mock('@recall-link/jobs-handlers', () => ({
  handleAiProcess: vi.fn(),
}))

describe('ai.processor', () => {
  let db: Database.Database
  const userId = 'user_test'

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key'
    process.env.GEMINI_BASE_URL = 'http://localhost'
    process.env.GEMINI_MODEL = 'test-model'
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())
    vi.clearAllMocks()

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
      'Test article content about React and TypeScript.',
      timestamp,
      timestamp
    )
  })

  describe('processAIJob', () => {
    it('should process AI job and update item', async () => {
      const { handleAiProcess } = await import('@recall-link/jobs-handlers')

      vi.mocked(handleAiProcess).mockResolvedValue({
        tags: ['React', 'TypeScript', '前端'],
        summary: '这是一篇关于 React 和 TypeScript 的文章。',
      })

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

      const item = db.prepare('SELECT * FROM items WHERE id = ?').get('item_test') as any
      expect(item.summary).toBe('这是一篇关于 React 和 TypeScript 的文章。')
      expect(item.summary_source).toBe('ai')

      const tags = db
        .prepare(
          `
            SELECT t.name FROM tags t
            JOIN item_tags it ON t.id = it.tag_id
            WHERE it.item_id = ?
            ORDER BY t.name
          `
        )
        .all('item_test') as { name: string }[]

      expect(tags.map((tag) => tag.name)).toEqual(['React', 'TypeScript', '前端'])
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
