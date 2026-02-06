import type { Database } from 'better-sqlite3'
import type { ListJobsQuery, JobInList } from './jobs.schema.js'

export type ListJobsResult = {
  jobs: JobInList[]
  total: number
}

export function listInProgressJobs(
  db: Database,
  userId: string,
  filters: ListJobsQuery,
  now: string = new Date().toISOString()
): ListJobsResult {
  const { limit, offset, type, status } = filters

  const params: Record<string, any> = { userId, now }

  const typeFilter = type ? type.split(',').map((t) => t.trim()) : null
  const statusFilter = status ? status.split(',').map((s) => s.trim()) : null

  let typeCondition = ''
  if (typeFilter && typeFilter.length > 0) {
    const typePlaceholders = typeFilter.map((_, i) => `:type${i}`).join(', ')
    typeCondition = `AND j.type IN (${typePlaceholders})`
    typeFilter.forEach((t, i) => {
      params[`type${i}`] = t
    })
  }

  // CTE to compute ui_status first
  const baseSql = `
    SELECT
      j.*,
      i.url as item_url,
      i.title as item_title,
      CASE
        WHEN j.locked_by IS NOT NULL AND j.lock_expires_at >= :now THEN 'running'
        WHEN j.run_after > :now THEN 'scheduled'
        WHEN j.locked_by IS NOT NULL AND j.lock_expires_at < :now THEN 'stale_lock'
        ELSE 'queued'
      END as ui_status
    FROM jobs j
    JOIN items i ON j.item_id = i.id
    WHERE i.user_id = :userId
      AND j.state = 'pending'
      ${typeCondition}
  `

  let filterSql = 'WHERE 1=1'
  if (statusFilter && statusFilter.length > 0) {
    const statusPlaceholders = statusFilter.map((_, i) => `:status${i}`).join(', ')
    filterSql += ` AND ui_status IN (${statusPlaceholders})`
    statusFilter.forEach((s, i) => {
      params[`status${i}`] = s
    })
  }

  const fullQuery = `
    WITH jobs_with_status AS (
      ${baseSql}
    )
    SELECT * FROM jobs_with_status
    ${filterSql}
  `

  const countSql = `SELECT COUNT(*) as count FROM (${fullQuery})`
  const { count } = db.prepare(countSql).get(params) as { count: number }

  const itemsSql = `
    ${fullQuery}
    ORDER BY created_at DESC
    LIMIT :limit OFFSET :offset
  `
  params.limit = limit
  params.offset = offset

  const jobs = db.prepare(itemsSql).all(params) as JobInList[]

  return {
    jobs,
    total: count,
  }
}
