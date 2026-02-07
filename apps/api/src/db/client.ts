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

  migrateJobsProgressColumns(db)
  migrateJobsItemIdUnique(db)
  migrateItemsCleanHtmlColumn(db)
  migrateItemsUserIdColumn(db)
  migrateItemsAiModeColumn(db)
  migrateItemsAiModeValues(db)
  migrateTagsUserIdColumn(db)
  migrateItemsUrlNormalizedUnique(db)
  migrateTagsNameUnique(db)
  migrateUserModelConfigsTable(db)
  migrateUserModelConfigsArkColumns(db)

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

function migrateJobsProgressColumns(db: Db): void {
  if (!tableExists(db, 'jobs')) return
  const columns = db.prepare(`PRAGMA table_info('jobs')`).all() as Array<{ name: string }>

  const addIfMissing = (colName: string, colDef: string) => {
    if (!columns.some((c) => c.name === colName)) {
      console.log(`[db] Migrating jobs table: adding ${colName} column`)
      db.exec(`ALTER TABLE jobs ADD COLUMN ${colName} ${colDef}`)
    }
  }

  addIfMissing('progress_percent', 'INTEGER')
  addIfMissing('progress_stage', 'TEXT')
  addIfMissing('progress_message', 'TEXT')
  addIfMissing('progress_updated_at', 'TEXT')
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
  if (!tableExists(db, 'items')) return
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

function migrateItemsAiModeColumn(db: Db): void {
  if (!tableExists(db, 'items')) return
  const columns = db.prepare(`PRAGMA table_info('items')`).all() as Array<{ name: string }>
  const hasAiMode = columns.some((c) => c.name === 'ai_mode')
  if (hasAiMode) return

  console.log('[db] Migrating items table: adding ai_mode column')
  db.exec(`ALTER TABLE items ADD COLUMN ai_mode TEXT`)
}

function migrateItemsAiModeValues(db: Db): void {
  if (!tableExists(db, 'items')) return
  const columns = db.prepare(`PRAGMA table_info('items')`).all() as Array<{ name: string }>
  const hasAiMode = columns.some((c) => c.name === 'ai_mode')
  if (!hasAiMode) return

  const updateRemote = db.prepare(`UPDATE items SET ai_mode = 'server' WHERE ai_mode = 'remote'`).run()
  const updateLocal = db.prepare(`UPDATE items SET ai_mode = 'user' WHERE ai_mode = 'local'`).run()
  const total = updateRemote.changes + updateLocal.changes

  if (total > 0) {
    console.log(`[db] Migrating items.ai_mode values: ${total} rows updated`)
  }
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

function migrateUserModelConfigsTable(db: Db): void {
  if (tableExists(db, 'user_model_configs')) return

  console.log('[db] Migrating: creating user_model_configs table')
  db.exec(`
    CREATE TABLE user_model_configs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      provider TEXT NOT NULL,
      base_url TEXT,
      model TEXT,
      api_key_enc TEXT,
      ark_base_url TEXT,
      ark_embedding_model TEXT,
      ark_api_key_enc TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_model_configs_user_id ON user_model_configs(user_id)`)
}

function migrateUserModelConfigsArkColumns(db: Db): void {
  if (!tableExists(db, 'user_model_configs')) return
  const columns = db.prepare(`PRAGMA table_info('user_model_configs')`).all() as Array<{ name: string }>

  const addIfMissing = (colName: string, colDef: string) => {
    if (!columns.some((c) => c.name === colName)) {
      console.log(`[db] Migrating user_model_configs table: adding ${colName} column`)
      db.exec(`ALTER TABLE user_model_configs ADD COLUMN ${colName} ${colDef}`)
    }
  }

  addIfMissing('ark_base_url', 'TEXT')
  addIfMissing('ark_embedding_model', 'TEXT')
  addIfMissing('ark_api_key_enc', 'TEXT')
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
