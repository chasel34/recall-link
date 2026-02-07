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

      const embedJob = db
        .prepare("SELECT id FROM jobs WHERE item_id = ? AND type = 'embed_process'")
        .get('item_test') as { id: string } | undefined
      expect(embedJob).toBeUndefined()
    })

    it('enqueues embed_process for bookmark import items', async () => {
      const { handleAiProcess } = await import('@recall-link/jobs-handlers')
      vi.mocked(handleAiProcess).mockResolvedValue({
        tags: ['React'],
        summary: 'Imported summary',
      })

      const timestamp = new Date().toISOString()
      db.prepare(
        `
          INSERT INTO bookmark_imports (
            id, user_id, source_type, file_name, file_size_bytes, file_sha256, status,
            total_count, created_count, duplicate_existing_count, duplicate_in_file_count,
            invalid_count, failed_count, done_count, started_at, finished_at, error_message,
            created_at, updated_at
          )
          VALUES (?, ?, 'bookmarks_html', 'bookmarks.html', 123, 'sha', 'processing', 1, 1, 0, 0, 0, 0, 0, ?, NULL, NULL, ?, ?)
        `
      ).run('import_1', userId, timestamp, timestamp, timestamp)

      db.prepare('UPDATE items SET source = ?, import_id = ?, import_entry_id = ? WHERE id = ?').run(
        'bookmark_import',
        'import_1',
        'import_entry_1',
        'item_test'
      )

      db.prepare(
        `
          INSERT INTO bookmark_import_entries (
            id, import_id, user_id, index_in_file, folder_path, source_tags, source_note,
            url_raw, url_normalized, title_raw, status, item_id, error_code, error_message,
            created_at, updated_at
          )
          VALUES (?, ?, ?, 0, NULL, NULL, NULL, ?, ?, ?, 'ai_processing', ?, NULL, NULL, ?, ?)
        `
      ).run(
        'import_entry_1',
        'import_1',
        userId,
        'https://example.com',
        'https://example.com',
        'Imported item',
        'item_test',
        timestamp,
        timestamp
      )

      const job: Job = {
        id: 'job_ai_import',
        item_id: 'item_test',
        type: 'ai_process',
        state: 'pending',
        attempt: 0,
        run_after: timestamp,
        locked_by: 'worker_1',
        lock_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        last_error_code: null,
        last_error_message: null,
        created_at: timestamp,
        updated_at: timestamp,
        started_at: timestamp,
        finished_at: null,
      }

      await processAIJob(db, job)

      const embedJob = db
        .prepare("SELECT item_id, type, state FROM jobs WHERE item_id = ? AND type = 'embed_process'")
        .get('item_test') as { item_id: string; type: string; state: string } | undefined
      expect(embedJob).toBeTruthy()
      expect(embedJob?.item_id).toBe('item_test')

      const entry = db
        .prepare('SELECT status FROM bookmark_import_entries WHERE id = ?')
        .get('import_entry_1') as { status: string }
      expect(entry.status).toBe('embedding')
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

    it('should record progress on error', async () => {
      const { handleAiProcess } = await import('@recall-link/jobs-handlers')
      vi.mocked(handleAiProcess).mockRejectedValue(new Error('AI failure'))

      const job: Job = {
        id: 'job_test_error',
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

      db.prepare(
        'INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        job.id,
        job.item_id,
        job.type,
        job.state,
        job.attempt,
        job.run_after,
        job.created_at,
        job.updated_at
      )

      await expect(processAIJob(db, job)).rejects.toThrow('AI failure')

      const updatedJob = db
        .prepare('SELECT progress_stage, progress_message FROM jobs WHERE id = ?')
        .get('job_test_error') as any
      expect(updatedJob.progress_stage).toBe('ai:error')
      expect(updatedJob.progress_message).toBe('Retrying: AI failure')
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
