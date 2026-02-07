import crypto from 'node:crypto'
import type { Database } from 'better-sqlite3'

export const EMBEDDING_PROVIDER = 'ark'
const EMBEDDING_SOURCE_MAX_CHARS = 12000

export type RetrievalCandidateRow = {
  item_id: string
  url: string
  title: string | null
  summary: string | null
  tags: string
  clean_text: string
  updated_at: string
}

export type ItemEmbeddingRow = {
  item_id: string
  provider: string
  model: string
  vector_json: string
  source_text_hash: string
  updated_at: string
}

export function listRetrievalCandidates(
  db: Database,
  userId: string,
  limit: number
): RetrievalCandidateRow[] {
  return db
    .prepare(
      `
        SELECT
          i.id AS item_id,
          i.url AS url,
          i.title AS title,
          i.summary AS summary,
          COALESCE((
            SELECT GROUP_CONCAT(t.name, ' ')
            FROM item_tags it
            JOIN tags t ON t.id = it.tag_id
            WHERE it.item_id = i.id
          ), '') AS tags,
          i.clean_text AS clean_text,
          i.updated_at AS updated_at
        FROM items i
        WHERE i.user_id = ?
          AND i.clean_text IS NOT NULL
          AND LENGTH(TRIM(i.clean_text)) > 0
        ORDER BY i.updated_at DESC
        LIMIT ?
      `
    )
    .all(userId, limit) as RetrievalCandidateRow[]
}

export function listRetrievalCandidatesByFts(
  db: Database,
  userId: string,
  ftsQuery: string,
  limit: number
): RetrievalCandidateRow[] {
  return db
    .prepare(
      `
        SELECT
          i.id AS item_id,
          i.url AS url,
          i.title AS title,
          i.summary AS summary,
          COALESCE((
            SELECT GROUP_CONCAT(t.name, ' ')
            FROM item_tags it
            JOIN tags t ON t.id = it.tag_id
            WHERE it.item_id = i.id
          ), '') AS tags,
          i.clean_text AS clean_text,
          i.updated_at AS updated_at
        FROM items_fts
        JOIN items i ON i.id = items_fts.item_id
        WHERE i.user_id = ?
          AND i.clean_text IS NOT NULL
          AND LENGTH(TRIM(i.clean_text)) > 0
          AND items_fts MATCH ?
        ORDER BY bm25(items_fts), i.updated_at DESC
        LIMIT ?
      `
    )
    .all(userId, ftsQuery, limit) as RetrievalCandidateRow[]
}

export function listItemEmbeddings(
  db: Database,
  userId: string,
  itemIds: string[]
): Map<string, ItemEmbeddingRow> {
  if (itemIds.length === 0) return new Map()

  const placeholders = itemIds.map(() => '?').join(',')
  const rows = db
    .prepare(
      `
        SELECT item_id, provider, model, vector_json, source_text_hash, updated_at
        FROM item_embeddings
        WHERE user_id = ?
          AND item_id IN (${placeholders})
      `
    )
    .all(userId, ...itemIds) as ItemEmbeddingRow[]

  return new Map(rows.map((row) => [row.item_id, row]))
}

export function upsertItemEmbedding(
  db: Database,
  input: {
    itemId: string
    userId: string
    model: string
    vector: number[]
    sourceTextHash: string
    now: string
  }
): void {
  db.prepare(
    `
      INSERT INTO item_embeddings (
        item_id,
        user_id,
        provider,
        model,
        dimensions,
        vector_json,
        source_text_hash,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(item_id) DO UPDATE SET
        user_id = excluded.user_id,
        provider = excluded.provider,
        model = excluded.model,
        dimensions = excluded.dimensions,
        vector_json = excluded.vector_json,
        source_text_hash = excluded.source_text_hash,
        updated_at = excluded.updated_at
    `
  ).run(
    input.itemId,
    input.userId,
    EMBEDDING_PROVIDER,
    input.model,
    input.vector.length,
    JSON.stringify(input.vector),
    input.sourceTextHash,
    input.now,
    input.now
  )
}

export function buildEmbeddingSource(row: RetrievalCandidateRow): string {
  const content = [row.title ?? '', row.summary ?? '', row.tags, row.clean_text]
    .map((v) => v.trim())
    .filter(Boolean)
    .join('\n\n')

  return content.length > EMBEDDING_SOURCE_MAX_CHARS
    ? content.slice(0, EMBEDDING_SOURCE_MAX_CHARS)
    : content
}

export function hashEmbeddingSource(source: string): string {
  return crypto.createHash('sha256').update(source).digest('hex')
}

export function parseEmbeddingVector(raw: string): number[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    if (!parsed.every((value) => typeof value === 'number' && Number.isFinite(value))) return null
    return parsed
  } catch {
    return null
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0
  if (a.length !== b.length) return 0

  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? 0
    const bv = b[i] ?? 0
    dot += av * bv
    normA += av * av
    normB += bv * bv
  }

  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
