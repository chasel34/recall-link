import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getAIConfig } from './ai.config.js'

describe('ai.config', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.GEMINI_BASE_URL
    delete process.env.GEMINI_API_KEY
    delete process.env.GEMINI_MODEL
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('should load config from environment variables', () => {
    process.env.GEMINI_BASE_URL = 'http://test.com/v1beta'
    process.env.GEMINI_API_KEY = 'test-key'
    process.env.GEMINI_MODEL = 'test-model'

    const config = getAIConfig()
    expect(config.baseURL).toBe('http://test.com/v1beta')
    expect(config.apiKey).toBe('test-key')
    expect(config.model).toBe('test-model')
  })

  it('should use defaults from config file', () => {
    process.env.GEMINI_API_KEY = 'test-key'
    const config = getAIConfig()
    expect(config.baseURL).toBe('http://127.0.0.1:8317/v1beta')
    expect(config.model).toBe('gemini-3-flash-preview')
  })

  it('should throw if apiKey is missing', () => {
    process.env.GEMINI_BASE_URL = 'http://test.com/v1beta'
    process.env.GEMINI_MODEL = 'test-model'

    expect(() => getAIConfig()).toThrow('GEMINI_API_KEY')
  })

  it('should prioritize env vars over config file', () => {
    process.env.GEMINI_API_KEY = 'env-key'
    process.env.GEMINI_MODEL = 'env-model'

    const config = getAIConfig()
    expect(config.apiKey).toBe('env-key')
    expect(config.model).toBe('env-model')
    expect(config.baseURL).toBe('http://127.0.0.1:8317/v1beta')
  })
})
