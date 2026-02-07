import fs from 'node:fs'
import path from 'node:path'
import type { Database } from 'better-sqlite3'
import type { AIConfig, EmbeddingConfig } from './ai.config.js'
import {
  DEFAULT_ARK_BASE_URL,
  DEFAULT_ARK_EMBEDDING_MODEL,
  getAIConfig,
  getArkEmbeddingConfig,
} from './ai.config.js'
import { getUserModelConfig } from '../features/settings/ai-settings.db.js'
import { decryptUserModelConfigApiKey } from '../lib/user-model-config-crypto.js'

type ConfigFile = {
  provider: string
  gemini?: {
    baseURL?: string
    model?: string
  }
  ark?: {
    baseURL?: string
    embeddingModel?: string
  }
}

let cachedConfigFile: ConfigFile | null | undefined

export type AIConfigMode = 'server' | 'user'

export class UserModelConfigMissingError extends Error {
  code = 'USER_MODEL_CONFIG_MISSING' as const
}

export class UserEmbeddingConfigMissingError extends Error {
  code = 'USER_EMBEDDING_CONFIG_MISSING' as const
}

export function isUserModelConfigMissingError(error: unknown): error is UserModelConfigMissingError {
  if (error instanceof UserModelConfigMissingError) return true
  if (!error || typeof error !== 'object') return false
  return 'code' in error && (error as { code?: string }).code === 'USER_MODEL_CONFIG_MISSING'
}

export function isUserEmbeddingConfigMissingError(error: unknown): error is UserEmbeddingConfigMissingError {
  if (error instanceof UserEmbeddingConfigMissingError) return true
  if (!error || typeof error !== 'object') return false
  return 'code' in error && (error as { code?: string }).code === 'USER_EMBEDDING_CONFIG_MISSING'
}

function loadDefaultGeminiConfig(): { baseURL: string; model: string } {
  const fileConfig = loadConfigFile()
  return {
    baseURL: fileConfig?.gemini?.baseURL ?? '',
    model: fileConfig?.gemini?.model ?? '',
  }
}

function loadConfigFile(): ConfigFile | null {
  if (cachedConfigFile !== undefined) {
    return cachedConfigFile
  }

  const configPath = path.join(process.cwd(), 'config', 'ai.json')

  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf-8')
    cachedConfigFile = JSON.parse(content) as ConfigFile
  } else {
    cachedConfigFile = null
  }

  return cachedConfigFile
}

function loadDefaultArkConfig(): { baseURL: string; model: string } {
  const fileConfig = loadConfigFile()

  return {
    baseURL: fileConfig?.ark?.baseURL ?? DEFAULT_ARK_BASE_URL,
    model: fileConfig?.ark?.embeddingModel ?? DEFAULT_ARK_EMBEDDING_MODEL,
  }
}

function pickValue(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return ''
}

function resolveUserAIConfig(db: Database, userId: string): AIConfig {
  const record = getUserModelConfig(db, userId)
  if (!record) {
    throw new UserModelConfigMissingError('User AI config is missing.')
  }

  const apiKeyEnc = record.api_key_enc?.trim()
  if (!apiKeyEnc) {
    throw new UserModelConfigMissingError('User AI API key is missing.')
  }

  let apiKey = ''
  try {
    apiKey = decryptUserModelConfigApiKey(apiKeyEnc).trim()
  } catch (error) {
    throw new UserModelConfigMissingError('User AI API key is invalid.', { cause: error })
  }

  if (!apiKey) {
    throw new UserModelConfigMissingError('User AI API key is missing.')
  }

  const defaults = loadDefaultGeminiConfig()
  const baseURL = pickValue(record.base_url, process.env.GEMINI_BASE_URL, defaults.baseURL)
  const model = pickValue(record.model, process.env.GEMINI_MODEL, defaults.model)

  if (!model) {
    throw new UserModelConfigMissingError('User AI model is missing.')
  }

  return { baseURL, apiKey, model }
}

function resolveUserEmbeddingConfig(db: Database, userId: string): EmbeddingConfig {
  const record = getUserModelConfig(db, userId)
  if (!record) {
    throw new UserEmbeddingConfigMissingError('User embedding config is missing.')
  }

  const apiKeyEnc = record.ark_api_key_enc?.trim()
  if (!apiKeyEnc) {
    throw new UserEmbeddingConfigMissingError('User embedding API key is missing.')
  }

  let apiKey = ''
  try {
    apiKey = decryptUserModelConfigApiKey(apiKeyEnc).trim()
  } catch (error) {
    throw new UserEmbeddingConfigMissingError('User embedding API key is invalid.', { cause: error })
  }

  if (!apiKey) {
    throw new UserEmbeddingConfigMissingError('User embedding API key is missing.')
  }

  const defaults = loadDefaultArkConfig()
  const baseURL = pickValue(record.ark_base_url, process.env.ARK_BASE_URL, defaults.baseURL)
  const model = pickValue(record.ark_embedding_model, process.env.ARK_EMBEDDING_MODEL, defaults.model)

  if (!model) {
    throw new UserEmbeddingConfigMissingError('User embedding model is missing.')
  }

  return { baseURL, apiKey, model }
}

export function resolveAIConfig(db: Database, userId: string, mode: AIConfigMode): AIConfig {
  if (mode === 'server') {
    return getAIConfig()
  }

  return resolveUserAIConfig(db, userId)
}

export function resolveEmbeddingConfig(
  db: Database,
  userId: string,
  mode: AIConfigMode
): EmbeddingConfig {
  if (mode === 'server') {
    return getArkEmbeddingConfig()
  }

  return resolveUserEmbeddingConfig(db, userId)
}

export function __resetResolverConfigCacheForTests(): void {
  cachedConfigFile = undefined
}
