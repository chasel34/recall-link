import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

export type Db = Database.Database

export function openDb(dbPath: string): Db {
  // 确保数据库目录存在
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

export function applySchema(db: Db, schemaFilePath: string) {
  const sql = fs.readFileSync(schemaFilePath, 'utf8')

  // Important: existing on-disk DBs may have older tables missing new columns (e.g. user_id).
  // If we run the full schema (including indexes) first, CREATE INDEX can fail and prevent
  // subsequent table creation (e.g. chat tables). So we apply in phases:
  // 1) Create tables/virtual tables (idempotent)
  // 2) Run ALTER TABLE migrations
  // 3) Apply the remaining schema (indexes, etc.)
  const statements = splitSqlStatements(sql)

  const createStatements = statements.filter((stmt) => isCreateTableStatement(stmt))
  const otherStatements = statements.filter((stmt) => !isCreateTableStatement(stmt))

  for (const stmt of createStatements) {
    db.exec(stmt)
  }

  migrateJobsItemIdUnique(db)
  migrateItemsCleanHtmlColumn(db)
  migrateItemsUserIdColumn(db)
  migrateTagsUserIdColumn(db)
  migrateItemsUrlNormalizedUnique(db)
  migrateTagsNameUnique(db)

  for (const stmt of otherStatements) {
    db.exec(stmt)
  }

  // Backfill FTS for existing on-disk DBs created before we introduced automatic sync.
  // This is safe to run repeatedly: it only inserts missing rows.
  backfillItemsFts(db)
}

export function defaultSchemaPath() {
  return path.join(process.cwd(), 'src', 'db', 'schema.sql')
}

function migrateJobsItemIdUnique(db: Db): void {
  if (!tableExists(db, 'jobs')) return
  const indexes = db.prepare(`PRAGMA index_list('jobs')`).all() as Array<{
    name: string
    unique: 0 | 1
  }>

  const hasUniqueItemIdIndex = indexes.some((idx) => {
    if (idx.unique !== 1) return false
    const columns = db.prepare(`PRAGMA index_info(${JSON.stringify(idx.name)})`).all() as Array<{
      name: string
    }>
    return columns.length === 1 && columns[0]?.name === 'item_id'
  })

  if (!hasUniqueItemIdIndex) {
    return
  }

  console.log('[db] Migrating jobs table: removing UNIQUE(item_id)')

  db.transaction(() => {
    db.exec(`DROP TABLE IF EXISTS jobs_new`)
    db.exec(`
      CREATE TABLE jobs_new (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        type TEXT NOT NULL,
        state TEXT NOT NULL,
        attempt INTEGER NOT NULL,
        run_after TEXT NOT NULL,
        locked_by TEXT,
        lock_expires_at TEXT,
        last_error_code TEXT,
        last_error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        started_at TEXT,
        finished_at TEXT
      )
    `)

    db.exec(`
      INSERT INTO jobs_new (
        id, item_id, type, state, attempt, run_after, locked_by, lock_expires_at,
        last_error_code, last_error_message, created_at, updated_at, started_at, finished_at
      )
      SELECT
        id, item_id, type, state, attempt, run_after, locked_by, lock_expires_at,
        last_error_code, last_error_message, created_at, updated_at, started_at, finished_at
      FROM jobs
    `)

    db.exec(`DROP TABLE jobs`)
    db.exec(`ALTER TABLE jobs_new RENAME TO jobs`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_item_id ON jobs(item_id)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_state_run_after ON jobs(state, run_after)`)
  })()
}

function migrateItemsCleanHtmlColumn(db: Db): void {
  const columns = db.prepare(`PRAGMA table_info('items')`).all() as Array<{ name: string }>
  const hasCleanHtml = columns.some((c) => c.name === 'clean_html')
  if (hasCleanHtml) return

  console.log('[db] Migrating items table: adding clean_html column')
  db.exec(`ALTER TABLE items ADD COLUMN clean_html TEXT`)
}

function migrateItemsUserIdColumn(db: Db): void {
  if (!tableExists(db, 'items')) return
  const columns = db.prepare(`PRAGMA table_info('items')`).all() as Array<{ name: string }>
  const hasUserId = columns.some((c) => c.name === 'user_id')
  if (hasUserId) return

  console.log('[db] Migrating items table: adding user_id column')
  db.exec(`ALTER TABLE items ADD COLUMN user_id TEXT`)
}

function migrateTagsUserIdColumn(db: Db): void {
  if (!tableExists(db, 'tags')) return
  const columns = db.prepare(`PRAGMA table_info('tags')`).all() as Array<{ name: string }>
  const hasUserId = columns.some((c) => c.name === 'user_id')
  if (hasUserId) return

  console.log('[db] Migrating tags table: adding user_id column')
  db.exec(`ALTER TABLE tags ADD COLUMN user_id TEXT`)
}

function migrateItemsUrlNormalizedUnique(db: Db): void {
  if (!tableExists(db, 'items')) return

  // New schema: UNIQUE(user_id, url_normalized). Older on-disk DBs used UNIQUE(url_normalized).
  const indexes = db.prepare(`PRAGMA index_list('items')`).all() as Array<{
    name: string
    unique: 0 | 1
  }>

  const hasLegacyUniqueUrlNormalized = indexes.some((idx) => {
    if (idx.unique !== 1) return false
    const columns = db.prepare(`PRAGMA index_info(${JSON.stringify(idx.name)})`).all() as Array<{ name: string }>
    return columns.length === 1 && columns[0]?.name === 'url_normalized'
  })

  if (!hasLegacyUniqueUrlNormalized) return

  console.log('[db] Migrating items table: UNIQUE(url_normalized) -> UNIQUE(user_id, url_normalized)')

  withForeignKeysOff(db, () => {
    db.transaction(() => {
      db.exec(`DROP TABLE IF EXISTS items_new`)
      db.exec(`
        CREATE TABLE items_new (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          url TEXT NOT NULL,
          url_normalized TEXT NOT NULL,
          title TEXT,
          domain TEXT,
          status TEXT NOT NULL,
          error_code TEXT,
          error_message TEXT,
          clean_text TEXT,
          clean_html TEXT,
          summary TEXT,
          summary_source TEXT,
          note TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          processed_at TEXT
        )
      `)

      db.exec(`
        INSERT INTO items_new (
          id, user_id, url, url_normalized, title, domain, status, error_code, error_message,
          clean_text, clean_html, summary, summary_source, note, created_at, updated_at, processed_at
        )
        SELECT
          id, user_id, url, url_normalized, title, domain, status, error_code, error_message,
          clean_text, clean_html, summary, summary_source, note, created_at, updated_at, processed_at
        FROM items
      `)

      db.exec(`DROP TABLE items`)
      db.exec(`ALTER TABLE items_new RENAME TO items`)
    })()
  })
}

function migrateTagsNameUnique(db: Db): void {
  if (!tableExists(db, 'tags')) return

  // New schema: UNIQUE(user_id, name). Older on-disk DBs used UNIQUE(name).
  const indexes = db.prepare(`PRAGMA index_list('tags')`).all() as Array<{
    name: string
    unique: 0 | 1
  }>

  const hasLegacyUniqueName = indexes.some((idx) => {
    if (idx.unique !== 1) return false
    const columns = db.prepare(`PRAGMA index_info(${JSON.stringify(idx.name)})`).all() as Array<{ name: string }>
    return columns.length === 1 && columns[0]?.name === 'name'
  })

  if (!hasLegacyUniqueName) return

  console.log('[db] Migrating tags table: UNIQUE(name) -> UNIQUE(user_id, name)')

  withForeignKeysOff(db, () => {
    db.transaction(() => {
      db.exec(`DROP TABLE IF EXISTS tags_new`)
      db.exec(`
        CREATE TABLE tags_new (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL,
          item_count INTEGER DEFAULT 0
        )
      `)

      db.exec(`
        INSERT INTO tags_new (id, user_id, name, created_at, item_count)
        SELECT id, user_id, name, created_at, item_count FROM tags
      `)

      db.exec(`DROP TABLE tags`)
      db.exec(`ALTER TABLE tags_new RENAME TO tags`)
    })()
  })
}

function withForeignKeysOff(db: Db, fn: () => void): void {
  const fk = db.pragma('foreign_keys', { simple: true }) as number
  if (fk === 1) {
    db.pragma('foreign_keys = OFF')
  }

  try {
    fn()
  } finally {
    if (fk === 1) {
      db.pragma('foreign_keys = ON')
    }
  }
}

function tableExists(db: Db, tableName: string): boolean {
  const row = db
    .prepare(`SELECT 1 as ok FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1`)
    .get(tableName) as { ok: 1 } | undefined
  return !!row
}

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = []

  let buf = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let inLineComment = false
  let inBlockComment = false

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i] ?? ''
    const next = sql[i + 1] ?? ''

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false
        i++
      }
      continue
    }

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false
        buf += ch
      }
      continue
    }

    if (!inSingleQuote && !inDoubleQuote && ch === '/' && next === '*') {
      inBlockComment = true
      i++
      continue
    }

    if (!inSingleQuote && !inDoubleQuote && ch === '-' && next === '-') {
      inLineComment = true
      i++
      continue
    }

    if (!inDoubleQuote && ch === "'") {
      inSingleQuote = !inSingleQuote
      buf += ch
      continue
    }

    if (!inSingleQuote && ch === '"') {
      inDoubleQuote = !inDoubleQuote
      buf += ch
      continue
    }

    if (!inSingleQuote && !inDoubleQuote && ch === ';') {
      const stmt = buf.trim()
      if (stmt.length > 0) {
        statements.push(`${stmt};`)
      }
      buf = ''
      continue
    }

    buf += ch
  }

  const tail = buf.trim()
  if (tail.length > 0) {
    statements.push(tail)
  }

  return statements
}

function isCreateTableStatement(stmt: string): boolean {
  const s = stmt.trimStart().toUpperCase()
  return s.startsWith('CREATE TABLE') || s.startsWith('CREATE VIRTUAL TABLE')
}

function backfillItemsFts(db: Db): void {
  if (!tableExists(db, 'items') || !tableExists(db, 'items_fts')) return

  try {
    const itemsCount = (db.prepare(`SELECT COUNT(*) as c FROM items`).get() as { c: number } | undefined)?.c ?? 0
    if (itemsCount === 0) return

    const ftsCount = (db.prepare(`SELECT COUNT(*) as c FROM items_fts`).get() as { c: number } | undefined)?.c ?? 0
    if (ftsCount === itemsCount) return

    const inserted = db
      .prepare(
        `
        INSERT INTO items_fts (item_id, title, summary, tags, clean_text)
        SELECT
          i.id as item_id,
          COALESCE(i.title, ''),
          COALESCE(i.summary, ''),
          COALESCE(GROUP_CONCAT(t.name, ' '), ''),
          COALESCE(i.clean_text, '')
        FROM items i
        LEFT JOIN item_tags it ON it.item_id = i.id
        LEFT JOIN tags t ON t.id = it.tag_id
        WHERE NOT EXISTS (SELECT 1 FROM items_fts f WHERE f.item_id = i.id)
        GROUP BY i.id
        `
      )
      .run()

    if (inserted.changes > 0) {
      console.log(`[db] Backfilled items_fts rows: ${inserted.changes}`)
    }
  } catch (err) {
    // Ignore if FTS isn't available or schema is in a partial state.
    console.warn('[db] items_fts backfill failed:', err)
  }
}
