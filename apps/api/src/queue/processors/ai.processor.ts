import type { Database } from 'better-sqlite3'
import type { Job } from '@recall-link/jobs'
import { getItemById } from '../../features/items/items.db.js'
import { setJobProgress } from '../../features/jobs/jobs.progress.db.js'
import { handleAiProcess } from '@recall-link/jobs-handlers'
import { getAllTagNames, setItemTags } from '../../features/tags/tags.db.js'
import { publishItemUpdated } from '../../features/events/events.bus.js'
import { replaceItemFts } from '../../features/items/items.fts.js'
import { resolveAIConfig } from '../../config/ai.resolver.js'
import { generateId } from '../../lib/utils.js'
import { setBookmarkImportEntryStatusByItemId } from '../../features/imports/imports.db.js'

export async function processAIJob(db: Database, job: Job): Promise<void> {
  const item = getItemById(db, job.item_id)

  if (!item) {
    throw new Error(`Item not found: ${job.item_id}`)
  }

  if (!item.clean_text) {
    throw new Error('Item has no content to analyze')
  }

  if (!item.user_id) {
    throw new Error('Item is missing user_id')
  }

  const userId = item.user_id

  console.log(`[ai] Processing ${item.url}`)
  try {
    setBookmarkImportEntryStatusByItemId(db, item.id, 'ai_processing')
    setJobProgress(db, job.id, { stage: 'ai:generating', percent: 10 })

    const mode = item.ai_mode === 'user' ? 'user' : 'server'
    const config = resolveAIConfig(db, userId, mode)
    const existingTags = getAllTagNames(db, userId)
    const { summary, tags: mergedTags } = await handleAiProcess({
      cleanText: item.clean_text,
      existingTags,
      config,
    })

    setJobProgress(db, job.id, { stage: 'ai:writing', percent: 85 })

    db.transaction(() => {
      const now = new Date().toISOString()
      db.prepare(
        `
        UPDATE items
        SET summary = ?, summary_source = 'ai', updated_at = ?
        WHERE id = ?
      `
      ).run(summary, now, item.id)

      setItemTags(db, userId, item.id, mergedTags)

      replaceItemFts(db, item.id)
    })()

    setJobProgress(db, job.id, { stage: 'ai:done', percent: 100 })

    const importEntry = db
      .prepare('SELECT id FROM bookmark_import_entries WHERE item_id = ?')
      .get(item.id) as { id: string } | undefined

    if (importEntry) {
      const embedJobId = generateId('job')
      const now = new Date().toISOString()
      db.prepare(
        `
          INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at)
          VALUES (?, ?, 'embed_process', 'pending', 0, ?, ?, ?)
        `
      ).run(embedJobId, item.id, now, now, now)
      setBookmarkImportEntryStatusByItemId(db, item.id, 'embedding', now)
      console.log(`[ai] Created embed_process job ${embedJobId} for item ${item.id}`)
    }

    console.log(`[ai] Completed ${item.url} - Tags: ${mergedTags.join(', ')}`)

    publishItemUpdated(db, item.id, 'ai')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    setJobProgress(db, job.id, {
      stage: 'ai:error',
      message: `Retrying: ${errorMessage.slice(0, 160)}`,
    })
    throw error
  }
}

export function shouldRetryAIError(error: any): boolean {
  if (error.status === 429) return true

  if (error.status >= 500) return true

  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') return true

  if (error.status === 401 || error.status === 403) return false

  if (error.status >= 400 && error.status < 500) return false

  return false
}
