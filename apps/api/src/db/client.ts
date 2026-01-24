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
  db.exec(sql)
  migrateJobsItemIdUnique(db)
  migrateItemsCleanHtmlColumn(db)
}

export function defaultSchemaPath() {
  return path.join(process.cwd(), 'src', 'db', 'schema.sql')
}

function migrateJobsItemIdUnique(db: Db): void {
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
