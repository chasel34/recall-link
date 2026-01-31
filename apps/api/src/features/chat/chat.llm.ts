import { streamChatAnswer as streamChatAnswerFromAi } from '@recall-link/ai'
import type { ChatHistoryMessage, ChatSource } from '@recall-link/ai'
import { getAIConfig } from '../../config/ai.config.js'
export type { ChatHistoryMessage } from '@recall-link/ai'

export async function streamChatAnswer(input: {
  question: string
  history: ChatHistoryMessage[]
  sources: ChatSource[]
  signal?: AbortSignal
}): Promise<AsyncIterable<string>> {
  const config = getAIConfig()
  return streamChatAnswerFromAi(input, config)
}
