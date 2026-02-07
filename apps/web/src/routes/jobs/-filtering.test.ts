import { describe, expect, it } from 'vitest'
import { JOB_TYPE_LABEL_MAP } from './index'

describe('Jobs UI Filtering', () => {
  it('has correct labels for job types', () => {
    expect(JOB_TYPE_LABEL_MAP).toEqual({
      fetch: '抓取',
      ai_process: 'AI分析',
      embed_process: '向量化',
    })
  })
})
