import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { listJobsQuerySchema } from './jobs.schema.js'
import { listInProgressJobs } from './jobs.list.db.js'
import { getDb } from '../../db/context.js'
import { getAuthUser, requireAuth } from '../auth/auth.middleware.js'

export const jobsApp = new Hono()

jobsApp.use('*', requireAuth)

jobsApp.get('/in-progress', zValidator('query', listJobsQuerySchema), (c) => {
  try {
    const db = getDb()
    const userId = getAuthUser(c).id
    const filters = c.req.valid('query')
    const now = new Date().toISOString()

    const result = listInProgressJobs(db, userId, filters, now)

    return c.json({
      jobs: result.jobs,
      total: result.total,
      limit: filters.limit,
      offset: filters.offset,
    })
  } catch (error) {
    console.error('[GET /jobs/in-progress] Error:', error)
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to list in-progress jobs',
      },
      500
    )
  }
})
