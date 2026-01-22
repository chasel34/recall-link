import type Database from 'better-sqlite3'

export interface SearchFilters {
  limit?: number
  offset?: number
}

export interface SearchResult {
  items: Array<{
    id: string
    url: string
    domain: string | null
    title: string | null
    summary: string | null
    status: string
    created_at: string
  }>
  total: number
}

export function searchItems(
  db: Database.Database,
  query: string,
  filters: SearchFilters = {}
): SearchResult {
  const limit = filters.limit ?? 20
  const offset = filters.offset ?? 0

  const items = db
    .prepare(
      `
      SELECT i.id, i.url, i.domain, i.title, i.summary, i.status, i.created_at
      FROM items i
      JOIN items_fts fts ON i.id = fts.item_id
      WHERE items_fts MATCH ?
      ORDER BY rank
      LIMIT ? OFFSET ?
      `
    )
    .all(query, limit, offset) as SearchResult['items']

  const countResult = db
    .prepare(
      `
      SELECT COUNT(*) as count
      FROM items_fts
      WHERE items_fts MATCH ?
      `
    )
    .get(query) as { count: number }

  return {
    items,
    total: countResult.count,
  }
}
