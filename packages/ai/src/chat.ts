import { streamText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { AIConfig } from './tagging.js'

export type ChatSource = {
  item_id: string
  url: string
  title: string | null
  snippet?: string | null
}

export type ChatHistoryMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function streamChatAnswer(
  input: {
    question: string
    history: ChatHistoryMessage[]
    sources: ChatSource[]
    signal?: AbortSignal
  },
  config: AIConfig
): Promise<AsyncIterable<string>> {
  const google = createGoogleGenerativeAI({ baseURL: config.baseURL, apiKey: config.apiKey })

  const numberedSources = input.sources
    .map((s, idx) => {
      const n = idx + 1
      const title = s.title ?? 'Untitled'
      return [
        `[${n}] ${title}`,
        `URL: ${s.url}`,
        `ItemID: ${s.item_id}`,
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
    `- 如果 Sources 为空或不足以回答，请明确说明“你的知识库中暂时没有相关内容”，且不要输出 <sources> 标签块。\n` +
    `- 输出格式为 Markdown。\n` +
    `- 当引用某条来源时，在句末标注对应编号，例如 [1]。\n` +
    `- 只要使用了提供的 Sources，就必须在回答的正文结束后，添加一个 <sources> 标签块。格式如下：\n` +
    `\n<sources>\n` +
    `<source title="..." url="..." item_id="..." />\n` +
    `</sources>\n` +
    `- <source> 标签中的 title, url, item_id 必须从 Sources 中提取，严禁伪造。\n` +
    `- <source> 列表的顺序必须与提供的 Sources 列表顺序一致。\n`

  const userPrompt =
    `Question:\n${input.question}\n\n` + `Sources:\n${numberedSources || '(none)'}\n`

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
