import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { app } from '../app.js'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../db/client.js'
import { setDb, closeDb } from '../db/context.js'

describe('POST /api/items', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())
    setDb(db)
  })

  afterEach(() => {
    closeDb()
  })

  it('should create item with valid URL', async () => {
    const res = await app.request('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/article' }),
    })

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data).toMatchObject({
      id: expect.stringMatching(/^item_/),
      url: 'https://example.com/article',
      domain: 'example.com',
      status: 'pending',
      created_at: expect.any(String),
    })
  })

  it('should reject invalid URL', async () => {
    const res = await app.request('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'not-a-url' }),
    })

    expect(res.status).toBe(400)
  })

  it('should reject duplicate URL', async () => {
    const url = 'https://example.com/article'

    const res1 = await app.request('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    expect(res1.status).toBe(201)
    const data1 = await res1.json()

    const res2 = await app.request('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    expect(res2.status).toBe(409)
    const data2 = await res2.json()
    expect(data2).toMatchObject({
      error: 'DUPLICATE_URL',
      message: expect.any(String),
      existing_item_id: data1.id,
    })
  })

  it('should normalize URLs before duplicate check', async () => {
    const res1 = await app.request('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/article?utm_source=twitter' }),
    })
    expect(res1.status).toBe(201)

    const res2 = await app.request('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/article' }),
    })
    expect(res2.status).toBe(409)
  })

  it('should extract domain correctly', async () => {
    const res = await app.request('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://blog.example.com/post/123' }),
    })

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.domain).toBe('blog.example.com')
  })
})
