import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateTagsAndSummary, mergeTagsWithExisting } from './ai.service.js'

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}))

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => vi.fn()),
}))

vi.mock('../config/ai.config.js', () => ({
  getAIConfig: vi.fn(() => ({
    baseURL: 'http://test.com/v1beta',
    apiKey: 'test-key',
    model: 'test-model',
  })),
}))

describe('ai.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateTagsAndSummary', () => {
    it('should generate tags and summary', async () => {
      const { generateObject } = await import('ai')
      vi.mocked(generateObject).mockResolvedValue({
        object: {
          tags: ['React', '前端', '教程'],
          summary: '这是一篇关于 React 的教程文章。',
        },
      } as any)

      const result = await generateTagsAndSummary('Test article content...')

      expect(result.tags).toEqual(['React', '前端', '教程'])
      expect(result.summary).toBe('这是一篇关于 React 的教程文章。')
      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: expect.any(Object),
          prompt: expect.stringContaining('请分析以下文章内容'),
        })
      )
    })

    it('should throw error on API failure', async () => {
      const { generateObject } = await import('ai')
      vi.mocked(generateObject).mockRejectedValue(new Error('API error'))

      await expect(generateTagsAndSummary('content')).rejects.toThrow('API error')
    })
  })

  describe('mergeTagsWithExisting', () => {
    it('should return new tags if no existing tags', async () => {
      const result = await mergeTagsWithExisting(['React', 'Vue'], [])
      expect(result).toEqual(['React', 'Vue'])
    })

    it('should merge tags using AI', async () => {
      const { generateObject } = await import('ai')
      vi.mocked(generateObject).mockResolvedValue({
        object: {
          tags: ['React', '前端性能', 'TypeScript'],
        },
      } as any)

      const result = await mergeTagsWithExisting(
        ['react', '前端优化', 'TypeScript'],
        ['React', '前端性能', 'JavaScript']
      )

      expect(result).toEqual(['React', '前端性能', 'TypeScript'])
      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('已有标签'),
        })
      )
    })
  })
})
