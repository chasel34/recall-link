import { beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { searchItems } from './items.search.js'

describe('searchItems', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')

    db.exec(`
      CREATE TABLE items (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        url_normalized TEXT NOT NULL UNIQUE,
        domain TEXT,
        title TEXT,
        summary TEXT,
        clean_text TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE VIRTUAL TABLE items_fts USING fts5(
        item_id UNINDEXED,
        title,
        summary,
        tags,
        clean_text
      );
    `)
  })

  it('should search items by query string', () => {
    db.prepare(`
      INSERT INTO items (id, url, url_normalized, domain, title, summary, clean_text, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'item_1',
      'https://example.com/react',
      'https://example.com/react',
      'example.com',
      'React Tutorial',
      'Learn React hooks',
      'React hooks are powerful',
      'completed',
      '2024-01-20T10:00:00Z',
      '2024-01-20T10:00:00Z'
    )

    db.exec(`
      INSERT INTO items_fts (item_id, title, summary, tags, clean_text)
      VALUES ('item_1', 'React Tutorial', 'Learn React hooks', '', 'React hooks are powerful')
    `)

    const result = searchItems(db, 'react', { limit: 20, offset: 0 })

    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('item_1')
    expect(result.total).toBe(1)
  })

  it('should return empty result when no matches', () => {
    const result = searchItems(db, 'nonexistent', { limit: 20, offset: 0 })

    expect(result.items).toHaveLength(0)
    expect(result.total).toBe(0)
  })

  it('should support pagination', () => {
    for (let i = 1; i <= 5; i += 1) {
      db.prepare(`
        INSERT INTO items (id, url, url_normalized, domain, title, summary, clean_text, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `item_${i}`,
        `https://example.com/${i}`,
        `https://example.com/${i}`,
        'example.com',
        `Test ${i}`,
        'Test summary',
        'Test content',
        'completed',
        '2024-01-20T10:00:00Z',
        '2024-01-20T10:00:00Z'
      )

      db.exec(`
        INSERT INTO items_fts (item_id, title, summary, tags, clean_text)
        VALUES ('item_${i}', 'Test ${i}', 'Test summary', '', 'Test content')
      `)
    }

    const result = searchItems(db, 'test', { limit: 2, offset: 2 })

    expect(result.items).toHaveLength(2)
    expect(result.total).toBe(5)
  })
})
