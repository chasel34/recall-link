import type { Database } from 'better-sqlite3'

/**
 * Keep the items_fts table in sync with items + tags.
 *
 * NOTE: This is intentionally implemented in SQL (no imports from items.db/tags.db)
 * to avoid circular dependencies.
 *
 * Multi-user TODO: when user_id becomes mandatory, items_fts will need to be
 * scoped per-user (separate FTS table per user, or store user_id + filter).
 */

type ItemFtsRow = {
  item_id: string
  title: string | null
  summary: string | null
  clean_text: string | null
}

export function replaceItemFts(db: Database, itemId: string): void {
  const item = db
    .prepare(
      `
        SELECT id as item_id, title, summary, clean_text
        FROM items
        WHERE id = ?
      `
    )
    .get(itemId) as ItemFtsRow | undefined

  if (!item) {
    return
  }

  const tags = db
    .prepare(
      `
        SELECT t.name
        FROM tags t
        JOIN item_tags it ON t.id = it.tag_id
        WHERE it.item_id = ?
        ORDER BY t.name ASC
      `
    )
    .all(itemId) as Array<{ name: string }>

  const tagsText = tags.map((t) => t.name).join(' ')

  db.prepare('DELETE FROM items_fts WHERE item_id = ?').run(itemId)

  db.prepare(
    `
      INSERT INTO items_fts (item_id, title, summary, tags, clean_text)
      VALUES (?, ?, ?, ?, ?)
    `
  ).run(
    item.item_id,
    item.title ?? '',
    item.summary ?? '',
    tagsText,
    item.clean_text ?? ''
  )
}

export function deleteItemFts(db: Database, itemId: string): void {
  db.prepare('DELETE FROM items_fts WHERE item_id = ?').run(itemId)
}
