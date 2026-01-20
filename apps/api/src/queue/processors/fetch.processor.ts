import type { Database } from 'better-sqlite3'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import type { Job } from '../../features/jobs/jobs.db.js'
import { updateItemContent } from '../../features/jobs/jobs.db.js'
import { getItemById } from '../../features/items/items.db.js'
import { generateId } from '../../lib/utils.js'

/**
 * Process fetch job - download webpage and extract content
 */
export async function processFetchJob(db: Database, job: Job): Promise<void> {
  const item = getItemById(db, job.item_id)

  if (!item) {
    throw new Error(`Item not found: ${job.item_id}`)
  }

  console.log(`[fetch] Processing ${item.url}`)

  const response = await fetch(item.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; RecallBot/1.0)',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const html = await response.text()

  const dom = new JSDOM(html, { url: item.url })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()

  if (!article) {
    throw new Error('Failed to extract article content')
  }

  updateItemContent(db, item.id, {
    title: article.title || (item.title ?? undefined),
    clean_text: article.textContent ?? undefined,
    status: 'completed',
  })

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
}
