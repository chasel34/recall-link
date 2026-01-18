import { describe, expect, it } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { applySchema, openDb, defaultSchemaPath } from '../db/client.js'

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
})
