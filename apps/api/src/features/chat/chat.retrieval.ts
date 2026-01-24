import type { Database } from 'better-sqlite3'

export type ChatSource = {
  item_id: string
  url: string
  title: string | null
  snippet: string
}

const DEBUG_CHAT = process.env.DEBUG_CHAT === '1'

function toFtsQuery(userQuery: string): string {
  const tokens = userQuery
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/["'`]/g, ''))
    // FTS MATCH has special syntax; strip most punctuation to avoid syntax errors,
    // but keep common tech symbols like C++ / C#.
    .map((t) => t.replace(/[^\p{L}\p{N}+#]+/gu, ''))
    .filter(Boolean)

  const limited = tokens.slice(0, 12)

  // Basic prefix matching for a more forgiving UX.
  return limited.map((t) => `${t}*`).join(' ')
}

export function retrieveChatSources(
  db: Database,
  userQuery: string,
  opts: { limit?: number; snippetChars?: number } = {}
): ChatSource[] {
  const limit = opts.limit ?? 8
  const snippetChars = opts.snippetChars ?? 700

  const ftsQuery = toFtsQuery(userQuery)
  if (!ftsQuery) return []

  if (DEBUG_CHAT) {
    console.log('[chat][retrieval] query:', userQuery.slice(0, 200))
    console.log('[chat][retrieval] ftsQuery:', ftsQuery)
  }

  try {
    const rows = db
      .prepare(
        `
          SELECT i.id as item_id, i.url, i.title, i.clean_text
          FROM items i
          JOIN items_fts fts ON i.id = fts.item_id
          WHERE items_fts MATCH ?
          ORDER BY rank
          LIMIT ?
        `
      )
      .all(ftsQuery, limit) as Array<{
      item_id: string
      url: string
      title: string | null
      clean_text: string | null
    }>

    return rows.map((r) => {
      const text = (r.clean_text ?? '').trim()
      const snippet = text.length > snippetChars ? `${text.slice(0, snippetChars)}...` : text
      return {
        item_id: r.item_id,
        url: r.url,
        title: r.title,
        snippet,
      }
    })
  } catch (err) {
    // Invalid MATCH query syntax, or FTS not available.
    if (DEBUG_CHAT) {
      console.warn('[chat][retrieval] failed:', err)
    }
    return []
  }
}
