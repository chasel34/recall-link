import type { Database } from 'better-sqlite3'
import type { ChatSource } from '@recall-link/ai'
import { embedDocuments, embedQuery } from '@recall-link/ai'
import { getUserModelConfig } from '../settings/ai-settings.db.js'
import { resolveEmbeddingConfig } from '../../config/ai.resolver.js'
import {
  buildEmbeddingSource,
  cosineSimilarity,
  EMBEDDING_PROVIDER,
  hashEmbeddingSource,
  listItemEmbeddings,
  listRetrievalCandidatesByFts,
  listRetrievalCandidates,
  parseEmbeddingVector,
  type RetrievalCandidateRow,
  upsertItemEmbedding,
} from './chat.embeddings.js'

const DEBUG_CHAT = process.env.DEBUG_CHAT === '1'
const DEFAULT_CANDIDATE_LIMIT = 300
const DEFAULT_LAZY_EMBED_LIMIT = 20

function buildFtsQuery(raw: string): string | null {
  const normalized = raw.trim()
  if (!normalized) return null

  const tokens = normalized.match(/[\p{L}\p{N}_]+/gu)?.filter(Boolean) ?? []
  if (tokens.length === 0) {
    return `"${normalized.replace(/"/g, '""')}"`
  }

  return tokens.map((token) => `${token.replace(/"/g, '""')}*`).join(' OR ')
}

function mergeCandidates(
  primary: RetrievalCandidateRow[],
  secondary: RetrievalCandidateRow[],
  limit: number
): RetrievalCandidateRow[] {
  const seen = new Set<string>()
  const merged: RetrievalCandidateRow[] = []

  for (const row of [...primary, ...secondary]) {
    if (seen.has(row.item_id)) continue
    seen.add(row.item_id)
    merged.push(row)
    if (merged.length >= limit) break
  }

  return merged
}

type RetrievalDependencies = {
  resolveEmbeddingConfig: typeof resolveEmbeddingConfig
  embedQuery: typeof embedQuery
  embedDocuments: typeof embedDocuments
}

const DEFAULT_DEPS: RetrievalDependencies = {
  resolveEmbeddingConfig,
  embedQuery,
  embedDocuments,
}

export async function retrieveChatSources(
  db: Database,
  userId: string,
  userQuery: string,
  opts: {
    limit?: number
    snippetChars?: number
    candidateLimit?: number
    lazyEmbedLimit?: number
    deps?: Partial<RetrievalDependencies>
  } = {}
): Promise<ChatSource[]> {
  const query = userQuery.trim()
  if (!query) return []

  const limit = opts.limit ?? 8
  const snippetChars = opts.snippetChars ?? 700
  const candidateLimit = opts.candidateLimit ?? DEFAULT_CANDIDATE_LIMIT
  const lazyEmbedLimit = opts.lazyEmbedLimit ?? DEFAULT_LAZY_EMBED_LIMIT
  const deps: RetrievalDependencies = {
    ...DEFAULT_DEPS,
    ...opts.deps,
  }
  const mergedCandidateLimit = Math.max(limit, candidateLimit * 2)

  const mode = getUserModelConfig(db, userId)?.mode ?? 'server'
  const embeddingConfig = deps.resolveEmbeddingConfig(db, userId, mode)
  const queryEmbedding = await deps.embedQuery(query, embeddingConfig)

  const ftsQuery = buildFtsQuery(query)
  let ftsCandidates: RetrievalCandidateRow[] = []
  if (ftsQuery) {
    try {
      ftsCandidates = listRetrievalCandidatesByFts(db, userId, ftsQuery, candidateLimit)
    } catch (error) {
      // FTS query parsing may fail on malformed search expressions; fallback to recency-only candidates.
      console.warn('[chat][retrieval] FTS candidate search failed, fallback to recency candidates.', error)
    }
  }

  const recentCandidates = listRetrievalCandidates(db, userId, candidateLimit)
  const candidates = mergeCandidates(ftsCandidates, recentCandidates, mergedCandidateLimit)
  if (candidates.length === 0) return []

  const itemIds = candidates.map((row) => row.item_id)
  const existingEmbeddings = listItemEmbeddings(db, userId, itemIds)

  const staleCandidates = candidates
    .map((candidate) => {
      const sourceText = buildEmbeddingSource(candidate)
      const sourceTextHash = hashEmbeddingSource(sourceText)
      const embeddingRow = existingEmbeddings.get(candidate.item_id)
      const isFresh = Boolean(
        embeddingRow &&
          embeddingRow.provider === EMBEDDING_PROVIDER &&
          embeddingRow.model === embeddingConfig.model &&
          embeddingRow.source_text_hash === sourceTextHash
      )
      return {
        candidate,
        sourceText,
        sourceTextHash,
        embeddingRow,
        isFresh,
      }
    })
    .filter((entry) => !entry.isFresh)
    .slice(0, lazyEmbedLimit)

  if (staleCandidates.length > 0) {
    const values = staleCandidates.map((entry) => entry.sourceText)
    try {
      const vectors = await deps.embedDocuments(values, embeddingConfig)
      const now = new Date().toISOString()

      db.transaction(() => {
        staleCandidates.forEach((entry, index) => {
          const vector = vectors[index]
          if (!vector || vector.length === 0) return
          upsertItemEmbedding(db, {
            itemId: entry.candidate.item_id,
            userId,
            model: embeddingConfig.model,
            vector,
            sourceTextHash: entry.sourceTextHash,
            now,
          })
        })
      })()
    } catch (error) {
      console.warn(
        '[chat][retrieval] Failed to embed stale candidates, proceeding with existing embeddings only.',
        error
      )
    }
  }

  const latestEmbeddings = listItemEmbeddings(db, userId, itemIds)
  const ranked = candidates
    .map((candidate) => {
      const row = latestEmbeddings.get(candidate.item_id)
      if (!row) return null
      const vector = parseEmbeddingVector(row.vector_json)
      if (!vector) return null
      const score = cosineSimilarity(queryEmbedding, vector)
      return { candidate, score }
    })
    .filter((entry): entry is { candidate: (typeof candidates)[number]; score: number } => entry !== null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return b.candidate.updated_at.localeCompare(a.candidate.updated_at)
    })
    .slice(0, limit)

  if (DEBUG_CHAT) {
    console.log(
      '[chat][retrieval] query:',
      query.slice(0, 200),
      'fts:',
      ftsCandidates.length,
      'recent:',
      recentCandidates.length,
      'candidates:',
      candidates.length,
      'ranked:',
      ranked.length
    )
  }

  return ranked.map(({ candidate }) => {
    const text = candidate.clean_text.trim()
    const snippet = text.length > snippetChars ? `${text.slice(0, snippetChars)}...` : text
    return {
      item_id: candidate.item_id,
      url: candidate.url,
      title: candidate.title,
      snippet,
    }
  })
}
