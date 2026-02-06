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

export const aiSettingsSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('server'),
    provider: z.literal('gemini'),
    gemini: geminiOptionalSchema.optional(),
  }),
  z.object({
    mode: z.literal('user'),
    provider: z.literal('gemini'),
    gemini: geminiUserSchema,
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
})
