import { beforeEach, describe, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../../db/client.js'
import { processEmbedJob, shouldRetryEmbedError } from './embed.processor.js'
import type { Job } from '@recall-link/jobs'
import { embedDocuments, EmbeddingProviderError } from '@recall-link/ai'

vi.mock('@recall-link/ai', async () => {
  const actual = await vi.importActual<typeof import('@recall-link/ai')>('@recall-link/ai')
  return {
    ...actual,
    embedDocuments: vi.fn(),
  }
})

describe('embed.processor', () => {
  let db: Database.Database
  const userId = 'user_embed'

  beforeEach(() => {
    process.env.ARK_API_KEY = 'ark-test-key'
    process.env.ARK_BASE_URL = 'https://ark.example.com/api/v3'
    process.env.ARK_EMBEDDING_MODEL = 'doubao-embedding-vision-251215'

    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())
    vi.clearAllMocks()

    const now = new Date().toISOString()
    db.prepare(
      `
        INSERT INTO items (
          id, user_id, source, import_id, import_entry_id, url, url_normalized, title, domain,
          status, clean_text, summary, ai_mode, created_at, updated_at
        )
        VALUES (?, ?, 'bookmark_import', ?, ?, ?, ?, ?, ?, 'completed', ?, ?, 'server', ?, ?)
      `
    ).run(
      'item_embed',
      userId,
      'import_embed',
      'import_entry_embed',
      'https://example.com/embed',
      'https://example.com/embed',
      'Embedding Title',
      'example.com',
      'Embedding clean text content.',
      'Embedding summary',
      now,
      now
    )

    db.prepare(
      `
        INSERT INTO bookmark_imports (
          id, user_id, source_type, file_name, file_size_bytes, file_sha256, status,
          total_count, created_count, duplicate_existing_count, duplicate_in_file_count,
          invalid_count, failed_count, done_count, started_at, finished_at, error_message,
          created_at, updated_at
        )
        VALUES (?, ?, 'bookmarks_html', 'bookmarks.html', 1, 'sha', 'processing', 1, 1, 0, 0, 0, 0, 0, ?, NULL, NULL, ?, ?)
      `
    ).run('import_embed', userId, now, now, now)

    db.prepare(
      `
        INSERT INTO bookmark_import_entries (
          id, import_id, user_id, index_in_file, folder_path, source_tags, source_note,
          url_raw, url_normalized, title_raw, status, item_id, error_code, error_message,
          created_at, updated_at
        )
        VALUES (?, ?, ?, 0, NULL, NULL, NULL, ?, ?, ?, 'embedding', ?, NULL, NULL, ?, ?)
      `
    ).run(
      'import_entry_embed',
      'import_embed',
      userId,
      'https://example.com/embed',
      'https://example.com/embed',
      'Embedding Title',
      'item_embed',
      now,
      now
    )

    db.prepare('INSERT INTO tags (id, user_id, name, created_at, item_count) VALUES (?, ?, ?, ?, 1)').run(
      'tag_embed',
      userId,
      'TypeScript',
      now
    )
    db.prepare('INSERT INTO item_tags (item_id, tag_id, created_at) VALUES (?, ?, ?)').run(
      'item_embed',
      'tag_embed',
      now
    )
  })

  it('writes embedding row and finalizes import entry', async () => {
    vi.mocked(embedDocuments).mockResolvedValue([[0.11, 0.22, 0.33]])

    const now = new Date().toISOString()
    const job: Job = {
      id: 'job_embed',
      item_id: 'item_embed',
      type: 'embed_process',
      state: 'pending',
      attempt: 0,
      run_after: now,
      locked_by: 'worker_1',
      lock_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      last_error_code: null,
      last_error_message: null,
      created_at: now,
      updated_at: now,
      started_at: now,
      finished_at: null,
    }

    db.prepare(
      'INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(job.id, job.item_id, job.type, job.state, job.attempt, job.run_after, job.created_at, job.updated_at)

    await processEmbedJob(db, job)

    const embedding = db
      .prepare('SELECT model, dimensions, vector_json, source_text_hash FROM item_embeddings WHERE item_id = ?')
      .get('item_embed') as
      | {
          model: string
          dimensions: number
          vector_json: string
          source_text_hash: string
        }
      | undefined
    expect(embedding).toBeTruthy()
    expect(embedding?.model).toBe('doubao-embedding-vision-251215')
    expect(embedding?.dimensions).toBe(3)
    expect(embedding?.vector_json).toContain('0.11')
    expect(embedding?.source_text_hash).toHaveLength(64)

    const entry = db
      .prepare('SELECT status, error_code, error_message FROM bookmark_import_entries WHERE id = ?')
      .get('import_entry_embed') as { status: string; error_code: string | null; error_message: string | null }
    expect(entry.status).toBe('done')
    expect(entry.error_code).toBeNull()
    expect(entry.error_message).toBeNull()

    const imp = db
      .prepare('SELECT status, failed_count, done_count, finished_at FROM bookmark_imports WHERE id = ?')
      .get('import_embed') as { status: string; failed_count: number; done_count: number; finished_at: string | null }
    expect(imp.status).toBe('completed')
    expect(imp.failed_count).toBe(0)
    expect(imp.done_count).toBe(1)
    expect(imp.finished_at).toBeTruthy()

    const updatedJob = db
      .prepare('SELECT progress_stage, progress_percent FROM jobs WHERE id = ?')
      .get('job_embed') as { progress_stage: string | null; progress_percent: number | null }
    expect(updatedJob.progress_stage).toBe('embed:done')
    expect(updatedJob.progress_percent).toBe(100)
  })

  it('marks retryable progress stage on failure', async () => {
    vi.mocked(embedDocuments).mockRejectedValue(new EmbeddingProviderError('Ark embedding request failed (500): boom'))

    const now = new Date().toISOString()
    const job: Job = {
      id: 'job_embed_fail',
      item_id: 'item_embed',
      type: 'embed_process',
      state: 'pending',
      attempt: 0,
      run_after: now,
      locked_by: 'worker_1',
      lock_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      last_error_code: null,
      last_error_message: null,
      created_at: now,
      updated_at: now,
      started_at: now,
      finished_at: null,
    }

    db.prepare(
      'INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(job.id, job.item_id, job.type, job.state, job.attempt, job.run_after, job.created_at, job.updated_at)

    await expect(processEmbedJob(db, job)).rejects.toThrow('failed (500)')

    const updatedJob = db
      .prepare('SELECT progress_stage, progress_message FROM jobs WHERE id = ?')
      .get('job_embed_fail') as { progress_stage: string | null; progress_message: string | null }
    expect(updatedJob.progress_stage).toBe('embed:error')
    expect(updatedJob.progress_message).toContain('Retrying:')
  })

  describe('shouldRetryEmbedError', () => {
    it('retries on embedding provider 429/5xx errors', () => {
      expect(shouldRetryEmbedError(new EmbeddingProviderError('Ark embedding request failed (429): limited'))).toBe(
        true
      )
      expect(shouldRetryEmbedError(new EmbeddingProviderError('Ark embedding request failed (503): down'))).toBe(
        true
      )
    })

    it('does not retry on embedding provider 4xx errors', () => {
      expect(shouldRetryEmbedError(new EmbeddingProviderError('Ark embedding request failed (400): bad'))).toBe(
        false
      )
    })
  })
})
