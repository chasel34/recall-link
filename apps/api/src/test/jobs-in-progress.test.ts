import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { app } from '../app.js'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../db/client.js'
import { setDb, closeDb } from '../db/context.js'
import { registerTestUser } from './test-auth.js'

describe('GET /api/jobs/in-progress', () => {
  let db: Database.Database
  let cookie: string
  let userId: string

  beforeEach(async () => {
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())
    setDb(db)

    const auth = await registerTestUser(app)
    cookie = auth.cookie
    userId = auth.user.id
  })

  afterEach(() => {
    closeDb()
  })

  it('should return 401 if not authenticated', async () => {
    const res = await app.request('/api/jobs/in-progress')
    expect(res.status).toBe(401)
  })

  it('should return empty list if no jobs', async () => {
    const res = await app.request('/api/jobs/in-progress', {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.jobs).toEqual([])
    expect(data.total).toBe(0)
  })

  it('should isolate jobs by user', async () => {
    const now = new Date().toISOString()
    const itemId = 'item_1'
    db.prepare(
      `
      INSERT INTO items (id, user_id, url, url_normalized, domain, status, created_at, updated_at)
      VALUES (?, ?, 'https://example.com/1', 'https://example.com/1', 'example.com', 'pending', ?, ?)
    `
    ).run(itemId, userId, now, now)

    db.prepare(
      `
      INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at)
      VALUES (?, ?, 'fetch', 'pending', 0, ?, ?, ?)
    `
    ).run('job_1', itemId, now, now, now)

    const auth2 = await registerTestUser(app, { email: 'other@example.com' })
    const itemId2 = 'item_2'
    db.prepare(
      `
      INSERT INTO items (id, user_id, url, url_normalized, domain, status, created_at, updated_at)
      VALUES (?, ?, 'https://example.com/2', 'https://example.com/2', 'example.com', 'pending', ?, ?)
    `
    ).run(itemId2, auth2.user.id, now, now)

    db.prepare(
      `
      INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at)
      VALUES (?, ?, 'fetch', 'pending', 0, ?, ?, ?)
    `
    ).run('job_2', itemId2, now, now, now)

    const res = await app.request('/api/jobs/in-progress', {
      headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.jobs).toHaveLength(1)
    expect(data.jobs[0].id).toBe('job_1')
    expect(data.total).toBe(1)
  })

  it('should correctly derive ui_status', async () => {
    const now = new Date()
    const future = new Date(now.getTime() + 60000).toISOString()
    const past = new Date(now.getTime() - 60000).toISOString()
    const nowIso = now.toISOString()

    const createJob = (
      id: string,
      runAfter: string,
      lockedBy: string | null = null,
      lockExpiresAt: string | null = null
    ) => {
      const itemId = `item_${id}`
      db.prepare(
        `
        INSERT INTO items (id, user_id, url, url_normalized, domain, status, created_at, updated_at)
        VALUES (?, ?, 'https://example.com/${id}', 'https://example.com/${id}', 'example.com', 'pending', ?, ?)
      `
      ).run(itemId, userId, nowIso, nowIso)

      db.prepare(
        `
        INSERT INTO jobs (id, item_id, type, state, attempt, run_after, locked_by, lock_expires_at, created_at, updated_at)
        VALUES (?, ?, 'fetch', 'pending', 0, ?, ?, ?, ?, ?)
      `
      ).run(id, itemId, runAfter, lockedBy, lockExpiresAt, nowIso, nowIso)
    }

    createJob('running', past, 'worker-1', future)
    createJob('scheduled', future)
    createJob('stale', past, 'worker-1', past)
    createJob('queued', past)

    const res = await app.request('/api/jobs/in-progress', {
      headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.jobs).toHaveLength(4)

    const findJob = (id: string) => data.jobs.find((j: any) => j.id === id)

    expect(findJob('running').ui_status).toBe('running')
    expect(findJob('scheduled').ui_status).toBe('scheduled')
    expect(findJob('stale').ui_status).toBe('stale_lock')
    expect(findJob('queued').ui_status).toBe('queued')
  })

  it('should filter by type and status', async () => {
    const nowIso = new Date().toISOString()
    const createJob = (
      id: string,
      type: string,
      runAfter: string,
      lockedBy: string | null = null,
      lockExpiresAt: string | null = null
    ) => {
      const itemId = `item_${id}`
      db.prepare(
        `
        INSERT INTO items (id, user_id, url, url_normalized, domain, status, created_at, updated_at)
        VALUES (?, ?, 'https://example.com/${id}', 'https://example.com/${id}', 'example.com', 'pending', ?, ?)
      `
      ).run(itemId, userId, nowIso, nowIso)

      db.prepare(
        `
        INSERT INTO jobs (id, item_id, type, state, attempt, run_after, locked_by, lock_expires_at, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', 0, ?, ?, ?, ?, ?)
      `
      ).run(id, itemId, type, runAfter, lockedBy, lockExpiresAt, nowIso, nowIso)
    }

    createJob('job1', 'fetch', nowIso)
    createJob('job2', 'ai_process', nowIso)

    const resType = await app.request('/api/jobs/in-progress?type=fetch', {
      headers: { Cookie: cookie },
    })
    const dataType = await resType.json()
    expect(dataType.jobs).toHaveLength(1)
    expect(dataType.jobs[0].id).toBe('job1')

    const resStatus = await app.request('/api/jobs/in-progress?status=queued', {
      headers: { Cookie: cookie },
    })
    const dataStatus = await resStatus.json()
    expect(dataStatus.jobs).toHaveLength(2)
  })
})
