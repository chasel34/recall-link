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

export type RetryJobData = {
  attempt: number
  run_after: string
  error_message: string
}

const LOCK_TTL_MS = 5 * 60 * 1000

/**
 * Acquire next available job with locking
 */
export function acquireJob(db: Database, workerId: string): Job | null {
  const now = new Date().toISOString()
  const lockExpiry = new Date(Date.now() + LOCK_TTL_MS).toISOString()

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
 * Retry job with updated run_after
 */
export function retryJob(db: Database, jobId: string, data: RetryJobData): void {
  const now = new Date().toISOString()
  db.prepare(`
    UPDATE jobs
    SET attempt = ?, run_after = ?, last_error_message = ?,
        locked_by = NULL, lock_expires_at = NULL, updated_at = ?
    WHERE id = ?
  `).run(data.attempt, data.run_after, data.error_message, now, jobId)
}
