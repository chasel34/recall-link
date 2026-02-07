import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { app } from '../app.js'
import { applySchema, defaultSchemaPath } from '../db/client.js'
import { closeDb, setDb } from '../db/context.js'
import { registerTestUser } from './test-auth.js'

describe('imports API', () => {
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

  it('creates import entries, items, and fetch jobs with classified stats', async () => {
    const html = `
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
  <DT><H3>Programming</H3>
  <DL><p>
    <DT><A HREF="https://example.com/ok?utm_source=test" TAGS="docs,guide">Example</A>
    <DD>Keep this one
    <DT><A HREF="javascript:alert(1)">Invalid</A>
  </DL><p>
</DL><p>
`

    const form = new FormData()
    form.set('file', new File([html], 'bookmarks.html', { type: 'text/html' }))
    form.set('ai_mode', 'server')

    const response = await app.request('/api/imports/bookmarks', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: form,
    })

    expect(response.status).toBe(201)
    const payload = await response.json()
    expect(payload).toMatchObject({
      import_id: expect.stringMatching(/^import_/),
      status: 'processing',
      stats: {
        total_count: 2,
        created_count: 1,
        duplicate_existing_count: 0,
        duplicate_in_file_count: 0,
        invalid_count: 1,
        failed_count: 0,
        done_count: 1,
      },
    })

    const stored = db
      .prepare(
        'SELECT status, total_count, invalid_count, created_count, duplicate_existing_count, duplicate_in_file_count, failed_count, done_count FROM bookmark_imports WHERE id = ?'
      )
      .get(payload.import_id) as
      | {
          status: string
          total_count: number
          invalid_count: number
          created_count: number
          duplicate_existing_count: number
          duplicate_in_file_count: number
          failed_count: number
          done_count: number
        }
      | undefined

    expect(stored).toMatchObject({
      status: 'processing',
      total_count: 2,
      invalid_count: 1,
      created_count: 1,
      duplicate_existing_count: 0,
      duplicate_in_file_count: 0,
      failed_count: 0,
      done_count: 1,
    })

    const entries = db
      .prepare('SELECT index_in_file, status, url_normalized, item_id, error_code FROM bookmark_import_entries WHERE import_id = ? ORDER BY index_in_file ASC')
      .all(payload.import_id) as Array<{
      index_in_file: number
      status: string
      url_normalized: string | null
      item_id: string | null
      error_code: string | null
    }>

    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({
      index_in_file: 0,
      status: 'queued',
      url_normalized: 'https://example.com/ok',
      error_code: null,
      item_id: expect.stringMatching(/^item_/),
    })
    expect(entries[1]).toMatchObject({
      index_in_file: 1,
      status: 'invalid',
      url_normalized: null,
      error_code: 'UNSUPPORTED_URL_PROTOCOL',
      item_id: null,
    })

    const createdItem = db
      .prepare('SELECT id, user_id, source, import_id, import_entry_id, url_normalized FROM items WHERE import_id = ?')
      .get(payload.import_id) as
      | {
          id: string
          user_id: string
          source: string
          import_id: string
          import_entry_id: string
          url_normalized: string
        }
      | undefined

    expect(createdItem).toMatchObject({
      id: expect.stringMatching(/^item_/),
      user_id: userId,
      source: 'bookmark_import',
      import_id: payload.import_id,
      import_entry_id: expect.stringMatching(/^import_entry_/),
      url_normalized: 'https://example.com/ok',
    })

    const createdJob = db
      .prepare("SELECT type, state, item_id FROM jobs WHERE item_id = ?")
      .get(createdItem?.id) as
      | {
          type: string
          state: string
          item_id: string
        }
      | undefined

    expect(createdJob).toMatchObject({
      type: 'fetch',
      state: 'pending',
      item_id: createdItem?.id,
    })
  })

  it('classifies duplicate_in_file and duplicate_existing using normalized URLs', async () => {
    db.prepare(`
      INSERT INTO items (id, user_id, source, url, url_normalized, domain, status, created_at, updated_at)
      VALUES (?, ?, 'manual', ?, ?, ?, 'completed', ?, ?)
    `).run(
      'item_existing',
      userId,
      'https://dup.example.com/path',
      'https://dup.example.com/path',
      'dup.example.com',
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z'
    )

    const html = `
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
  <DT><A HREF="http://dup.example.com/path?utm_source=newsletter">Existing duplicate</A>
  <DT><A HREF="https://new.example.com/a">New A</A>
  <DT><A HREF="https://new.example.com/a/">New A duplicate in file</A>
</DL><p>
`

    const form = new FormData()
    form.set('file', new File([html], 'bookmarks.html', { type: 'text/html' }))

    const response = await app.request('/api/imports/bookmarks', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: form,
    })

    expect(response.status).toBe(201)
    const payload = await response.json()
    expect(payload).toMatchObject({
      status: 'processing',
      stats: {
        total_count: 3,
        created_count: 1,
        duplicate_existing_count: 1,
        duplicate_in_file_count: 1,
        invalid_count: 0,
        failed_count: 0,
        done_count: 2,
      },
    })

    const entries = db
      .prepare('SELECT index_in_file, status, url_normalized, item_id FROM bookmark_import_entries WHERE import_id = ? ORDER BY index_in_file ASC')
      .all(payload.import_id) as Array<{
      index_in_file: number
      status: string
      url_normalized: string | null
      item_id: string | null
    }>

    expect(entries).toHaveLength(3)
    expect(entries[0]).toMatchObject({
      index_in_file: 0,
      status: 'duplicate_existing',
      url_normalized: 'https://dup.example.com/path',
      item_id: 'item_existing',
    })
    expect(entries[1]).toMatchObject({
      index_in_file: 1,
      status: 'queued',
      url_normalized: 'https://new.example.com/a',
      item_id: expect.stringMatching(/^item_/),
    })
    expect(entries[2]).toMatchObject({
      index_in_file: 2,
      status: 'duplicate_in_file',
      url_normalized: 'https://new.example.com/a',
      item_id: null,
    })
  })

  it('rejects non-html uploads', async () => {
    const form = new FormData()
    form.set('file', new File(['plain text'], 'bookmarks.txt', { type: 'text/plain' }))

    const response = await app.request('/api/imports/bookmarks', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: form,
    })

    expect(response.status).toBe(400)
    const payload = await response.json()
    expect(payload.error).toBe('INVALID_BOOKMARK_FILE')
  })

  it('lists imports with pagination/status filters and user isolation', async () => {
    const authOther = await registerTestUser(app, { email: 'other-imports@example.com' })

    const processingHtml = '<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><p><DT><A HREF="https://list-a.example.com">A</A></DL><p>'
    const completedHtml = '<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><p><DT><A HREF="javascript:alert(1)">Bad</A></DL><p>'

    const formProcessing = new FormData()
    formProcessing.set('file', new File([processingHtml], 'user-processing.html', { type: 'text/html' }))

    const formCompleted = new FormData()
    formCompleted.set('file', new File([completedHtml], 'user-completed.html', { type: 'text/html' }))

    const formOther = new FormData()
    formOther.set('file', new File([processingHtml], 'other-user.html', { type: 'text/html' }))

    await app.request('/api/imports/bookmarks', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: formProcessing,
    })

    await app.request('/api/imports/bookmarks', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: formCompleted,
    })

    await app.request('/api/imports/bookmarks', {
      method: 'POST',
      headers: { Cookie: authOther.cookie },
      body: formOther,
    })

    const response = await app.request('/api/imports?limit=10&offset=0', {
      headers: { Cookie: cookie },
    })

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.total).toBe(2)
    expect(payload.limit).toBe(10)
    expect(payload.offset).toBe(0)
    expect(payload.imports).toHaveLength(2)
    expect(payload.imports.every((entry: { file_name: string }) => entry.file_name !== 'other-user.html')).toBe(true)

    const completedOnly = await app.request('/api/imports?status=completed', {
      headers: { Cookie: cookie },
    })
    expect(completedOnly.status).toBe(200)

    const completedPayload = await completedOnly.json()
    expect(completedPayload.total).toBe(1)
    expect(completedPayload.imports).toHaveLength(1)
    expect(completedPayload.imports[0]).toMatchObject({
      status: 'completed',
      file_name: 'user-completed.html',
      stats: {
        total_count: 1,
        invalid_count: 1,
      },
    })
  })

  it('returns import detail with aggregate progress/stats and ownership checks', async () => {
    const authOther = await registerTestUser(app, { email: 'detail-other@example.com' })
    const html = `
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
  <DT><A HREF="https://detail.example.com/ok">OK</A>
  <DT><A HREF="javascript:alert(1)">Bad</A>
</DL><p>
`

    const form = new FormData()
    form.set('file', new File([html], 'detail.html', { type: 'text/html' }))

    const createdRes = await app.request('/api/imports/bookmarks', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: form,
    })
    expect(createdRes.status).toBe(201)
    const created = await createdRes.json()

    const detailRes = await app.request(`/api/imports/${created.import_id}`, {
      headers: { Cookie: cookie },
    })
    expect(detailRes.status).toBe(200)

    const detail = await detailRes.json()
    expect(detail).toMatchObject({
      id: created.import_id,
      status: 'processing',
      file_name: 'detail.html',
      stats: {
        total_count: 2,
        created_count: 1,
        invalid_count: 1,
        done_count: 1,
      },
      progress: {
        total_count: 2,
        done_count: 1,
        pending_count: 1,
        failed_count: 0,
        progress_percent: 50,
      },
      entry_status_counts: {
        queued: 1,
        invalid: 1,
      },
    })

    const deniedRes = await app.request(`/api/imports/${created.import_id}`, {
      headers: { Cookie: authOther.cookie },
    })
    expect(deniedRes.status).toBe(404)
  })

  it('lists import entries with status filtering/pagination and ownership checks', async () => {
    const authOther = await registerTestUser(app, { email: 'entries-other@example.com' })

    db.prepare(`
      INSERT INTO items (id, user_id, source, url, url_normalized, domain, status, created_at, updated_at)
      VALUES (?, ?, 'manual', ?, ?, ?, 'completed', ?, ?)
    `).run(
      'item_existing_entries',
      userId,
      'https://entries.example.com/already',
      'https://entries.example.com/already',
      'entries.example.com',
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z'
    )

    const html = `
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
  <DT><A HREF="https://entries.example.com/already">Existing</A>
  <DT><A HREF="https://entries.example.com/new">New</A>
  <DT><A HREF="https://entries.example.com/new/">New duplicate</A>
  <DT><A HREF="javascript:alert(1)">Invalid</A>
</DL><p>
`

    const form = new FormData()
    form.set('file', new File([html], 'entries.html', { type: 'text/html' }))

    const createdRes = await app.request('/api/imports/bookmarks', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: form,
    })
    expect(createdRes.status).toBe(201)
    const created = await createdRes.json()

    const allEntriesRes = await app.request(`/api/imports/${created.import_id}/entries?limit=2&offset=1`, {
      headers: { Cookie: cookie },
    })
    expect(allEntriesRes.status).toBe(200)

    const allEntries = await allEntriesRes.json()
    expect(allEntries).toMatchObject({
      import_id: created.import_id,
      total: 4,
      limit: 2,
      offset: 1,
    })
    expect(allEntries.entries).toHaveLength(2)
    expect(allEntries.entries[0].index_in_file).toBe(1)
    expect(allEntries.entries[1].index_in_file).toBe(2)

    const filteredRes = await app.request(`/api/imports/${created.import_id}/entries?status=duplicate_existing`, {
      headers: { Cookie: cookie },
    })
    expect(filteredRes.status).toBe(200)

    const filtered = await filteredRes.json()
    expect(filtered.total).toBe(1)
    expect(filtered.entries).toHaveLength(1)
    expect(filtered.entries[0]).toMatchObject({
      status: 'duplicate_existing',
      item_id: 'item_existing_entries',
    })

    const deniedRes = await app.request(`/api/imports/${created.import_id}/entries`, {
      headers: { Cookie: authOther.cookie },
    })
    expect(deniedRes.status).toBe(404)
  })
})
