import fs from 'node:fs'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { applySchema, defaultSchemaPath } from '../db/client.js'
import {
  __resetResolverConfigCacheForTests,
  resolveAIConfig,
  resolveEmbeddingConfig,
  UserEmbeddingConfigMissingError,
  UserModelConfigMissingError,
} from './ai.resolver.js'
import { upsertUserModelConfig } from '../features/settings/ai-settings.db.js'
import { encryptUserModelConfigApiKey } from '../lib/user-model-config-crypto.js'

describe('ai.resolver', () => {
  const originalEnv = { ...process.env }
  const masterKey = 'a'.repeat(64)
  let db: Database.Database

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.USER_MODEL_CONFIG_MASTER_KEY = masterKey
    __resetResolverConfigCacheForTests()
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
      ark_base_url: null,
      ark_embedding_model: null,
      ark_api_key_enc: encryptUserModelConfigApiKey('ark-user-key'),
    })

    const config = resolveAIConfig(db, 'user_test', 'user')
    expect(config.baseURL).toBe('http://fallback.test/v1beta')
    expect(config.model).toBe('fallback-model')
    expect(config.apiKey).toBe('user-key')
  })

  it('throws when user config is missing', () => {
    expect(() => resolveAIConfig(db, 'missing_user', 'user')).toThrow(UserModelConfigMissingError)
  })

  it('resolves user embedding config with fallback baseURL and model', () => {
    process.env.ARK_BASE_URL = 'https://fallback.ark.test/v3'
    process.env.ARK_EMBEDDING_MODEL = 'doubao-embedding-vision-251215'

    db.prepare(
      `
        INSERT INTO users (id, email, password_hash, password_salt, created_at)
        VALUES (?, ?, ?, ?, ?)
      `
    ).run('user_test_ark', 'user-ark@test.local', 'hash', 'salt', new Date().toISOString())

    upsertUserModelConfig(db, {
      user_id: 'user_test_ark',
      mode: 'user',
      provider: 'gemini',
      base_url: null,
      model: null,
      api_key_enc: encryptUserModelConfigApiKey('user-key'),
      ark_base_url: null,
      ark_embedding_model: null,
      ark_api_key_enc: encryptUserModelConfigApiKey('ark-user-key'),
    })

    const config = resolveEmbeddingConfig(db, 'user_test_ark', 'user')
    expect(config.baseURL).toBe('https://fallback.ark.test/v3')
    expect(config.model).toBe('doubao-embedding-vision-251215')
    expect(config.apiKey).toBe('ark-user-key')
  })

  it('resolves server embedding config', () => {
    process.env.ARK_BASE_URL = 'https://server.ark.test/v3'
    process.env.ARK_API_KEY = 'ark-server-key'
    process.env.ARK_EMBEDDING_MODEL = 'doubao-embedding-vision-251215'

    const config = resolveEmbeddingConfig(db, 'ignored_user', 'server')
    expect(config.baseURL).toBe('https://server.ark.test/v3')
    expect(config.model).toBe('doubao-embedding-vision-251215')
    expect(config.apiKey).toBe('ark-server-key')
  })

  it('throws when user embedding config is missing', () => {
    expect(() => resolveEmbeddingConfig(db, 'missing_user', 'user')).toThrow(UserEmbeddingConfigMissingError)
  })

  it('loads default config file once when resolving embedding config repeatedly', () => {
    const readSpy = vi.spyOn(fs, 'readFileSync')
    delete process.env.ARK_BASE_URL
    delete process.env.ARK_EMBEDDING_MODEL

    db.prepare(
      `
        INSERT INTO users (id, email, password_hash, password_salt, created_at)
        VALUES (?, ?, ?, ?, ?)
      `
    ).run('user_cache', 'cache@test.local', 'hash', 'salt', new Date().toISOString())

    upsertUserModelConfig(db, {
      user_id: 'user_cache',
      mode: 'user',
      provider: 'gemini',
      base_url: null,
      model: null,
      api_key_enc: encryptUserModelConfigApiKey('user-key'),
      ark_base_url: null,
      ark_embedding_model: null,
      ark_api_key_enc: encryptUserModelConfigApiKey('ark-user-key'),
    })

    resolveEmbeddingConfig(db, 'user_cache', 'user')
    resolveEmbeddingConfig(db, 'user_cache', 'user')

    expect(readSpy.mock.calls.filter((call) => String(call[0]).endsWith('config/ai.json')).length).toBe(1)
    readSpy.mockRestore()
  })
})
