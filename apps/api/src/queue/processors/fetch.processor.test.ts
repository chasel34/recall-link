import { describe, it, expect, beforeEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../../db/client.js'
import { processFetchJob } from './fetch.processor.js'
import type { Job } from '@recall-link/jobs'
import { handleFetch } from '@recall-link/jobs-handlers'

vi.mock('@recall-link/jobs-handlers', () => ({
  handleFetch: vi.fn(),
}))

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
    `).run(
      'item_test',
      'https://example.com/article',
      'https://example.com/article',
      'example.com',
      'pending',
      timestamp,
      timestamp
    )
  })

  it('should fetch and extract content successfully', async () => {
    const cleanHtml = `
      <article>
        <h1>Test Article</h1>
        <p>This is the main content of the article.</p>
        <p>It has multiple paragraphs.</p>
        <p><a href="https://example.com/rel" rel="noopener noreferrer" target="_blank">Relative link</a></p>
      </article>
    `

    vi.mocked(handleFetch).mockResolvedValue({
      title: 'Test Article',
      clean_text: 'This is the main content of the article. It has multiple paragraphs.',
      clean_html: cleanHtml,
    })

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
    const aiJob = db
      .prepare("SELECT * FROM jobs WHERE item_id = ? AND type = 'ai_process'")
      .get('item_test') as any
    expect(item.title).toBe('Test Article')
    expect(item.clean_text).toContain('main content')
    expect(item.clean_html).toContain('<a')
    expect(item.clean_html).toContain('href="https://example.com/rel"')
    expect(item.clean_html).toContain('rel="noopener noreferrer"')
    expect(item.clean_html).toContain('target="_blank"')
    expect(item.clean_html).not.toContain('<script')
    expect(item.clean_html).not.toContain('<img')
    expect(item.status).toBe('completed')
    expect(item.processed_at).toBeTruthy()
    expect(aiJob).toBeTruthy()
  })

  it('should enqueue ai_process when ai_mode is user and config exists', async () => {
    const timestamp = new Date().toISOString()
    db.prepare('UPDATE items SET ai_mode = ?, user_id = ? WHERE id = ?').run(
      'user',
      'user_test',
      'item_test'
    )
    db.prepare(
      `
        INSERT INTO users (id, email, password_hash, password_salt, created_at)
        VALUES (?, ?, ?, ?, ?)
      `
    ).run('user_test', 'user_test@example.com', 'hash', 'salt', timestamp)
    db.prepare(
      `
        INSERT INTO user_model_configs (
          id,
          user_id,
          mode,
          provider,
          base_url,
          model,
          api_key_enc,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      'umc_test',
      'user_test',
      'user',
      'gemini',
      null,
      null,
      'enc_key',
      timestamp,
      timestamp
    )

    vi.mocked(handleFetch).mockResolvedValue({
      title: 'User Article',
      clean_text: 'User mode content.',
      clean_html: '<article><p>User mode content.</p></article>',
    })

    const job: Job = {
      id: 'job_local_test',
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

    const aiJob = db
      .prepare("SELECT * FROM jobs WHERE item_id = ? AND type = 'ai_process'")
      .get('item_test') as any
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get('item_test') as any

    expect(item.status).toBe('completed')
    expect(aiJob).toBeTruthy()
  })

  it('should skip ai_process when ai_mode is user and config missing api key', async () => {
    const timestamp = new Date().toISOString()
    db.prepare('UPDATE items SET ai_mode = ?, user_id = ? WHERE id = ?').run(
      'user',
      'user_missing_key',
      'item_test'
    )
    db.prepare(
      `
        INSERT INTO users (id, email, password_hash, password_salt, created_at)
        VALUES (?, ?, ?, ?, ?)
      `
    ).run('user_missing_key', 'user_missing_key@example.com', 'hash', 'salt', timestamp)
    db.prepare(
      `
        INSERT INTO user_model_configs (
          id,
          user_id,
          mode,
          provider,
          base_url,
          model,
          api_key_enc,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      'umc_missing_key',
      'user_missing_key',
      'user',
      'gemini',
      null,
      null,
      null,
      timestamp,
      timestamp
    )

    vi.mocked(handleFetch).mockResolvedValue({
      title: 'User Article',
      clean_text: 'User mode content.',
      clean_html: '<article><p>User mode content.</p></article>',
    })

    const job: Job = {
      id: 'job_local_test_missing',
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

    const aiJob = db
      .prepare("SELECT * FROM jobs WHERE item_id = ? AND type = 'ai_process'")
      .get('item_test') as any
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get('item_test') as any

    expect(item.status).toBe('completed')
    expect(aiJob).toBeUndefined()
  })

  it('should handle HTTP errors', async () => {
    vi.mocked(handleFetch).mockRejectedValue(new Error('HTTP 404'))

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

    await expect(processFetchJob(db, job)).rejects.toThrow('HTTP 404')

    const updatedJob = db
      .prepare('SELECT progress_stage, progress_message FROM jobs WHERE id = ?')
      .get('job_test') as any
    expect(updatedJob.progress_stage).toBe('fetch:error')
    expect(updatedJob.progress_message).toBe('Retrying: HTTP 404')
  })

  it('should handle network errors', async () => {
    vi.mocked(handleFetch).mockRejectedValue(new Error('Network failure'))

    const job: Job = {
      id: 'job_test_network',
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

    await expect(processFetchJob(db, job)).rejects.toThrow('Network failure')

    const updatedJob = db
      .prepare('SELECT progress_stage, progress_message FROM jobs WHERE id = ?')
      .get('job_test_network') as any
    expect(updatedJob.progress_stage).toBe('fetch:error')
    expect(updatedJob.progress_message).toBe('Retrying: Network failure')
  })
})
