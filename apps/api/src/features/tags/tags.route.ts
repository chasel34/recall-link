import { Hono } from 'hono'
import { getDb } from '../../db/context.js'
import { listTags } from './tags.db.js'
import { getAuthUser, requireAuth } from '../auth/auth.middleware.js'

export const tagsApp = new Hono()

tagsApp.use('*', requireAuth)

tagsApp.get('/', (c) => {
  try {
    const db = getDb()
    const userId = getAuthUser(c).id
    const tags = listTags(db, userId)

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
