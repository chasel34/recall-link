import { generateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'
import { getAIConfig } from '../config/ai.config.js'

const tagsAndSummarySchema = z.object({
  tags: z.array(z.string()).min(3).max(5),
  summary: z.string().max(500),
})

const tagMergeSchema = z.object({
  tags: z.array(z.string()).min(3).max(5),
})

export async function generateTagsAndSummary(text: string): Promise<{
  tags: string[]
  summary: string
}> {
  const config = getAIConfig()
  const google = createGoogleGenerativeAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  })

  const result = await generateObject({
    model: google(config.model),
    schema: tagsAndSummarySchema,
    prompt: `
请分析以下文章内容，生成标签和摘要。

要求：
1. 标签：3-5个，每个2-6字，使用简体中文
   - 包含主题类（如：React、经济学）
   - 包含类型类（如：教程、长文、工具页）
   - 包含领域类（如：前端、投资、历史）

2. 摘要：150字内，简体中文
   - 清晰说明文章主要内容
   - 面向未来的自己，帮助回忆
   - 包含2-3个关键信息点

文章内容：
${text}
`,
  })

  return result.object
}

export async function mergeTagsWithExisting(
  newTags: string[],
  existingTags: string[]
): Promise<string[]> {
  if (existingTags.length === 0) {
    return newTags
  }

  const config = getAIConfig()
  const google = createGoogleGenerativeAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  })

  const result = await generateObject({
    model: google(config.model),
    schema: tagMergeSchema,
    prompt: `
你是一个标签合并助手。用户生成了新标签，需要与已有标签进行语义对比和合并。

规则：
1. 如果新标签与已有标签语义相近，使用已有标签
2. 如果新标签是全新的，保留新标签
3. 优先保持已有标签的一致性

已有标签：
${existingTags.join(', ')}

新生成标签：
${newTags.join(', ')}

请返回合并后的标签列表（3-5个）。
`,
  })

  return result.object.tags
}
