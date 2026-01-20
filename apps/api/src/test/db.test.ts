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
})
