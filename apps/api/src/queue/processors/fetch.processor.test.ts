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

    await expect(processFetchJob(db, job)).rejects.toThrow('HTTP 404')
  })

  it('should handle network errors', async () => {
    vi.mocked(handleFetch).mockRejectedValue(new Error('Network failure'))

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

    await expect(processFetchJob(db, job)).rejects.toThrow('Network failure')
  })
})
