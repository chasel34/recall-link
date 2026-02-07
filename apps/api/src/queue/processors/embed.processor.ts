import type { Database } from 'better-sqlite3'
import type { Job } from '@recall-link/jobs'
import { embedDocuments, EmbeddingProviderError } from '@recall-link/ai'
import { resolveEmbeddingConfig, isUserEmbeddingConfigMissingError } from '../../config/ai.resolver.js'
import { setJobProgress } from '../../features/jobs/jobs.progress.db.js'
import { getItemById } from '../../features/items/items.db.js'
import {
  buildEmbeddingSource,
  hashEmbeddingSource,
  upsertItemEmbedding,
} from '../../features/chat/chat.embeddings.js'
import { completeBookmarkImportEntryByItemId } from '../../features/imports/imports.db.js'

export async function processEmbedJob(db: Database, job: Job): Promise<void> {
  const item = getItemById(db, job.item_id)
  if (!item) {
    throw new Error(`Item not found: ${job.item_id}`)
  }

  if (!item.clean_text || item.clean_text.trim().length === 0) {
    throw new Error('Item has no content to embed')
  }

  if (!item.user_id) {
    throw new Error('Item is missing user_id')
  }

  const userId = item.user_id
  const mode = item.ai_mode === 'user' ? 'user' : 'server'

  console.log(`[embed] Processing ${item.url}`)

  try {
    setJobProgress(db, job.id, { stage: 'embed:preparing', percent: 10 })

    const embeddingConfig = resolveEmbeddingConfig(db, userId, mode)

    const tags = db
      .prepare(
        `
          SELECT GROUP_CONCAT(t.name, ' ') AS tags
          FROM item_tags it
          JOIN tags t ON t.id = it.tag_id
          WHERE it.item_id = ?
        `
      )
      .get(item.id) as { tags: string | null } | undefined

    const sourceText = buildEmbeddingSource({
      item_id: item.id,
      url: item.url,
      title: item.title,
      summary: item.summary,
      tags: tags?.tags ?? '',
      clean_text: item.clean_text,
      updated_at: item.updated_at,
    })
    const sourceTextHash = hashEmbeddingSource(sourceText)

    setJobProgress(db, job.id, { stage: 'embed:generating', percent: 55 })
    const vectors = await embedDocuments([sourceText], embeddingConfig)
    const vector = vectors[0]

    if (!vector || vector.length === 0) {
      throw new Error('Embedding provider returned empty embedding')
    }

    setJobProgress(db, job.id, { stage: 'embed:saving', percent: 85 })
    const now = new Date().toISOString()
    db.transaction(() => {
      upsertItemEmbedding(db, {
        itemId: item.id,
        userId,
        model: embeddingConfig.model,
        vector,
        sourceTextHash,
        now,
      })
      completeBookmarkImportEntryByItemId(db, item.id, now)
    })()

    setJobProgress(db, job.id, { stage: 'embed:done', percent: 100 })
    console.log(`[embed] Completed ${item.url}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    setJobProgress(db, job.id, {
      stage: 'embed:error',
      message: `Retrying: ${errorMessage.slice(0, 160)}`,
    })
    throw error
  }
}

function parseStatusCodeFromErrorMessage(message: string): number | null {
  const match = message.match(/\((\d{3})\)/)
  if (!match) return null
  return Number(match[1])
}

export function shouldRetryEmbedError(error: unknown): boolean {
  if (isUserEmbeddingConfigMissingError(error)) {
    return false
  }

  if (!(error instanceof Error)) {
    return false
  }

  if (error instanceof EmbeddingProviderError) {
    const status = parseStatusCodeFromErrorMessage(error.message)
    if (status === 429) return true
    if (status !== null && status >= 500) return true
    if (status !== null && status >= 400) return false
  }

  const networkCode = (error as { code?: string }).code
  if (networkCode === 'ETIMEDOUT' || networkCode === 'ECONNRESET') {
    return true
  }

  return false
}
