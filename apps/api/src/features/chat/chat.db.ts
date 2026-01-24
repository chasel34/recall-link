import type { Database } from 'better-sqlite3'

export type ChatSession = {
  id: string
  user_id: string | null
  title: string | null
  created_at: string
  updated_at: string
}

export type ChatMessageRole = 'user' | 'assistant' | 'system'

export type ChatMessage = {
  id: string
  session_id: string
  user_id: string | null
  role: ChatMessageRole
  content: string
  meta_json: string | null
  created_at: string
}

export function createChatSession(
  db: Database,
  data: { id: string; title?: string; user_id?: string | null; now: string }
): ChatSession {
  const title = data.title ?? null
  const userId = data.user_id ?? null

  db.prepare(
    `
      INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `
  ).run(data.id, userId, title, data.now, data.now)

  return {
    id: data.id,
    user_id: userId,
    title,
    created_at: data.now,
    updated_at: data.now,
  }
}

export function getChatSessionById(db: Database, id: string): ChatSession | null {
  const row = db.prepare('SELECT * FROM chat_sessions WHERE id = ?').get(id) as ChatSession | undefined
  return row ?? null
}

export function listChatSessions(
  db: Database,
  filters: { limit?: number; offset?: number; user_id?: string | null } = {}
): { sessions: ChatSession[]; total: number } {
  const limit = filters.limit ?? 50
  const offset = filters.offset ?? 0

  const conditions: string[] = []
  const params: Array<string | number | null> = []

  if (filters.user_id !== undefined) {
    conditions.push('user_id IS ?')
    params.push(filters.user_id)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const { count } = db
    .prepare(`SELECT COUNT(*) as count FROM chat_sessions ${whereClause}`)
    .get(...params) as { count: number }

  const sessions = db
    .prepare(
      `
        SELECT *
        FROM chat_sessions
        ${whereClause}
        ORDER BY updated_at DESC
        LIMIT ? OFFSET ?
      `
    )
    .all(...params, limit, offset) as ChatSession[]

  return { sessions, total: count }
}

export function touchChatSession(db: Database, sessionId: string, now: string): void {
  db.prepare('UPDATE chat_sessions SET updated_at = ? WHERE id = ?').run(now, sessionId)
}

export function setChatSessionTitle(db: Database, sessionId: string, title: string, now: string): void {
  db.prepare('UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?').run(title, now, sessionId)
}

export function insertChatMessage(
  db: Database,
  data: {
    id: string
    session_id: string
    role: ChatMessageRole
    content: string
    meta_json?: string | null
    user_id?: string | null
    now: string
  }
): ChatMessage {
  const metaJson = data.meta_json ?? null
  const userId = data.user_id ?? null

  db.prepare(
    `
      INSERT INTO chat_messages (id, session_id, user_id, role, content, meta_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
  ).run(data.id, data.session_id, userId, data.role, data.content, metaJson, data.now)

  return {
    id: data.id,
    session_id: data.session_id,
    user_id: userId,
    role: data.role,
    content: data.content,
    meta_json: metaJson,
    created_at: data.now,
  }
}

export function listChatMessages(
  db: Database,
  sessionId: string,
  opts: { limit?: number; before?: string } = {}
): ChatMessage[] {
  const limit = opts.limit ?? 50
  const before = opts.before

  const conditions: string[] = ['session_id = ?']
  const params: Array<string | number> = [sessionId]

  if (before) {
    conditions.push('created_at < ?')
    params.push(before)
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`

  const rows = db
    .prepare(
      `
        SELECT *
        FROM chat_messages
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ?
      `
    )
    .all(...params, limit) as ChatMessage[]

  // Return chronological order.
  return rows.reverse()
}
