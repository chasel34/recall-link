export type AiJobInput = {
  itemId: string;
};

export type AiJobResult = {
  summary: string;
  tags: string[];
};

export const createAiJobRequest = (input: AiJobInput): AiJobInput => input;

export { streamChatAnswer } from './chat.js'
export type { ChatHistoryMessage, ChatSource } from './chat.js'
export { generateTagsAndSummary, mergeTagsWithExisting } from './tagging.js'
export type { AIConfig } from './tagging.js'
