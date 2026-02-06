import type { Database } from 'better-sqlite3'
import { streamChatAnswer as streamChatAnswerFromAi } from '@recall-link/ai'
import type { ChatHistoryMessage, ChatSource } from '@recall-link/ai'
import { resolveAIConfig } from '../../config/ai.resolver.js'
import { getUserModelConfig } from '../settings/ai-settings.db.js'
export type { ChatHistoryMessage } from '@recall-link/ai'

export async function streamChatAnswer(input: {
  db: Database
  userId: string
  question: string
  history: ChatHistoryMessage[]
  sources: ChatSource[]
  signal?: AbortSignal
}): Promise<AsyncIterable<string>> {
  const { db, userId, ...payload } = input
  const mode = getUserModelConfig(db, userId)?.mode ?? 'server'
  const config = resolveAIConfig(db, userId, mode)
  return streamChatAnswerFromAi(payload, config)
}
