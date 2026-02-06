import type { Database } from 'better-sqlite3'
import { generateId } from '../../lib/utils.js'

export type UserModelConfig = {
  id: string
  user_id: string
  mode: 'server' | 'user'
  provider: 'gemini'
  base_url: string | null
  model: string | null
  api_key_enc: string | null
  created_at: string
  updated_at: string
}

export function getUserModelConfig(db: Database, userId: string): UserModelConfig | null {
  return (
    db
      .prepare(
        `
          SELECT id, user_id, mode, provider, base_url, model, api_key_enc, created_at, updated_at
          FROM user_model_configs
          WHERE user_id = ?
        `
      )
      .get(userId) as UserModelConfig | undefined
  ) ?? null
}

export function upsertUserModelConfig(
  db: Database,
  input: {
    user_id: string
    mode: 'server' | 'user'
    provider: 'gemini'
    base_url: string | null
    model: string | null
    api_key_enc: string | null
    now?: string
  }
): UserModelConfig {
  const now = input.now ?? new Date().toISOString()
  const id = generateId('umc')

  db.prepare(
    `
      INSERT INTO user_model_configs (
        id,
        user_id,
        mode,
        provider,
        base_url,
        model,
        api_key_enc,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        mode = excluded.mode,
        provider = excluded.provider,
        base_url = excluded.base_url,
        model = excluded.model,
        api_key_enc = excluded.api_key_enc,
        updated_at = excluded.updated_at
    `
  ).run(
    id,
    input.user_id,
    input.mode,
    input.provider,
    input.base_url,
    input.model,
    input.api_key_enc,
    now,
    now
  )

  const record = getUserModelConfig(db, input.user_id)
  if (!record) {
    throw new Error('Failed to load user model config after upsert')
  }

  return record
}

export function deleteUserModelConfig(db: Database, userId: string): void {
  db.prepare('DELETE FROM user_model_configs WHERE user_id = ?').run(userId)
}
