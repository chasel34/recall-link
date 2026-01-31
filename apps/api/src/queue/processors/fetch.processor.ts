import type { Database } from 'better-sqlite3'
import type { Job } from '@recall-link/jobs'
import { handleFetch } from '@recall-link/jobs-handlers'
import { updateItemContent } from '../../features/jobs/jobs.db.js'
import { getItemById } from '../../features/items/items.db.js'
import { generateId } from '../../lib/utils.js'
import { publishItemUpdated } from '../../features/events/events.bus.js'
import { replaceItemFts } from '../../features/items/items.fts.js'

/**
 * Process fetch job - download webpage and extract content
 */
export async function processFetchJob(db: Database, job: Job): Promise<void> {
  const item = getItemById(db, job.item_id)

  if (!item) {
    throw new Error(`Item not found: ${job.item_id}`)
  }

  console.log(`[fetch] Processing ${item.url}`)

  const { title, clean_text, clean_html } = await handleFetch({ url: item.url })

  updateItemContent(db, item.id, {
    title: title || (item.title ?? undefined),
    clean_text,
    clean_html,
    status: 'completed',
  })

  replaceItemFts(db, item.id)

  console.log(`[fetch] Completed ${item.url}`)

  const aiJobId = generateId('job')
  const now = new Date().toISOString()

  db.prepare(
    `
      INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at)
      VALUES (?, ?, 'ai_process', 'pending', 0, ?, ?, ?)
    `
  ).run(aiJobId, item.id, now, now, now)

  console.log(`[fetch] Created ai_process job ${aiJobId} for item ${item.id}`)

  publishItemUpdated(db, item.id, 'fetch')
}
