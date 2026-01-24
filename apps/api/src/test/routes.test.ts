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

describe('GET /api/items', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())
    setDb(db)
  })

  afterEach(() => {
    closeDb()
  })

  it('should return empty list by default', async () => {
    const res = await app.request('/api/items')

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.items).toEqual([])
    expect(data.total).toBe(0)
    expect(data.limit).toBe(20)
    expect(data.offset).toBe(0)
  })

  it('should paginate results', async () => {
    for (let i = 1; i <= 3; i += 1) {
      await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `https://example.com/${i}` }),
      })
    }

    const res = await app.request('/api/items?limit=2&offset=1')

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.items).toHaveLength(2)
    expect(data.total).toBe(3)
    expect(data.limit).toBe(2)
    expect(data.offset).toBe(1)
  })

  it('should filter items by search query', async () => {
    db.prepare(
      `
      INSERT INTO items (id, url, url_normalized, title, domain, status, clean_text, summary, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      'item_react',
      'https://example.com/react',
      'https://example.com/react',
      'React Tutorial',
      'example.com',
      'completed',
      'React hooks are powerful',
      'Learn React hooks',
      '2024-01-20T10:00:00Z',
      '2024-01-20T10:00:00Z'
    )

    db.prepare(
      `
      INSERT INTO items (id, url, url_normalized, title, domain, status, clean_text, summary, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      'item_vue',
      'https://example.com/vue',
      'https://example.com/vue',
      'Vue Guide',
      'example.com',
      'completed',
      'Vue is great',
      'Learn Vue',
      '2024-01-20T10:00:00Z',
      '2024-01-20T10:00:00Z'
    )

    db.exec(`
      INSERT INTO items_fts (item_id, title, summary, tags, clean_text)
      VALUES
        ('item_react', 'React Tutorial', 'Learn React hooks', '', 'React hooks are powerful'),
        ('item_vue', 'Vue Guide', 'Learn Vue', '', 'Vue is great')
    `)

    const res = await app.request('/api/items?q=react')

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.items).toHaveLength(1)
    expect(data.items[0].url).toBe('https://example.com/react')
    expect(data.total).toBe(1)
  })
})

describe('GET /api/items/:id', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())
    setDb(db)
  })

  afterEach(() => {
    closeDb()
  })

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
    expect(data).toHaveProperty('clean_html')
  })

  it('should return 404 for non-existent item', async () => {
    const res = await app.request('/api/items/item_nonexistent')

    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('NOT_FOUND')
  })
})

describe('PATCH /api/items/:id', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())
    setDb(db)
  })

  afterEach(() => {
    closeDb()
  })

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
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())
    setDb(db)
  })

  afterEach(() => {
    closeDb()
  })

  it('should delete item', async () => {
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
