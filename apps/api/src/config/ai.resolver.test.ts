import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../db/client.js'
import { resolveAIConfig, UserModelConfigMissingError } from './ai.resolver.js'
import { upsertUserModelConfig } from '../features/settings/ai-settings.db.js'
import { encryptUserModelConfigApiKey } from '../lib/user-model-config-crypto.js'

describe('ai.resolver', () => {
  const originalEnv = { ...process.env }
  const masterKey = 'a'.repeat(64)
  let db: Database.Database

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.USER_MODEL_CONFIG_MASTER_KEY = masterKey
    db = new Database(':memory:')
    applySchema(db, defaultSchemaPath())
  })

  afterEach(() => {
    db.close()
    process.env = { ...originalEnv }
  })

  it('resolves user config with fallback baseURL and model', () => {
    process.env.GEMINI_BASE_URL = 'http://fallback.test/v1beta'
    process.env.GEMINI_MODEL = 'fallback-model'

    db.prepare(
      `
        INSERT INTO users (id, email, password_hash, password_salt, created_at)
        VALUES (?, ?, ?, ?, ?)
      `
    ).run('user_test', 'user@test.local', 'hash', 'salt', new Date().toISOString())

    upsertUserModelConfig(db, {
      user_id: 'user_test',
      mode: 'user',
      provider: 'gemini',
      base_url: null,
      model: null,
      api_key_enc: encryptUserModelConfigApiKey('user-key'),
    })

    const config = resolveAIConfig(db, 'user_test', 'user')
    expect(config.baseURL).toBe('http://fallback.test/v1beta')
    expect(config.model).toBe('fallback-model')
    expect(config.apiKey).toBe('user-key')
  })

  it('throws when user config is missing', () => {
    expect(() => resolveAIConfig(db, 'missing_user', 'user')).toThrow(UserModelConfigMissingError)
  })
})
