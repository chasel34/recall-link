import { describe, expect, it } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { applySchema, openDb, defaultSchemaPath } from '../db/client.js'
import { getDb, closeDb } from '../db/context.js'

describe('db schema', () => {
  it('applies schema', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'recall-db-'))
    const dbPath = path.join(dir, 'test.sqlite')

    const db = openDb(dbPath)
    applySchema(db, defaultSchemaPath())

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
    expect(tables.length).toBeGreaterThan(0)
    db.close()
  })

  it('creates data directory on demand', () => {
    const originalCwd = process.cwd()
    const schemaPath = defaultSchemaPath()
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recall-db-context-'))
    const dataDir = path.join(tempDir, 'data')
    const tempSchemaDir = path.join(tempDir, 'src', 'db')

    fs.mkdirSync(tempSchemaDir, { recursive: true })
    fs.copyFileSync(schemaPath, path.join(tempSchemaDir, 'schema.sql'))

    process.chdir(tempDir)

    expect(fs.existsSync(dataDir)).toBe(false)

    const db = getDb()
    expect(fs.existsSync(dataDir)).toBe(true)

    db.close()
    closeDb()
    process.chdir(originalCwd)
  })

  it('migrates items table to add clean_html column when missing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'recall-db-migrate-'))
    const schemaPath = path.join(dir, 'schema.sql')

    // Simulate an older schema without the clean_html column.
    fs.writeFileSync(
      schemaPath,
      [
        'CREATE TABLE IF NOT EXISTS items (',
        '  id TEXT PRIMARY KEY,',
        '  url TEXT NOT NULL,',
        '  url_normalized TEXT NOT NULL UNIQUE,',
        '  title TEXT,',
        '  domain TEXT,',
        '  status TEXT NOT NULL,',
        '  error_code TEXT,',
        '  error_message TEXT,',
        '  clean_text TEXT,',
        '  summary TEXT,',
        '  summary_source TEXT,',
        '  note TEXT,',
        '  created_at TEXT NOT NULL,',
        '  updated_at TEXT NOT NULL,',
        '  processed_at TEXT',
        ');',
      ].join('\n'),
      'utf8'
    )

    const db = openDb(path.join(dir, 'test.sqlite'))
    applySchema(db, schemaPath)

    const columns = db.prepare("PRAGMA table_info('items')").all() as Array<{ name: string }>
    expect(columns.some((c) => c.name === 'clean_html')).toBe(true)
    db.close()
  })
})
