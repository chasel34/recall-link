import type { Database } from 'better-sqlite3'
import { setItemTags } from '../tags/tags.db.js'

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
  clean_html: string | null
  summary: string | null
  summary_source: string | null
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

export type ListItemsFilters = {
  status?: 'pending' | 'completed' | 'failed'
  domain?: string
  created_after?: string
  created_before?: string
  sort_by?: 'created_at' | 'updated_at' | 'domain'
  sort_order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export type ListItemsResult = {
  items: Item[]
  total: number
}

/**
 * List items with pagination, filtering, and sorting
 */
export function listItems(db: Database, filters: ListItemsFilters = {}): ListItemsResult {
  const {
    status,
    domain,
    created_after,
    created_before,
    sort_by = 'created_at',
    sort_order = 'desc',
    limit = 20,
    offset = 0,
  } = filters

  const conditions: string[] = []
  const params: Array<string | number> = []

  if (status) {
    conditions.push('status = ?')
    params.push(status)
  }

  if (domain) {
    conditions.push('domain = ?')
    params.push(domain)
  }

  if (created_after) {
    conditions.push('created_at >= ?')
    params.push(created_after)
  }

  if (created_before) {
    conditions.push('created_at < ?')
    params.push(created_before)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const countSql = `SELECT COUNT(*) as count FROM items ${whereClause}`
  const { count } = db.prepare(countSql).get(...params) as { count: number }

  const validSortBy = ['created_at', 'updated_at', 'domain'].includes(sort_by) ? sort_by : 'created_at'
  const validSortOrder = sort_order === 'asc' ? 'ASC' : 'DESC'

  const itemsSql = `
    SELECT * FROM items
    ${whereClause}
    ORDER BY ${validSortBy} ${validSortOrder}
    LIMIT ? OFFSET ?
  `
  const items = db.prepare(itemsSql).all(...params, limit, offset) as Item[]

  return {
    items,
    total: count,
  }
}

export function listItemsByTags(
  db: Database,
  tagNames: string[],
  filters: ListItemsFilters = {}
): ListItemsResult {
  const {
    status,
    domain,
    created_after,
    created_before,
    sort_by = 'created_at',
    sort_order = 'desc',
    limit = 20,
    offset = 0,
  } = filters

  const conditions: string[] = []
  const params: Array<string | number> = []

  if (status) {
    conditions.push('i.status = ?')
    params.push(status)
  }

  if (domain) {
    conditions.push('i.domain = ?')
    params.push(domain)
  }

  if (created_after) {
    conditions.push('i.created_at >= ?')
    params.push(created_after)
  }

  if (created_before) {
    conditions.push('i.created_at <= ?')
    params.push(created_before)
  }

  const tagPlaceholders = tagNames.map(() => '?').join(',')
  params.push(...tagNames)

  const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''

  const countSql = `
    SELECT COUNT(DISTINCT i.id) as count
    FROM items i
    JOIN item_tags it ON i.id = it.item_id
    JOIN tags t ON it.tag_id = t.id
    WHERE t.name IN (${tagPlaceholders})
    ${whereClause}
  `
  const { count } = db.prepare(countSql).get(...params) as { count: number }

  const validSortBy = ['created_at', 'updated_at', 'domain'].includes(sort_by) ? sort_by : 'created_at'
  const validSortOrder = sort_order === 'asc' ? 'ASC' : 'DESC'

  const itemsSql = `
    SELECT DISTINCT i.*
    FROM items i
    JOIN item_tags it ON i.id = it.item_id
    JOIN tags t ON it.tag_id = t.id
    WHERE t.name IN (${tagPlaceholders})
    ${whereClause}
    ORDER BY i.${validSortBy} ${validSortOrder}
    LIMIT ? OFFSET ?
  `
  const items = db.prepare(itemsSql).all(...params, limit, offset) as Item[]

  return { items, total: count }
}

/**
 * Get item by ID
 */
export function getItemById(db: Database, id: string): Item | null {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as Item | undefined
  return item ?? null
}

export type UpdateItemData = {
  summary?: string
  tags?: string[]
  note?: string
}

/**
 * Update item fields (user editable)
 */
export function updateItem(db: Database, id: string, updates: UpdateItemData): { changes: number } {
  return db.transaction(() => {
    const sets: string[] = []
    const params: Array<string | number> = []

    if (updates.summary !== undefined) {
      sets.push('summary = ?', 'summary_source = ?')
      params.push(updates.summary, 'user')
    }

    if (updates.note !== undefined) {
      sets.push('note = ?')
      params.push(updates.note)
    }

    // Sync item_tags table when tags are updated
    if (updates.tags !== undefined) {
      setItemTags(db, id, updates.tags)
    }

    if (sets.length === 0) {
      return { changes: 0 }
    }

    sets.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(id)

    const sql = `UPDATE items SET ${sets.join(', ')} WHERE id = ?`
    const result = db.prepare(sql).run(...params)

    return { changes: result.changes }
  })()
}

/**
 * Delete item and associated jobs in transaction
 */
export function deleteItem(db: Database, id: string): { deletedItem: number; deletedJobs: number } {
  return db.transaction(() => {
    const affectedTagIds = db
      .prepare('SELECT tag_id FROM item_tags WHERE item_id = ?')
      .all(id) as { tag_id: string }[]

    // Defensive cleanup for databases created before foreign_keys=ON was enforced.
    db.prepare('DELETE FROM item_tags WHERE item_id = ?').run(id)

    const jobResult = db.prepare('DELETE FROM jobs WHERE item_id = ?').run(id)
    const itemResult = db.prepare('DELETE FROM items WHERE id = ?').run(id)

    const updateStmt = db.prepare(`
      UPDATE tags
      SET item_count = (
        SELECT COUNT(*) FROM item_tags WHERE tag_id = ?
      )
      WHERE id = ?
    `)

    for (const row of affectedTagIds) {
      updateStmt.run(row.tag_id, row.tag_id)
    }

    return {
      deletedItem: itemResult.changes,
      deletedJobs: jobResult.changes,
    }
  })()
}
