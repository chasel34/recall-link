import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../db/client.js'
import { setDb, closeDb } from '../db/context.js'
import { updateItem } from '../features/items/items.db.js'

describe('items_fts sync', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())
    setDb(db)
  })

  afterEach(() => {
    closeDb()
  })

  it('updates items_fts when summary/tags change', () => {
    const now = new Date().toISOString()
    db.prepare(
      `
        INSERT INTO items (id, url, url_normalized, domain, status, clean_text, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      'item_fts',
      'https://example.com/a',
      'https://example.com/a',
      'example.com',
      'completed',
      'hello world',
      now,
      now
    )

    updateItem(db, 'item_fts', { summary: 'My summary', tags: ['React', '前端'] })

    const row = db
      .prepare('SELECT item_id, summary, tags FROM items_fts WHERE item_id = ?')
      .get('item_fts') as { item_id: string; summary: string; tags: string }

    expect(row.item_id).toBe('item_fts')
    expect(row.summary).toContain('My summary')
    expect(row.tags).toContain('React')
  })
})
