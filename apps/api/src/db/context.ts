import type { Database } from 'better-sqlite3'
import { openDb, applySchema, defaultSchemaPath } from './client.js'
import path from 'node:path'

let dbInstance: Database | null = null

export function getDb(): Database {
  if (!dbInstance) {
    const dbPath = path.join(process.cwd(), 'data', 'recall.db')
    dbInstance = openDb(dbPath)
    applySchema(dbInstance, defaultSchemaPath())
  }
  return dbInstance
}

export function setDb(db: Database): void {
  dbInstance = db
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
