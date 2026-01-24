import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { streamSSE } from 'hono/streaming'
import {
  chatRequestSchema,
  createChatSessionSchema,
  listChatMessagesQuerySchema,
  listChatSessionsQuerySchema,
} from './chat.schema.js'
import { getDb } from '../../db/context.js'
import { generateId } from '../../lib/utils.js'
import {
  createChatSession,
  getChatSessionById,
  insertChatMessage,
  listChatMessages,
  listChatSessions,
  setChatSessionTitle,
  touchChatSession,
} from './chat.db.js'
import { retrieveChatSources } from './chat.retrieval.js'
import { streamChatAnswer } from './chat.llm.js'

export const chatApp = new Hono()

const DEBUG_CHAT = process.env.DEBUG_CHAT === '1'

function defaultUserId(): string | null {
  // Single-user prototype. Multi-user TODO: derive from auth context.
  return null
}

function deriveTitleFromMessage(message: string): string {
  const trimmed = message.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= 20) return trimmed
  return `${trimmed.slice(0, 20)}...`
}

chatApp.post('/sessions', zValidator('json', createChatSessionSchema), (c) => {
  const db = getDb()
  const body = c.req.valid('json')

  const now = new Date().toISOString()
  const sessionId = generateId('chat')

  const session = createChatSession(db, {
    id: sessionId,
    title: body.title,
    user_id: defaultUserId(),
    now,
  })

  return c.json(session, 201)
})

chatApp.get('/sessions', zValidator('query', listChatSessionsQuerySchema), (c) => {
  const db = getDb()
  const q = c.req.valid('query')
  const limit = q.limit ?? 50
  const offset = q.offset ?? 0

  const result = listChatSessions(db, { limit, offset, user_id: defaultUserId() })

  return c.json({
    sessions: result.sessions,
    total: result.total,
    limit,
    offset,
  })
})

chatApp.get('/sessions/:id/messages', zValidator('query', listChatMessagesQuerySchema), (c) => {
  const db = getDb()
  const sessionId = c.req.param('id')

  const session = getChatSessionById(db, sessionId)
  if (!session) {
    return c.json({ error: 'NOT_FOUND', message: 'Session not found' }, 404)
  }

  const q = c.req.valid('query')
  const messages = listChatMessages(db, sessionId, { limit: q.limit ?? 50, before: q.before })
  return c.json({ messages })
})

chatApp.post('/sessions/:id/messages', zValidator('json', chatRequestSchema), (c) => {
  const db = getDb()
  const sessionId = c.req.param('id')
  const session = getChatSessionById(db, sessionId)
  if (!session) {
    return c.json({ error: 'NOT_FOUND', message: 'Session not found' }, 404)
  }

  const body = c.req.valid('json')
  const now = new Date().toISOString()
  const userId = defaultUserId()

  // Persist user message immediately.
  const userMessageId = generateId('msg')
  insertChatMessage(db, {
    id: userMessageId,
    session_id: sessionId,
    role: 'user',
    content: body.message,
    user_id: userId,
    now,
  })

  // Best-effort title for new sessions.
  if (!session.title) {
    const title = deriveTitleFromMessage(body.message)
    setChatSessionTitle(db, sessionId, title, now)
  } else {
    touchChatSession(db, sessionId, now)
  }

  const sources = retrieveChatSources(db, body.message)
  const assistantMessageId = generateId('msg')

  if (DEBUG_CHAT) {
    console.log('[chat] session:', sessionId, 'sources:', sources.length)
    if (sources.length === 0) {
      try {
        const itemsCount = (db.prepare(`SELECT COUNT(*) as c FROM items`).get() as { c: number } | undefined)?.c ?? 0
        const ftsCount = (db.prepare(`SELECT COUNT(*) as c FROM items_fts`).get() as { c: number } | undefined)?.c ?? 0
        console.log('[chat] db counts items:', itemsCount, 'items_fts:', ftsCount)
      } catch (err) {
        console.warn('[chat] failed to read db counts:', err)
      }
    }
  }

  // Stream assistant response via SSE.
  return streamSSE(c, async (stream) => {
    const meta = {
      session_id: sessionId,
      user_message_id: userMessageId,
      assistant_message_id: assistantMessageId,
      sources,
    }

    if (DEBUG_CHAT) {
      console.log('[chat] meta sources:', sources.length)
    }

    await stream.writeSSE({ event: 'meta', data: JSON.stringify(meta) })

    const abortController = new AbortController()
    const onAbort = () => abortController.abort()
    c.req.raw.signal.addEventListener('abort', onAbort, { once: true })

    let assistantText = ''
    let aborted = false

    try {
      const history = listChatMessages(db, sessionId, { limit: 20 })
        .filter((m) => m.id !== userMessageId)
        .map((m) => ({ role: m.role, content: m.content }))

      const textStream = await streamChatAnswer({
        question: body.message,
        history,
        sources,
        signal: abortController.signal,
      })

      for await (const delta of textStream) {
        assistantText += delta
        try {
          await stream.writeSSE({ event: 'delta', data: JSON.stringify({ delta }) })
        } catch {
          aborted = true
          break
        }
      }

      if (abortController.signal.aborted) {
        aborted = true
      }

      if (!aborted) {
        await stream.writeSSE({ event: 'done', data: JSON.stringify({ assistant_message_id: assistantMessageId }) })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      try {
        await stream.writeSSE({ event: 'error', data: JSON.stringify({ error: 'AI_ERROR', message }) })
      } catch {
        aborted = true
      }
    } finally {
      c.req.raw.signal.removeEventListener('abort', onAbort)

      const timestamp = new Date().toISOString()

      // Avoid persisting empty assistant messages (e.g. LLM error before any delta).
      if (assistantText.length > 0) {
        const metaJson = JSON.stringify({ sources, aborted })
        insertChatMessage(db, {
          id: assistantMessageId,
          session_id: sessionId,
          role: 'assistant',
          content: assistantText,
          meta_json: metaJson,
          user_id: userId,
          now: timestamp,
        })
      }

      // Even if we couldn't persist an assistant message (e.g. early error),
      // reflect the interaction attempt on the session's updated_at.
      touchChatSession(db, sessionId, timestamp)
    }
  })
})
