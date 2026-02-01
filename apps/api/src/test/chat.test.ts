import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../db/client.js'
import { setDb, closeDb } from '../db/context.js'
import { registerTestUser } from './test-auth.js'

vi.mock('../features/chat/chat.llm.js', () => {
  async function* gen() {
    yield 'Hello'
    yield ' world'
  }

  return {
    streamChatAnswer: vi.fn(async () => gen()),
  }
})

import { app } from '../app.js'

function parseSse(body: string): Array<{ event: string; data: string }> {
  const blocks = body
    .split(/\n\n/)
    .map((b) => b.trim())
    .filter(Boolean)

  return blocks.map((block) => {
    let event = 'message'
    const dataLines: string[] = []

    for (const line of block.split(/\n/)) {
      if (line.startsWith('event:')) {
        event = line.slice('event:'.length).trim()
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).trim())
      }
    }

    return { event, data: dataLines.join('\n') }
  })
}

function seedSearchableItem(db: Database.Database, userId: string): void {
  db.prepare(
    `
      INSERT INTO items (id, user_id, url, url_normalized, domain, title, status, clean_text, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    'item_test',
    userId,
    'https://example.com/react',
    'https://example.com/react',
    'example.com',
    'React Tutorial',
    'completed',
    'React hooks are powerful',
    '2024-01-20T10:00:00Z',
    '2024-01-20T10:00:00Z'
  )
  db.exec(`
    INSERT INTO items_fts (item_id, title, summary, tags, clean_text)
    VALUES ('item_test', 'React Tutorial', '', '', 'React hooks are powerful')
  `)
}

describe('chat routes', () => {
  let db: Database.Database
  let cookie: string
  let userId: string

  beforeEach(async () => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())
    setDb(db)

    const auth = await registerTestUser(app)
    cookie = auth.cookie
    userId = auth.user.id
  })

  afterEach(() => {
    closeDb()
  })

  it('creates session and lists it', async () => {
    const create = await app.request('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({}),
    })

    expect(create.status).toBe(201)
    const created = await create.json()
    expect(created.id).toMatch(/^chat_/) // generateId('chat')

    const list = await app.request('/api/chat/sessions', { headers: { Cookie: cookie } })
    expect(list.status).toBe(200)
    const listBody = await list.json()
    expect(listBody.sessions.length).toBe(1)
    expect(listBody.sessions[0].id).toBe(created.id)
  })

  it('streams assistant response and persists messages', async () => {
    // Insert a searchable item + fts row so sources is non-empty.
    seedSearchableItem(db, userId)

    const create = await app.request('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({}),
    })
    const session = await create.json()

    const res = await app.request(`/api/chat/sessions/${session.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ message: 'react hooks' }),
    })

    expect(res.status).toBe(200)
    const text = await res.text()
    const events = parseSse(text)

    expect(events[0]?.event).toBe('meta')
    const meta = JSON.parse(events[0]!.data) as any
    expect(meta.user_message_id).toMatch(/^msg_/)
    expect(meta.assistant_message_id).toMatch(/^msg_/)
    expect(Array.isArray(meta.sources)).toBe(true)
    expect(meta.sources.length).toBeGreaterThan(0)

    const deltaText = events
      .filter((e) => e.event === 'delta')
      .map((e) => JSON.parse(e.data).delta)
      .join('')
    expect(deltaText).toBe('Hello world')

    expect(events.some((e) => e.event === 'done')).toBe(true)

    const messagesRes = await app.request(`/api/chat/sessions/${session.id}/messages`, { headers: { Cookie: cookie } })
    expect(messagesRes.status).toBe(200)
    const messagesBody = await messagesRes.json()
    expect(messagesBody.messages.length).toBe(2)
    expect(messagesBody.messages[0].role).toBe('user')
    expect(messagesBody.messages[1].role).toBe('assistant')
    expect(messagesBody.messages[1].content).toBe('Hello world')
  })

  it('prepares local chat and persists assistant message', async () => {
    seedSearchableItem(db, userId)

    const create = await app.request('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({}),
    })
    const session = await create.json()

    const prepare = await app.request(`/api/chat/sessions/${session.id}/messages/local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ message: 'react hooks' }),
    })

    expect(prepare.status).toBe(200)
    const prepareBody = await prepare.json()
    expect(prepareBody.meta.session_id).toBe(session.id)
    expect(prepareBody.meta.user_message_id).toMatch(/^msg_/)
    expect(prepareBody.meta.assistant_message_id).toMatch(/^msg_/)
    expect(Array.isArray(prepareBody.meta.sources)).toBe(true)
    expect(prepareBody.meta.sources.length).toBeGreaterThan(0)
    expect(Array.isArray(prepareBody.history)).toBe(true)
    expect(prepareBody.history.length).toBe(0)

    const persist = await app.request(`/api/chat/sessions/${session.id}/messages/local/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        assistant_message_id: prepareBody.meta.assistant_message_id,
        content: 'Local answer',
        meta_json: JSON.stringify({ sources: prepareBody.meta.sources }),
      }),
    })

    expect(persist.status).toBe(200)
    const persistBody = await persist.json()
    expect(persistBody.ok).toBe(true)

    const messagesRes = await app.request(`/api/chat/sessions/${session.id}/messages`, { headers: { Cookie: cookie } })
    expect(messagesRes.status).toBe(200)
    const messagesBody = await messagesRes.json()
    expect(messagesBody.messages.length).toBe(2)
    expect(messagesBody.messages[0].role).toBe('user')
    expect(messagesBody.messages[1].role).toBe('assistant')
    expect(messagesBody.messages[1].content).toBe('Local answer')
  })
})
