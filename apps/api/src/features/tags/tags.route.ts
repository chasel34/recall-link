import { Hono } from 'hono'
import { getDb } from '../../db/context.js'
import { listTags } from './tags.db.js'

export const tagsApp = new Hono()

tagsApp.get('/', (c) => {
  try {
    const db = getDb()
    const tags = listTags(db)

    return c.json({ tags })
  } catch (error) {
    console.error('[GET /tags] Error:', error)
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to get tags',
      },
      500
    )
  }
})
