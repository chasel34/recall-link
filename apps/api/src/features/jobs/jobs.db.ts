import type { Database } from 'better-sqlite3'

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
 * Acquire next available job with locking
 */
export function acquireJob(db: Database, workerId: string): Job | null {
  const now = new Date().toISOString()
  const lockExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  return db.transaction(() => {
    const job = db.prepare(`
      SELECT * FROM jobs
      WHERE state = 'pending'
        AND run_after <= ?
        AND (locked_by IS NULL OR lock_expires_at < ?)
      ORDER BY run_after ASC
      LIMIT 1
    `).get(now, now) as Job | undefined

    if (!job) {
      return null
    }

    db.prepare(`
      UPDATE jobs
      SET locked_by = ?, lock_expires_at = ?, started_at = ?, updated_at = ?
      WHERE id = ?
    `).run(workerId, lockExpiry, now, now, job.id)

    return {
      ...job,
      locked_by: workerId,
      lock_expires_at: lockExpiry,
      started_at: now,
    }
  })()
}

/**
 * Mark job as completed
 */
export function completeJob(db: Database, jobId: string): void {
  const now = new Date().toISOString()
  db.prepare(`
    UPDATE jobs
    SET state = 'completed', finished_at = ?, updated_at = ?
    WHERE id = ?
  `).run(now, now, jobId)
}

/**
 * Mark job as failed
 */
export function failJob(db: Database, jobId: string, errorMessage: string): void {
  const now = new Date().toISOString()
  db.prepare(`
    UPDATE jobs
    SET state = 'failed', last_error_message = ?, finished_at = ?, updated_at = ?
    WHERE id = ?
  `).run(errorMessage, now, now, jobId)
}

/**
 * Retry job with exponential backoff
 */
export function retryJob(
  db: Database,
  jobId: string,
  data: { attempt: number; run_after: string; error_message: string }
): void {
  const now = new Date().toISOString()
  db.prepare(`
    UPDATE jobs
    SET attempt = ?, run_after = ?, last_error_message = ?,
        locked_by = NULL, lock_expires_at = NULL, updated_at = ?
    WHERE id = ?
  `).run(data.attempt, data.run_after, data.error_message, now, jobId)
}

/**
 * Update item with fetched content
 */
export function updateItemContent(
  db: Database,
  itemId: string,
  data: { title?: string; clean_text?: string; clean_html?: string; status: string }
): void {
  const now = new Date().toISOString()

  const sets: string[] = []
  const params: Array<string | number> = []

  if (data.title) {
    sets.push('title = ?')
    params.push(data.title)
  }

  if (data.clean_text !== undefined) {
    sets.push('clean_text = ?')
    params.push(data.clean_text)
  }

  if (data.clean_html !== undefined) {
    sets.push('clean_html = ?')
    params.push(data.clean_html)
  }

  sets.push('status = ?', 'processed_at = ?', 'updated_at = ?')
  params.push(data.status, now, now)

  params.push(itemId)

  const sql = `UPDATE items SET ${sets.join(', ')} WHERE id = ?`
  db.prepare(sql).run(...params)
}

/**
 * Mark item as failed
 */
export function failItem(db: Database, itemId: string, errorMessage: string): void {
  const now = new Date().toISOString()
  db.prepare(`
    UPDATE items
    SET status = 'failed', error_message = ?, updated_at = ?
    WHERE id = ?
  `).run(errorMessage, now, itemId)
}
