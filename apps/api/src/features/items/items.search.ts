import type Database from 'better-sqlite3'
import type { Item, ListItemsFilters, ListItemsResult } from './items.db.js'

export function searchItems(
  db: Database.Database,
  userId: string,
  query: string,
  filters: ListItemsFilters = {}
): ListItemsResult {
  const limit = filters.limit ?? 20
  const offset = filters.offset ?? 0

  const conditions: string[] = ['i.user_id = ?', 'items_fts MATCH ?']
  const params: Array<string | number> = [userId, query]

  if (filters.status) {
    conditions.push('i.status = ?')
    params.push(filters.status)
  }

  if (filters.domain) {
    conditions.push('i.domain = ?')
    params.push(filters.domain)
  }

  if (filters.created_after) {
    conditions.push('i.created_at >= ?')
    params.push(filters.created_after)
  }

  if (filters.created_before) {
    conditions.push('i.created_at < ?')
    params.push(filters.created_before)
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`

  const items = db
    .prepare(
      `
      SELECT i.*
      FROM items i
      JOIN items_fts ON i.id = items_fts.item_id
      ${whereClause}
      ORDER BY rank
      LIMIT ? OFFSET ?
      `
    )
    .all(...params, limit, offset) as Item[]

  const countResult = db
    .prepare(
      `
      SELECT COUNT(*) as count
      FROM items i
      JOIN items_fts ON i.id = items_fts.item_id
      ${whereClause}
      `
    )
    .get(...params) as { count: number }

  return {
    items,
    total: countResult.count,
  }
}
