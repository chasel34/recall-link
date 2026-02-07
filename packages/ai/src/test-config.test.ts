import { beforeEach, describe, expect, it, vi } from 'vitest'

const { generateTextMock, createGoogleGenerativeAIMock } = vi.hoisted(() => ({
  generateTextMock: vi.fn(),
  createGoogleGenerativeAIMock: vi.fn(),
}))

vi.mock('ai', () => ({
  generateText: generateTextMock,
}))

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: createGoogleGenerativeAIMock,
}))

import { testGeminiConfig } from './test-config.js'

describe('testGeminiConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createGoogleGenerativeAIMock.mockReturnValue(((modelName: string) => ({ modelName })) as any)
  })

  it('uses undefined baseURL when empty', async () => {
    generateTextMock.mockResolvedValue({ text: 'ok' })

    await testGeminiConfig({
      apiKey: 'secret',
      baseURL: '',
      model: 'gemini-1.5-flash',
    })

    expect(createGoogleGenerativeAIMock).toHaveBeenCalledWith({
      apiKey: 'secret',
      baseURL: undefined,
    })
    expect(generateTextMock).toHaveBeenCalled()
  })

  it('keeps explicit baseURL', async () => {
    generateTextMock.mockResolvedValue({ text: 'ok' })

    await testGeminiConfig({
      apiKey: 'secret',
      baseURL: 'https://example.com',
      model: 'gemini-1.5-flash',
    })

    expect(createGoogleGenerativeAIMock).toHaveBeenCalledWith({
      apiKey: 'secret',
      baseURL: 'https://example.com',
    })
  })
})
