import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createItemSchema, patchItemSchema, listItemsQuerySchema } from './items.schema.js'
import { generateId, normalizeUrl, extractDomain } from '../../lib/utils.js'
import {
  findItemByNormalizedUrl,
  createItemWithJob,
  listItems,
  listItemsByTags,
  getItemByIdForUser,
  updateItem,
  deleteItem,
} from './items.db.js'
import { getDb } from '../../db/context.js'
import { getItemTags } from '../tags/tags.db.js'
import { searchItems } from './items.search.js'
import { getAuthUser, requireAuth } from '../auth/auth.middleware.js'

export const itemsApp = new Hono()

itemsApp.use('*', requireAuth)

itemsApp.post('/', zValidator('json', createItemSchema), (c) => {
  try {
    const db = getDb()
    const userId = getAuthUser(c).id
    const { url } = c.req.valid('json')

    const urlNormalized = normalizeUrl(url)
    const domain = extractDomain(url)

    const existing = findItemByNormalizedUrl(db, userId, urlNormalized)
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
      userId,
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
    const userId = getAuthUser(c).id
    const filters = c.req.valid('query')

    let result: ReturnType<typeof listItems>
    if (filters.q) {
      result = searchItems(db, userId, filters.q, filters)
    } else if (filters.tags) {
      const tagNames = filters.tags.split(',').map((tag) => tag.trim())
      result = listItemsByTags(db, userId, tagNames, filters)
    } else {
      result = listItems(db, userId, filters)
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
    const userId = getAuthUser(c).id
    const id = c.req.param('id')

    const item = getItemByIdForUser(db, userId, id)

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
    const userId = getAuthUser(c).id
    const id = c.req.param('id')
    const updates = c.req.valid('json')

    const existing = getItemByIdForUser(db, userId, id)
    if (!existing) {
      return c.json({
        error: 'NOT_FOUND',
        message: 'Item not found',
      }, 404)
    }

    // Check if there are any updates
    const hasUpdates = updates.summary !== undefined || updates.tags !== undefined || updates.note !== undefined
    if (!hasUpdates) {
      return c.json({
        error: 'NO_CHANGES',
        message: 'No fields to update',
      }, 400)
    }

    updateItem(db, userId, id, updates)

    const updated = getItemByIdForUser(db, userId, id)
    const tags = getItemTags(db, id)

    return c.json({
      ...updated,
      tags,
    })
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
    const userId = getAuthUser(c).id
    const id = c.req.param('id')

    const existing = getItemByIdForUser(db, userId, id)
    if (!existing) {
      return c.json({
        error: 'NOT_FOUND',
        message: 'Item not found',
      }, 404)
    }

    const result = deleteItem(db, id)

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
    const userId = getAuthUser(c).id
    const id = c.req.param('id')

    const item = getItemByIdForUser(db, userId, id)
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
