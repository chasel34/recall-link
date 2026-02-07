import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { AIConfig } from './tagging.js'

export async function testGeminiConfig(config: AIConfig): Promise<void> {
  const baseURL = config.baseURL.trim().length > 0 ? config.baseURL : undefined
  const google = createGoogleGenerativeAI({
    apiKey: config.apiKey,
    baseURL,
  })

  await generateText({
    model: google(config.model),
    prompt: 'Test',
  })
}
