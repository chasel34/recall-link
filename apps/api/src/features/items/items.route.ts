import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createItemSchema, patchItemSchema } from './items.schema.js'
import { generateId, normalizeUrl, extractDomain } from '../../lib/utils.js'
import { findItemByNormalizedUrl, createItemWithJob } from './items.db.js'
import { openDb, defaultSchemaPath, applySchema } from '../../db/client.js'
import path from 'node:path'

export const itemsApp = new Hono()

const dbPath = path.join(process.cwd(), 'data', 'recall.db')
const db = openDb(dbPath)
applySchema(db, defaultSchemaPath())

itemsApp.post('/', zValidator('json', createItemSchema), (c) => {
  try {
    const { url } = c.req.valid('json')

    const urlNormalized = normalizeUrl(url)
    const domain = extractDomain(url)

    const existing = findItemByNormalizedUrl(db, urlNormalized)
    if (existing) {
      return c.json({
        error: 'DUPLICATE_URL',
        message: 'This URL has already been saved',
        existing_item_id: existing.id,
      }, 409)
    }

    const itemId = generateId('item')
    const jobId = generateId('job')
    const timestamp = new Date().toISOString()

    createItemWithJob(db, {
      itemId,
      jobId,
      url,
      urlNormalized,
      domain,
      timestamp,
    })

    return c.json({
      id: itemId,
      url,
      domain,
      status: 'pending',
      created_at: timestamp,
    }, 201)
  } catch (error) {
    console.error('[POST /items] Error:', error)
    return c.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create item',
    }, 500)
  }
})

itemsApp.get('/', (c) => c.json({ items: [] }))
itemsApp.get('/:id', (c) => c.json({ error: 'NOT_IMPLEMENTED' }, 501))
itemsApp.patch('/:id', zValidator('json', patchItemSchema), (c) => c.json({ error: 'NOT_IMPLEMENTED' }, 501))
itemsApp.delete('/:id', (c) => c.json({ error: 'NOT_IMPLEMENTED' }, 501))
itemsApp.post('/:id/retry', (c) => c.json({ error: 'NOT_IMPLEMENTED' }, 501))
