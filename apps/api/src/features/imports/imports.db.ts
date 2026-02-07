import type { Database } from 'better-sqlite3'
import { generateId, extractDomain } from '../../lib/utils.js'
import type { ParsedBookmarkEntry } from './bookmarks.parser.js'

export type BookmarkImportRecord = {
  id: string
  user_id: string | null
  source_type: 'bookmarks_html'
  file_name: string
  file_size_bytes: number
  file_sha256: string
  status: 'queued' | 'processing' | 'completed' | 'completed_with_errors' | 'failed'
  total_count: number
  created_count: number
  duplicate_existing_count: number
  duplicate_in_file_count: number
  invalid_count: number
  failed_count: number
  done_count: number
  started_at: string | null
  finished_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export type BookmarkImportEntryStatus =
  | 'created'
  | 'duplicate_existing'
  | 'duplicate_in_file'
  | 'invalid'
  | 'queued'
  | 'fetching'
  | 'ai_processing'
  | 'embedding'
  | 'done'
  | 'failed'

export type BookmarkImportEntryRecord = {
  id: string
  import_id: string
  user_id: string
  index_in_file: number
  folder_path: string | null
  source_tags: string | null
  source_note: string | null
  url_raw: string
  url_normalized: string | null
  title_raw: string | null
  status: BookmarkImportEntryStatus
  item_id: string | null
  error_code: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export type ListBookmarkImportsFilters = {
  status?: BookmarkImportRecord['status']
  limit?: number
  offset?: number
}

export type ListBookmarkImportsResult = {
  imports: BookmarkImportRecord[]
  total: number
}

export type ListBookmarkImportEntriesFilters = {
  status?: BookmarkImportEntryStatus
  limit?: number
  offset?: number
}

export type ListBookmarkImportEntriesResult = {
  entries: BookmarkImportEntryRecord[]
  total: number
}

type BookmarkImportEntryStatusCountRow = {
  status: BookmarkImportEntryStatus
  count: number
}

export type BookmarkImportEntryStatusCounts = Record<BookmarkImportEntryStatus, number>

export function getBookmarkImportByIdForUser(
  db: Database,
  userId: string,
  importId: string
): BookmarkImportRecord | null {
  const record = db
    .prepare('SELECT * FROM bookmark_imports WHERE id = ? AND user_id = ?')
    .get(importId, userId) as BookmarkImportRecord | undefined

  return record ?? null
}

export function listBookmarkImports(
  db: Database,
  userId: string,
  filters: ListBookmarkImportsFilters = {}
): ListBookmarkImportsResult {
  const { status, limit = 20, offset = 0 } = filters
  const conditions = ['user_id = ?']
  const params: Array<string | number> = [userId]

  if (status) {
    conditions.push('status = ?')
    params.push(status)
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`
  const countSql = `SELECT COUNT(*) as count FROM bookmark_imports ${whereClause}`
  const { count } = db.prepare(countSql).get(...params) as { count: number }

  const listSql = `
    SELECT * FROM bookmark_imports
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `
  const imports = db.prepare(listSql).all(...params, limit, offset) as BookmarkImportRecord[]

  return {
    imports,
    total: count,
  }
}

export function listBookmarkImportEntries(
  db: Database,
  userId: string,
  importId: string,
  filters: ListBookmarkImportEntriesFilters = {}
): ListBookmarkImportEntriesResult {
  const { status, limit = 50, offset = 0 } = filters
  const conditions = ['user_id = ?', 'import_id = ?']
  const params: Array<string | number> = [userId, importId]

  if (status) {
    conditions.push('status = ?')
    params.push(status)
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`
  const countSql = `SELECT COUNT(*) as count FROM bookmark_import_entries ${whereClause}`
  const { count } = db.prepare(countSql).get(...params) as { count: number }

  const listSql = `
    SELECT * FROM bookmark_import_entries
    ${whereClause}
    ORDER BY index_in_file ASC
    LIMIT ? OFFSET ?
  `
  const entries = db.prepare(listSql).all(...params, limit, offset) as BookmarkImportEntryRecord[]

  return {
    entries,
    total: count,
  }
}

export function getBookmarkImportEntryStatusCounts(db: Database, importId: string): BookmarkImportEntryStatusCounts {
  const rows = db
    .prepare(
      `
        SELECT status, COUNT(*) as count
        FROM bookmark_import_entries
        WHERE import_id = ?
        GROUP BY status
      `
    )
    .all(importId) as BookmarkImportEntryStatusCountRow[]

  const counts: BookmarkImportEntryStatusCounts = {
    created: 0,
    duplicate_existing: 0,
    duplicate_in_file: 0,
    invalid: 0,
    queued: 0,
    fetching: 0,
    ai_processing: 0,
    embedding: 0,
    done: 0,
    failed: 0,
  }

  for (const row of rows) {
    counts[row.status] = row.count
  }

  return counts
}

export type CreateBookmarkImportSessionInput = {
  id: string
  userId: string
  fileName: string
  fileSizeBytes: number
  fileSha256: string
  totalCount: number
  invalidCount: number
  timestamp: string
}

export type OrchestrateBookmarkImportInput = {
  importId: string
  userId: string
  timestamp: string
  aiMode?: 'server' | 'user'
  parsedEntries: ParsedBookmarkEntry[]
}

export function createBookmarkImportSession(
  db: Database,
  input: CreateBookmarkImportSessionInput
): BookmarkImportRecord {
  db.prepare(
    `
      INSERT INTO bookmark_imports (
        id,
        user_id,
        source_type,
        file_name,
        file_size_bytes,
        file_sha256,
        status,
        total_count,
        created_count,
        duplicate_existing_count,
        duplicate_in_file_count,
        invalid_count,
        failed_count,
        done_count,
        started_at,
        finished_at,
        error_message,
        created_at,
        updated_at
      )
      VALUES (?, ?, 'bookmarks_html', ?, ?, ?, 'queued', ?, 0, 0, 0, ?, 0, 0, NULL, NULL, NULL, ?, ?)
    `
  ).run(
    input.id,
    input.userId,
    input.fileName,
    input.fileSizeBytes,
    input.fileSha256,
    input.totalCount,
    input.invalidCount,
    input.timestamp,
    input.timestamp
  )

  const created = db
    .prepare('SELECT * FROM bookmark_imports WHERE id = ?')
    .get(input.id) as BookmarkImportRecord | undefined

  if (!created) {
    throw new Error('Failed to create bookmark import session')
  }

  return created
}

export function orchestrateBookmarkImportEntries(
  db: Database,
  input: OrchestrateBookmarkImportInput
): BookmarkImportRecord {
  return db.transaction(() => {
    const findExistingItemStmt = db.prepare('SELECT id FROM items WHERE user_id = ? AND url_normalized = ?')

    const insertEntryStmt = db.prepare(`
      INSERT INTO bookmark_import_entries (
        id,
        import_id,
        user_id,
        index_in_file,
        folder_path,
        source_tags,
        source_note,
        url_raw,
        url_normalized,
        title_raw,
        status,
        item_id,
        error_code,
        error_message,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertItemStmt = db.prepare(`
      INSERT INTO items (
        id,
        user_id,
        source,
        import_id,
        import_entry_id,
        url,
        url_normalized,
        title,
        domain,
        status,
        ai_mode,
        created_at,
        updated_at
      )
      VALUES (?, ?, 'bookmark_import', ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `)

    const insertFetchJobStmt = db.prepare(`
      INSERT INTO jobs (id, item_id, type, state, attempt, run_after, created_at, updated_at)
      VALUES (?, ?, 'fetch', 'pending', 0, ?, ?, ?)
    `)

    const updateImportStmt = db.prepare(`
      UPDATE bookmark_imports
      SET
        status = ?,
        total_count = ?,
        created_count = ?,
        duplicate_existing_count = ?,
        duplicate_in_file_count = ?,
        invalid_count = ?,
        failed_count = ?,
        done_count = ?,
        started_at = ?,
        finished_at = ?,
        updated_at = ?
      WHERE id = ?
    `)

    let createdCount = 0
    let duplicateExistingCount = 0
    let duplicateInFileCount = 0
    let invalidCount = 0
    const failedCount = 0

    const seenInFile = new Set<string>()

    for (const parsedEntry of input.parsedEntries) {
      const entryId = generateId('import_entry')
      let status: 'created' | 'duplicate_existing' | 'duplicate_in_file' | 'invalid' | 'queued' = 'invalid'
      let itemId: string | null = null

      if (parsedEntry.error_code || !parsedEntry.url_normalized) {
        status = 'invalid'
        invalidCount += 1
      } else if (seenInFile.has(parsedEntry.url_normalized)) {
        status = 'duplicate_in_file'
        duplicateInFileCount += 1
      } else {
        seenInFile.add(parsedEntry.url_normalized)

        const existing = findExistingItemStmt.get(input.userId, parsedEntry.url_normalized) as
          | { id: string }
          | undefined

        if (existing) {
          status = 'duplicate_existing'
          itemId = existing.id
          duplicateExistingCount += 1
        } else {
          const newItemId = generateId('item')
          const fetchJobId = generateId('job')

          insertItemStmt.run(
            newItemId,
            input.userId,
            input.importId,
            entryId,
            parsedEntry.url_raw,
            parsedEntry.url_normalized,
            parsedEntry.title_raw,
            extractDomain(parsedEntry.url_raw),
            input.aiMode ?? 'server',
            input.timestamp,
            input.timestamp
          )

          insertFetchJobStmt.run(fetchJobId, newItemId, input.timestamp, input.timestamp, input.timestamp)

          status = 'queued'
          itemId = newItemId
          createdCount += 1
        }
      }

      insertEntryStmt.run(
        entryId,
        input.importId,
        input.userId,
        parsedEntry.index_in_file,
        parsedEntry.folder_path,
        parsedEntry.source_tags.length > 0 ? JSON.stringify(parsedEntry.source_tags) : null,
        parsedEntry.source_note,
        parsedEntry.url_raw,
        parsedEntry.url_normalized,
        parsedEntry.title_raw,
        status,
        itemId,
        parsedEntry.error_code,
        null,
        input.timestamp,
        input.timestamp
      )
    }

    const doneCount = invalidCount + duplicateExistingCount + duplicateInFileCount
    const hasQueuedEntries = createdCount > 0
    const importStatus: BookmarkImportRecord['status'] = hasQueuedEntries ? 'processing' : 'completed'

    updateImportStmt.run(
      importStatus,
      input.parsedEntries.length,
      createdCount,
      duplicateExistingCount,
      duplicateInFileCount,
      invalidCount,
      failedCount,
      doneCount,
      input.timestamp,
      hasQueuedEntries ? null : input.timestamp,
      input.timestamp,
      input.importId
    )

    const updated = db
      .prepare('SELECT * FROM bookmark_imports WHERE id = ?')
      .get(input.importId) as BookmarkImportRecord | undefined

    if (!updated) {
      throw new Error('Failed to update bookmark import session')
    }

    return updated
  })()
}

type ImportProgressSnapshot = {
  totalCount: number
  failedCount: number
  doneCount: number
}

function snapshotImportProgress(db: Database, importId: string): ImportProgressSnapshot {
  const row = db
    .prepare(
      `
        SELECT
          COUNT(*) AS totalCount,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failedCount,
          SUM(CASE WHEN status IN ('duplicate_existing', 'duplicate_in_file', 'invalid', 'done', 'failed') THEN 1 ELSE 0 END) AS doneCount
        FROM bookmark_import_entries
        WHERE import_id = ?
      `
    )
    .get(importId) as
    | {
        totalCount: number
        failedCount: number | null
        doneCount: number | null
      }
    | undefined

  return {
    totalCount: row?.totalCount ?? 0,
    failedCount: row?.failedCount ?? 0,
    doneCount: row?.doneCount ?? 0,
  }
}

function refreshImportProgress(db: Database, importId: string, now: string): void {
  const { totalCount, failedCount, doneCount } = snapshotImportProgress(db, importId)
  const isFinished = totalCount > 0 && doneCount >= totalCount
  const status: BookmarkImportRecord['status'] = isFinished
    ? failedCount > 0
      ? 'completed_with_errors'
      : 'completed'
    : 'processing'

  db.prepare(
    `
      UPDATE bookmark_imports
      SET
        status = ?,
        failed_count = ?,
        done_count = ?,
        finished_at = ?,
        updated_at = ?
      WHERE id = ?
    `
  ).run(status, failedCount, doneCount, isFinished ? now : null, now, importId)
}

export function setBookmarkImportEntryStatusByItemId(
  db: Database,
  itemId: string,
  status: 'fetching' | 'ai_processing' | 'embedding',
  now: string = new Date().toISOString()
): void {
  db.transaction(() => {
    const entry = db
      .prepare(
        `
          SELECT id, import_id, status
          FROM bookmark_import_entries
          WHERE item_id = ?
        `
      )
      .get(itemId) as { id: string; import_id: string; status: string } | undefined

    if (!entry) {
      return
    }

    if (
      entry.status === 'duplicate_existing' ||
      entry.status === 'duplicate_in_file' ||
      entry.status === 'invalid' ||
      entry.status === 'failed' ||
      entry.status === 'done'
    ) {
      return
    }

    db.prepare(
      `
        UPDATE bookmark_import_entries
        SET status = ?, updated_at = ?
        WHERE id = ?
      `
    ).run(status, now, entry.id)
  })()
}

export function completeBookmarkImportEntryByItemId(
  db: Database,
  itemId: string,
  now: string = new Date().toISOString()
): void {
  db.transaction(() => {
    const entry = db
      .prepare(
        `
          SELECT id, import_id, status
          FROM bookmark_import_entries
          WHERE item_id = ?
        `
      )
      .get(itemId) as { id: string; import_id: string; status: string } | undefined

    if (!entry) {
      return
    }

    if (
      entry.status === 'duplicate_existing' ||
      entry.status === 'duplicate_in_file' ||
      entry.status === 'invalid' ||
      entry.status === 'done' ||
      entry.status === 'failed'
    ) {
      return
    }

    db.prepare(
      `
        UPDATE bookmark_import_entries
        SET
          status = 'done',
          error_code = NULL,
          error_message = NULL,
          updated_at = ?
        WHERE id = ?
      `
    ).run(now, entry.id)

    refreshImportProgress(db, entry.import_id, now)
  })()
}

export function failBookmarkImportEntryByItemId(
  db: Database,
  input: {
    itemId: string
    errorCode: string
    errorMessage: string
    now?: string
  }
): void {
  const now = input.now ?? new Date().toISOString()

  db.transaction(() => {
    const entry = db
      .prepare(
        `
          SELECT id, import_id, status
          FROM bookmark_import_entries
          WHERE item_id = ?
        `
      )
      .get(input.itemId) as { id: string; import_id: string; status: string } | undefined

    if (!entry) {
      return
    }

    if (entry.status === 'duplicate_existing' || entry.status === 'duplicate_in_file' || entry.status === 'invalid') {
      return
    }

    db.prepare(
      `
        UPDATE bookmark_import_entries
        SET
          status = 'failed',
          error_code = ?,
          error_message = ?,
          updated_at = ?
        WHERE id = ?
      `
    ).run(input.errorCode, input.errorMessage, now, entry.id)

    refreshImportProgress(db, entry.import_id, now)
  })()
}
