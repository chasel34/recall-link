declare module 'ai' {
  export type CallSettings = {
    maxTokens?: number
  }

  export type GenerateTextInput = {
    model: unknown
    prompt: string | unknown
  } & CallSettings & Record<string, unknown>

  export function generateText(args: GenerateTextInput): Promise<{ text?: string; output?: unknown }>
}
