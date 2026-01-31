import type { Database } from 'better-sqlite3'

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
