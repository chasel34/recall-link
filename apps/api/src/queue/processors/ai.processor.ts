import type { Database } from 'better-sqlite3'
import type { Job } from '../../features/jobs/jobs.db.js'
import { getItemById } from '../../features/items/items.db.js'
import { generateTagsAndSummary, mergeTagsWithExisting } from '../../services/ai.service.js'
import { getAllTagNames, setItemTags } from '../../features/tags/tags.db.js'

export async function processAIJob(db: Database, job: Job): Promise<void> {
  const item = getItemById(db, job.item_id)

  if (!item) {
    throw new Error(`Item not found: ${job.item_id}`)
  }

  if (!item.clean_text) {
    throw new Error('Item has no content to analyze')
  }

  console.log(`[ai] Processing ${item.url}`)

  const { tags: newTags, summary } = await generateTagsAndSummary(item.clean_text)
  const existingTags = getAllTagNames(db)
  const mergedTags = await mergeTagsWithExisting(newTags, existingTags)

  db.transaction(() => {
    const now = new Date().toISOString()
    db.prepare(
      `
        UPDATE items
        SET summary = ?, summary_source = 'ai', updated_at = ?
        WHERE id = ?
      `
    ).run(summary, now, item.id)

    setItemTags(db, item.id, mergedTags)
  })()

  console.log(`[ai] Completed ${item.url} - Tags: ${mergedTags.join(', ')}`)
}

export function shouldRetryAIError(error: any): boolean {
  if (error.status === 429) return true

  if (error.status >= 500) return true

  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') return true

  if (error.status === 401 || error.status === 403) return false

  if (error.status >= 400 && error.status < 500) return false

  return false
}
