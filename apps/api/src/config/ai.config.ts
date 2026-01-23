import fs from 'node:fs'
import path from 'node:path'

export type AIConfig = {
  baseURL: string
  apiKey: string
  model: string
}

type ConfigFile = {
  provider: string
  gemini: {
    baseURL: string
    model: string
  }
}

export function getAIConfig(): AIConfig {
  const configPath = path.join(process.cwd(), 'config', 'ai.json')
  let fileConfig: ConfigFile | null = null

  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf-8')
    fileConfig = JSON.parse(content) as ConfigFile
  }

  const baseURL = process.env.GEMINI_BASE_URL || fileConfig?.gemini.baseURL || ''
  const apiKey = process.env.GEMINI_API_KEY || ''
  const model = process.env.GEMINI_MODEL || fileConfig?.gemini.model || ''

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
