import fs from 'node:fs'
import path from 'node:path'

export type AIConfig = {
  baseURL: string
  apiKey: string
  model: string
}

export type EmbeddingConfig = {
  baseURL: string
  apiKey: string
  model: string
}

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

export const DEFAULT_ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
export const DEFAULT_ARK_EMBEDDING_MODEL = 'doubao-embedding-vision-251215'

function loadConfigFile(): ConfigFile | null {
  const configPath = path.join(process.cwd(), 'config', 'ai.json')

  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf-8')
    return JSON.parse(content) as ConfigFile
  }

  return null
}

export function getAIConfig(): AIConfig {
  const fileConfig = loadConfigFile()
  const baseURL = process.env.GEMINI_BASE_URL || fileConfig?.gemini?.baseURL || ''
  const apiKey = process.env.GEMINI_API_KEY || ''
  const model = process.env.GEMINI_MODEL || fileConfig?.gemini?.model || ''

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required (set via env var)')
  }

  if (!baseURL) {
    throw new Error('GEMINI_BASE_URL is required (set via env var or config file)')
  }

  if (!model) {
    throw new Error('GEMINI_MODEL is required (set via env var or config file)')
  }

  return { baseURL, apiKey, model }
}

export function getArkEmbeddingConfig(): EmbeddingConfig {
  const fileConfig = loadConfigFile()
  const baseURL = process.env.ARK_BASE_URL || fileConfig?.ark?.baseURL || DEFAULT_ARK_BASE_URL
  const apiKey = process.env.ARK_API_KEY || ''
  const model = process.env.ARK_EMBEDDING_MODEL || fileConfig?.ark?.embeddingModel || DEFAULT_ARK_EMBEDDING_MODEL

  if (!apiKey) {
    throw new Error('ARK_API_KEY is required (set via env var)')
  }

  if (!baseURL) {
    throw new Error('ARK_BASE_URL is required (set via env var or config file)')
  }

  if (!model) {
    throw new Error('ARK_EMBEDDING_MODEL is required (set via env var or config file)')
  }

  return { baseURL, apiKey, model }
}
