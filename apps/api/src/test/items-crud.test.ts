import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { app } from '../app.js'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../db/client.js'
import { setDb, closeDb } from '../db/context.js'

describe('Items CRUD Integration Tests', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())
    setDb(db)
  })

  afterEach(() => {
    closeDb()
  })

  describe('GET /api/items', () => {
    it('should return empty list', async () => {
      const res = await app.request('/api/items')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.items).toEqual([])
      expect(data.total).toBe(0)
    })

    it('should return paginated items', async () => {
      for (let i = 1; i <= 3; i += 1) {
        await app.request('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: `https://example.com/${i}` }),
        })
      }

      const res = await app.request('/api/items?limit=2&offset=0')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.items).toHaveLength(2)
      expect(data.total).toBe(3)
    })

    it('should filter by status', async () => {
      const res1 = await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/1' }),
      })
      const item1 = await res1.json()

      db.prepare('UPDATE items SET status = ? WHERE id = ?').run('completed', item1.id)

      const res = await app.request('/api/items?status=completed')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.items).toHaveLength(1)
      expect(data.items[0].status).toBe('completed')
    })

    it('should filter by domain', async () => {
      await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/1' }),
      })

      await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://other.com/1' }),
      })

      const res = await app.request('/api/items?domain=example.com')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.items).toHaveLength(1)
      expect(data.items[0].domain).toBe('example.com')
    })

    it('should sort by created_at asc', async () => {
      await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/1' }),
      })

      await new Promise((resolve) => setTimeout(resolve, 10))

      await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/2' }),
      })

      const res = await app.request('/api/items?sort_by=created_at&sort_order=asc')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.items[0].url).toBe('https://example.com/1')
      expect(data.items[1].url).toBe('https://example.com/2')
    })
  })

  describe('GET /api/items/:id', () => {
    it('should return item by id', async () => {
      const createRes = await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' }),
      })
      const created = await createRes.json()

      const res = await app.request(`/api/items/${created.id}`)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe(created.id)
      expect(data.url).toBe('https://example.com')
    })

    it('should return 404 for non-existent item', async () => {
      const res = await app.request('/api/items/item_nonexistent')
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('NOT_FOUND')
    })
  })

  describe('PATCH /api/items/:id', () => {
    it('should update summary', async () => {
      const createRes = await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' }),
      })
      const created = await createRes.json()

      const res = await app.request(`/api/items/${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: 'My summary' }),
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.summary).toBe('My summary')
      expect(data.summary_source).toBe('user')
    })

    it('should update tags', async () => {
      const createRes = await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' }),
      })
      const created = await createRes.json()

      const res = await app.request(`/api/items/${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: ['react', 'typescript'] }),
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.tags_json).toBe('["react","typescript"]')
      expect(data.tags_source).toBe('user')
    })

    it('should update note', async () => {
      const createRes = await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' }),
      })
      const created = await createRes.json()

      const res = await app.request(`/api/items/${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Read later' }),
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.note).toBe('Read later')
    })

    it('should return 404 for non-existent item', async () => {
      const res = await app.request('/api/items/item_nonexistent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Test' }),
      })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/items/:id', () => {
    it('should delete item and associated jobs', async () => {
      const createRes = await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' }),
      })
      const created = await createRes.json()

      const res = await app.request(`/api/items/${created.id}`, {
        method: 'DELETE',
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.message).toBe('Item deleted')

      const getRes = await app.request(`/api/items/${created.id}`)
      expect(getRes.status).toBe(404)
    })

    it('should return 404 for non-existent item', async () => {
      const res = await app.request('/api/items/item_nonexistent', {
        method: 'DELETE',
      })
      expect(res.status).toBe(404)
    })
  })
})
