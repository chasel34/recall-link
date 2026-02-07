import { z } from 'zod'

const geminiOptionalSchema = z.object({
  model: z.string().optional(),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
})

const geminiUserSchema = z.object({
  model: z.string().min(1),
  baseUrl: z.string().optional(),
  apiKey: z.string().min(1).optional(),
})

const arkOptionalSchema = z.object({
  embeddingModel: z.string().optional(),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
})

const arkUserSchema = z.object({
  embeddingModel: z.string().min(1).optional(),
  baseUrl: z.string().optional(),
  apiKey: z.string().min(1).optional(),
})

export const aiSettingsSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('server'),
    provider: z.literal('gemini'),
    gemini: geminiOptionalSchema.optional(),
    ark: arkOptionalSchema.optional(),
  }),
  z.object({
    mode: z.literal('user'),
    provider: z.literal('gemini'),
    gemini: geminiUserSchema,
    ark: arkUserSchema.optional(),
  }),
])

export const aiSettingsResponseSchema = z.object({
  mode: z.enum(['server', 'user']),
  provider: z.literal('gemini'),
  gemini: z.object({
    model: z.string(),
    baseUrl: z.string(),
    hasApiKey: z.boolean(),
  }),
  ark: z.object({
    embeddingModel: z.string(),
    baseUrl: z.string(),
    hasApiKey: z.boolean(),
  }),
})
