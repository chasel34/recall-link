import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../../db/client.js'
import {
  findOrCreateTag,
  setItemTags,
  getItemTags,
  getAllTagNames,
  listTags,
} from './tags.db.js'

describe('tags.db', () => {
  let db: Database.Database
  const userId = 'user_test'

  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())

    const timestamp = new Date().toISOString()
    db.prepare(`
      INSERT INTO items (id, user_id, url, url_normalized, domain, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('item_test', userId, 'https://example.com', 'https://example.com', 'example.com', 'pending', timestamp, timestamp)
  })

  describe('findOrCreateTag', () => {
    it('should create new tag if not exists', () => {
      const tagId = findOrCreateTag(db, userId, 'React')
      expect(tagId).toMatch(/^tag_/)

      const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(tagId) as any
      expect(tag.name).toBe('React')
      expect(tag.item_count).toBe(0)
    })

    it('should return existing tag if already exists', () => {
      const id1 = findOrCreateTag(db, userId, 'React')
      const id2 = findOrCreateTag(db, userId, 'React')
      expect(id1).toBe(id2)

      const count = db.prepare('SELECT COUNT(*) as count FROM tags').get() as { count: number }
      expect(count.count).toBe(1)
    })
  })

  describe('setItemTags', () => {
    it('should set tags for item', () => {
      setItemTags(db, userId, 'item_test', ['React', 'TypeScript', '前端'])

      const tags = getItemTags(db, 'item_test')
      expect(tags).toEqual(['React', 'TypeScript', '前端'])
    })

    it('should replace existing tags', () => {
      setItemTags(db, userId, 'item_test', ['React', 'TypeScript'])
      setItemTags(db, userId, 'item_test', ['Vue', 'JavaScript'])

      const tags = getItemTags(db, 'item_test')
      expect(tags).toEqual(['JavaScript', 'Vue'])
    })

    it('should update item_count for tags', () => {
      setItemTags(db, userId, 'item_test', ['React', 'TypeScript'])

      const react = db
        .prepare('SELECT item_count FROM tags WHERE user_id = ? AND name = ?')
        .get(userId, 'React') as { item_count: number }
      expect(react.item_count).toBe(1)
    })

    it('should delete item_tags when setting empty array', () => {
      setItemTags(db, userId, 'item_test', ['React'])
      setItemTags(db, userId, 'item_test', [])

      const tags = getItemTags(db, 'item_test')
      expect(tags).toEqual([])
    })

    it('should only update item_count for affected tags', () => {
      const timestamp = new Date().toISOString()

      // Create another item
      db.prepare(`
        INSERT INTO items (id, user_id, url, url_normalized, domain, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('item_test2', userId, 'https://example.com/2', 'https://example.com/2', 'example.com', 'pending', timestamp, timestamp)

      // Set tags for both items
      setItemTags(db, userId, 'item_test', ['React', 'TypeScript', 'Frontend'])
      setItemTags(db, userId, 'item_test2', ['Vue', 'JavaScript'])

      // Verify initial counts
      const getCount = (name: string) => {
        const result = db
          .prepare('SELECT item_count FROM tags WHERE user_id = ? AND name = ?')
          .get(userId, name) as { item_count: number } | undefined
        return result?.item_count ?? 0
      }

      expect(getCount('React')).toBe(1)
      expect(getCount('TypeScript')).toBe(1)
      expect(getCount('Frontend')).toBe(1)
      expect(getCount('Vue')).toBe(1)
      expect(getCount('JavaScript')).toBe(1)

      // Update item_test tags: React, TypeScript, Frontend → React, Vue, Backend
      // Affected tags: React (old+new), TypeScript (old only), Frontend (old only), Vue (new only), Backend (new only)
      // Unaffected: JavaScript (should stay 1)
      setItemTags(db, userId, 'item_test', ['React', 'Vue', 'Backend'])

      // Verify counts after update
      expect(getCount('React')).toBe(1)      // Kept
      expect(getCount('TypeScript')).toBe(0) // Removed from item_test
      expect(getCount('Frontend')).toBe(0)   // Removed from item_test
      expect(getCount('Vue')).toBe(2)        // Added to item_test (was 1 from item_test2)
      expect(getCount('Backend')).toBe(1)    // New tag
      expect(getCount('JavaScript')).toBe(1) // Unaffected (only in item_test2)
    })
  })

  describe('getItemTags', () => {
    it('should return empty array if no tags', () => {
      const tags = getItemTags(db, 'item_test')
      expect(tags).toEqual([])
    })

    it('should return sorted tag names', () => {
      setItemTags(db, userId, 'item_test', ['Vue', 'React', 'Angular'])
      const tags = getItemTags(db, 'item_test')
      expect(tags).toEqual(['Angular', 'React', 'Vue'])
    })
  })

  describe('getAllTagNames', () => {
    it('should return empty array if no tags', () => {
      const tags = getAllTagNames(db, userId)
      expect(tags).toEqual([])
    })

    it('should return all tag names sorted', () => {
      findOrCreateTag(db, userId, 'Vue')
      findOrCreateTag(db, userId, 'React')
      findOrCreateTag(db, userId, 'Angular')

      const tags = getAllTagNames(db, userId)
      expect(tags).toEqual(['Angular', 'React', 'Vue'])
    })
  })

  describe('listTags', () => {
    it('should return empty array if no tags', () => {
      const tags = listTags(db, userId)
      expect(tags).toEqual([])
    })

    it('should return tags with metadata', () => {
      setItemTags(db, userId, 'item_test', ['React', 'TypeScript'])

      const tags = listTags(db, userId)
      expect(tags).toHaveLength(2)
      expect(tags[0]).toMatchObject({
        id: expect.stringMatching(/^tag_/),
        name: expect.any(String),
        item_count: 1,
        created_at: expect.any(String),
      })
    })

    it('should sort by item_count desc then name asc', () => {
      const timestamp = new Date().toISOString()
      db.prepare(`
        INSERT INTO items (id, user_id, url, url_normalized, domain, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('item_test2', userId, 'https://example.com/2', 'https://example.com/2', 'example.com', 'pending', timestamp, timestamp)

      setItemTags(db, userId, 'item_test', ['React', 'Vue'])
      setItemTags(db, userId, 'item_test2', ['React'])

      const tags = listTags(db, userId)
      expect(tags[0].name).toBe('React')
      expect(tags[0].item_count).toBe(2)
      expect(tags[1].name).toBe('Vue')
      expect(tags[1].item_count).toBe(1)
    })
  })
})
