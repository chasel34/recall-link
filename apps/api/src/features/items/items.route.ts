import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createItemSchema, patchItemSchema, listItemsQuerySchema } from './items.schema.js'
import { generateId, normalizeUrl, extractDomain } from '../../lib/utils.js'
import {
  findItemByNormalizedUrl,
  createItemWithJob,
  listItems,
  listItemsByTags,
  getItemById,
  updateItem,
  deleteItem,
} from './items.db.js'
import { getDb } from '../../db/context.js'
import { getItemTags } from '../tags/tags.db.js'

export const itemsApp = new Hono()

itemsApp.post('/', zValidator('json', createItemSchema), (c) => {
  try {
    const db = getDb()
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

itemsApp.get('/', zValidator('query', listItemsQuerySchema), (c) => {
  try {
    const db = getDb()
    const filters = c.req.valid('query')

    let result
    if (filters.tags) {
      const tagNames = filters.tags.split(',').map((tag) => tag.trim())
      result = listItemsByTags(db, tagNames, filters)
    } else {
      result = listItems(db, filters)
    }

    const itemsWithTags = result.items.map((item) => ({
      ...item,
      tags: getItemTags(db, item.id),
    }))

    return c.json({
      items: itemsWithTags,
      total: result.total,
      limit: filters.limit ?? 20,
      offset: filters.offset ?? 0,
    })
  } catch (error) {
    console.error('[GET /items] Error:', error)
    return c.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to list items',
    }, 500)
  }
})

itemsApp.get('/:id', (c) => {
  try {
    const db = getDb()
    const id = c.req.param('id')

    const item = getItemById(db, id)

    if (!item) {
      return c.json({
        error: 'NOT_FOUND',
        message: 'Item not found',
      }, 404)
    }

    const tags = getItemTags(db, id)

    return c.json({
      ...item,
      tags,
    })
  } catch (error) {
    console.error('[GET /items/:id] Error:', error)
    return c.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get item',
    }, 500)
  }
})

itemsApp.patch('/:id', zValidator('json', patchItemSchema), (c) => {
  try {
    const db = getDb()
    const id = c.req.param('id')
    const updates = c.req.valid('json')

    const existing = getItemById(db, id)
    if (!existing) {
      return c.json({
        error: 'NOT_FOUND',
        message: 'Item not found',
      }, 404)
    }

    const result = updateItem(db, id, updates)

    if (result.changes === 0) {
      return c.json({
        error: 'NO_CHANGES',
        message: 'No fields to update',
      }, 400)
    }

    const updated = getItemById(db, id)
    return c.json(updated)
  } catch (error) {
    console.error('[PATCH /items/:id] Error:', error)
    return c.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to update item',
    }, 500)
  }
})

itemsApp.delete('/:id', (c) => {
  try {
    const db = getDb()
    const id = c.req.param('id')

    const result = deleteItem(db, id)

    if (result.deletedItem === 0) {
      return c.json({
        error: 'NOT_FOUND',
        message: 'Item not found',
      }, 404)
    }

    return c.json({
      message: 'Item deleted',
      deleted_jobs: result.deletedJobs,
    })
  } catch (error) {
    console.error('[DELETE /items/:id] Error:', error)
    return c.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to delete item',
    }, 500)
  }
})

itemsApp.post('/:id/analyze', (c) => {
  try {
    const db = getDb()
    const id = c.req.param('id')

    const item = getItemById(db, id)
    if (!item) {
      return c.json(
        {
          error: 'NOT_FOUND',
          message: 'Item not found',
        },
        404
      )
    }

    if (!item.clean_text) {
      return c.json(
        {
          error: 'NO_CONTENT',
          message: 'Item has no content to analyze. Fetch content first.',
        },
        400
      )
    }

    const jobId = generateId('job')
    const now = new Date().toISOString()

    db.prepare(
      `
        INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at)
        VALUES (?, ?, 'ai_process', 'pending', 0, ?, ?, ?)
      `
    ).run(jobId, id, now, now, now)

    return c.json({ job_id: jobId }, 201)
  } catch (error) {
    console.error('[POST /items/:id/analyze] Error:', error)
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to create analysis job',
      },
      500
    )
  }
})

itemsApp.post('/:id/retry', (c) => c.json({ error: 'NOT_IMPLEMENTED' }, 501))
