import type { Database } from 'better-sqlite3'
import { generateId } from '../../lib/utils.js'

export type Tag = {
  id: string
  name: string
  created_at: string
  item_count: number
}

export function findOrCreateTag(db: Database, name: string): string {
  const existing = db
    .prepare('SELECT id FROM tags WHERE name = ?')
    .get(name) as { id: string } | undefined

  if (existing) {
    return existing.id
  }

  const id = generateId('tag')
  const now = new Date().toISOString()
  db.prepare(
    `
      INSERT INTO tags (id, name, created_at, item_count)
      VALUES (?, ?, ?, 0)
    `
  ).run(id, name, now)

  return id
}

export function setItemTags(db: Database, itemId: string, tagNames: string[]): void {
  db.transaction(() => {
    db.prepare('DELETE FROM item_tags WHERE item_id = ?').run(itemId)

    const now = new Date().toISOString()
    for (const name of tagNames) {
      const tagId = findOrCreateTag(db, name)
      db.prepare(
        `
          INSERT INTO item_tags (item_id, tag_id, created_at)
          VALUES (?, ?, ?)
        `
      ).run(itemId, tagId, now)
    }

    db.prepare(
      `
        UPDATE tags
        SET item_count = (
          SELECT COUNT(*) FROM item_tags WHERE tag_id = tags.id
        )
      `
    ).run()
  })()
}

export function getItemTags(db: Database, itemId: string): string[] {
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
    .all(itemId) as { name: string }[]

  return tags.map((tag) => tag.name)
}

export function getAllTagNames(db: Database): string[] {
  const tags = db
    .prepare('SELECT name FROM tags ORDER BY name ASC')
    .all() as { name: string }[]
  return tags.map((tag) => tag.name)
}

export function listTags(db: Database): Tag[] {
  return db
    .prepare(
      `
        SELECT id, name, item_count, created_at
        FROM tags
        ORDER BY item_count DESC, name ASC
      `
    )
    .all() as Tag[]
}
