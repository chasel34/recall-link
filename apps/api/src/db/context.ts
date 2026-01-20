import type { Database } from 'better-sqlite3'
import { openDb, applySchema, defaultSchemaPath } from './client.js'
import path from 'node:path'
import fs from 'node:fs'

let dbInstance: Database | null = null

export function getDb(): Database {
  if (!dbInstance) {
    const dbPath = path.join(process.cwd(), 'data', 'recall.db')

    const dataDir = path.dirname(dbPath)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
      console.log(`[db] Created directory: ${dataDir}`)
    }

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
