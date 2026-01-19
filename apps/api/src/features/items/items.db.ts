import type { Database } from 'better-sqlite3'

export type Item = {
  id: string
  url: string
  url_normalized: string
  title: string | null
  domain: string
  status: string
  error_code: string | null
  error_message: string | null
  clean_text: string | null
  summary: string | null
  summary_source: string | null
  tags_json: string | null
  tags_source: string | null
  note: string | null
  created_at: string
  updated_at: string
  processed_at: string | null
}

export type Job = {
  id: string
  item_id: string
  type: string
  state: string
  attempt: number
  run_after: string
  locked_by: string | null
  lock_expires_at: string | null
  last_error_code: string | null
  last_error_message: string | null
  created_at: string
  updated_at: string
  started_at: string | null
  finished_at: string | null
}

/**
 * Find item by normalized URL
 */
export function findItemByNormalizedUrl(db: Database, normalizedUrl: string): Item | null {
  const item = db.prepare('SELECT * FROM items WHERE url_normalized = ?').get(normalizedUrl) as Item | undefined
  return item ?? null
}

/**
 * Create item and fetch job in a transaction
 */
export function createItemWithJob(
  db: Database,
  data: {
    itemId: string
    jobId: string
    url: string
    urlNormalized: string
    domain: string
    timestamp: string
  }
): { itemId: string; jobId: string } {
  return db.transaction(() => {
    db.prepare(`
      INSERT INTO items (id, url, url_normalized, domain, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      data.itemId,
      data.url,
      data.urlNormalized,
      data.domain,
      data.timestamp,
      data.timestamp
    )

    db.prepare(`
      INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at)
      VALUES (?, ?, 'fetch', 'pending', 0, ?, ?, ?)
    `).run(
      data.jobId,
      data.itemId,
      data.timestamp,
      data.timestamp,
      data.timestamp
    )

    return { itemId: data.itemId, jobId: data.jobId }
  })()
}
