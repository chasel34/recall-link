import { z } from 'zod'

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(5000)
})

export const createChatSessionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
})

export const listChatSessionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export const listChatMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  before: z.string().datetime().optional(),
})
