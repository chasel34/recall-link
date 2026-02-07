import { createHash } from 'node:crypto'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { getDb } from '../../db/context.js'
import { generateId } from '../../lib/utils.js'
import { getAuthUser, requireAuth } from '../auth/auth.middleware.js'
import { parseNetscapeBookmarksHtml } from './bookmarks.parser.js'
import {
  createBookmarkImportSession,
  getBookmarkImportByIdForUser,
  getBookmarkImportEntryStatusCounts,
  listBookmarkImportEntries,
  listBookmarkImports,
  orchestrateBookmarkImportEntries,
} from './imports.db.js'
import {
  createBookmarkImportBodySchema,
  listImportEntriesQuerySchema,
  listImportsQuerySchema,
} from './imports.schema.js'

const MAX_BOOKMARK_FILE_SIZE_BYTES = 10 * 1024 * 1024

export const importsApp = new Hono()

importsApp.use('*', requireAuth)

function normalizeBodyValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    const firstString = value.find((entry) => typeof entry === 'string')
    return typeof firstString === 'string' ? firstString : undefined
  }

  return undefined
}

function getUploadedFile(value: unknown): File | null {
  if (value instanceof File) {
    return value
  }

  if (Array.isArray(value)) {
    const firstFile = value.find((entry): entry is File => entry instanceof File)
    return firstFile ?? null
  }

  return null
}

function toImportStats(record: {
  total_count: number
  created_count: number
  duplicate_existing_count: number
  duplicate_in_file_count: number
  invalid_count: number
  failed_count: number
  done_count: number
}) {
  return {
    total_count: record.total_count,
    created_count: record.created_count,
    duplicate_existing_count: record.duplicate_existing_count,
    duplicate_in_file_count: record.duplicate_in_file_count,
    invalid_count: record.invalid_count,
    failed_count: record.failed_count,
    done_count: record.done_count,
  }
}

importsApp.get('/', zValidator('query', listImportsQuerySchema), (c) => {
  try {
    const db = getDb()
    const userId = getAuthUser(c).id
    const query = c.req.valid('query')

    const result = listBookmarkImports(db, userId, query)

    return c.json({
      imports: result.imports.map((record) => ({
        id: record.id,
        source_type: record.source_type,
        file_name: record.file_name,
        file_size_bytes: record.file_size_bytes,
        file_sha256: record.file_sha256,
        status: record.status,
        stats: toImportStats(record),
        started_at: record.started_at,
        finished_at: record.finished_at,
        error_message: record.error_message,
        created_at: record.created_at,
        updated_at: record.updated_at,
      })),
      total: result.total,
      limit: query.limit,
      offset: query.offset,
    })
  } catch (error) {
    console.error('[GET /imports] Error:', error)
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to list imports',
      },
      500
    )
  }
})

importsApp.get('/:id', (c) => {
  try {
    const db = getDb()
    const userId = getAuthUser(c).id
    const id = c.req.param('id')
    const record = getBookmarkImportByIdForUser(db, userId, id)

    if (!record) {
      return c.json(
        {
          error: 'NOT_FOUND',
          message: 'Import not found',
        },
        404
      )
    }

    const statusCounts = getBookmarkImportEntryStatusCounts(db, record.id)
    const progressPercent = record.total_count > 0 ? Math.min(100, Math.round((record.done_count / record.total_count) * 100)) : 100

    return c.json({
      id: record.id,
      source_type: record.source_type,
      file_name: record.file_name,
      file_size_bytes: record.file_size_bytes,
      file_sha256: record.file_sha256,
      status: record.status,
      stats: toImportStats(record),
      progress: {
        total_count: record.total_count,
        done_count: record.done_count,
        pending_count: Math.max(record.total_count - record.done_count, 0),
        failed_count: record.failed_count,
        progress_percent: progressPercent,
      },
      entry_status_counts: statusCounts,
      started_at: record.started_at,
      finished_at: record.finished_at,
      error_message: record.error_message,
      created_at: record.created_at,
      updated_at: record.updated_at,
    })
  } catch (error) {
    console.error('[GET /imports/:id] Error:', error)
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to get import details',
      },
      500
    )
  }
})

importsApp.get('/:id/entries', zValidator('query', listImportEntriesQuerySchema), (c) => {
  try {
    const db = getDb()
    const userId = getAuthUser(c).id
    const query = c.req.valid('query')
    const importId = c.req.param('id')

    const record = getBookmarkImportByIdForUser(db, userId, importId)
    if (!record) {
      return c.json(
        {
          error: 'NOT_FOUND',
          message: 'Import not found',
        },
        404
      )
    }

    const result = listBookmarkImportEntries(db, userId, importId, query)

    return c.json({
      import_id: importId,
      entries: result.entries,
      total: result.total,
      limit: query.limit,
      offset: query.offset,
    })
  } catch (error) {
    console.error('[GET /imports/:id/entries] Error:', error)
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to list import entries',
      },
      500
    )
  }
})

importsApp.post('/bookmarks', async (c) => {
  try {
    const db = getDb()
    const userId = getAuthUser(c).id
    const body = await c.req.parseBody()

    const file = getUploadedFile(body.file)
    if (!file) {
      return c.json(
        {
          error: 'INVALID_BOOKMARK_FILE',
          message: 'Bookmark HTML file is required',
        },
        400
      )
    }

    const fileName = file.name?.trim() || 'bookmarks.html'
    const isLikelyHtml = /\.html?$/i.test(fileName) || file.type.includes('html')
    if (!isLikelyHtml) {
      return c.json(
        {
          error: 'INVALID_BOOKMARK_FILE',
          message: 'Only HTML bookmark files are supported',
        },
        400
      )
    }

    if (file.size > MAX_BOOKMARK_FILE_SIZE_BYTES) {
      return c.json(
        {
          error: 'FILE_TOO_LARGE',
          message: `Bookmark file exceeds ${MAX_BOOKMARK_FILE_SIZE_BYTES} bytes`,
        },
        413
      )
    }

    const parsedBody = createBookmarkImportBodySchema.safeParse({
      ai_mode: normalizeBodyValue(body.ai_mode),
    })
    if (!parsedBody.success) {
      return c.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid import options',
          issues: parsedBody.error.issues,
        },
        400
      )
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const html = fileBuffer.toString('utf8')
    const parsed = parseNetscapeBookmarksHtml(html)

    const totalCount = parsed.entries.length
    const invalidCount = parsed.entries.filter((entry) => entry.error_code !== null).length

    const importId = generateId('import')
    const now = new Date().toISOString()
    const fileSha256 = createHash('sha256').update(fileBuffer).digest('hex')

    createBookmarkImportSession(db, {
      id: importId,
      userId,
      fileName,
      fileSizeBytes: file.size,
      fileSha256,
      totalCount,
      invalidCount,
      timestamp: now,
    })

    const updated = orchestrateBookmarkImportEntries(db, {
      importId,
      userId,
      timestamp: now,
      aiMode: parsedBody.data.ai_mode,
      parsedEntries: parsed.entries,
    })

    return c.json(
      {
        import_id: updated.id,
        status: updated.status,
        stats: {
          total_count: updated.total_count,
          created_count: updated.created_count,
          duplicate_existing_count: updated.duplicate_existing_count,
          duplicate_in_file_count: updated.duplicate_in_file_count,
          invalid_count: updated.invalid_count,
          failed_count: updated.failed_count,
          done_count: updated.done_count,
        },
      },
      201
    )
  } catch (error) {
    console.error('[POST /imports/bookmarks] Error:', error)
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to create bookmark import session',
      },
      500
    )
  }
})
