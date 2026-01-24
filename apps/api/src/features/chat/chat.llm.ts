import { streamText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { getAIConfig } from '../../config/ai.config.js'
import type { ChatSource } from './chat.retrieval.js'

export type ChatHistoryMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function streamChatAnswer(input: {
  question: string
  history: ChatHistoryMessage[]
  sources: ChatSource[]
  signal?: AbortSignal
}): Promise<AsyncIterable<string>> {
  const config = getAIConfig()
  const google = createGoogleGenerativeAI({ baseURL: config.baseURL, apiKey: config.apiKey })

  const numberedSources = input.sources
    .map((s, idx) => {
      const n = idx + 1
      const title = s.title ?? 'Untitled'
      return [
        `[${n}] ${title}`,
        `URL: ${s.url}`,
        s.snippet ? `Snippet: ${s.snippet}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')

  const system =
    `你是用户个人知识库（书签/网页内容）的助手。\n` +
    `回答要求：\n` +
    `- 默认只使用提供的 Sources 来回答，不要编造来源。\n` +
    `- 如果 Sources 为空或不足以回答，请明确说明“你的知识库中暂时没有相关内容”。\n` +
    `- 输出使用 Markdown。\n` +
    `- 当引用某条来源时，在句末标注对应编号，例如 [1]。\n`

  const userPrompt =
    `Question:\n${input.question}\n\n` +
    `Sources:\n${numberedSources || '(none)'}\n`

  const result = streamText({
    model: google(config.model),
    messages: [
      { role: 'system', content: system },
      ...input.history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userPrompt },
    ],
    abortSignal: input.signal,
  })

  return result.textStream
}
