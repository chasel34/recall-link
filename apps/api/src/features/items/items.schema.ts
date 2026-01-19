import { z } from 'zod'

export const createItemSchema = z.object({
  url: z.string().url()
})

export const patchItemSchema = z.object({
  summary: z.string().min(1).max(5000).optional(),
  tags: z.array(z.string().min(1).max(64)).max(50).optional(),
  note: z.string().max(10000).optional()
})

export const itemResponseSchema = z.object({
  id: z.string(),
  url: z.string(),
  domain: z.string(),
  status: z.string(),
  created_at: z.string(),
})

export const duplicateErrorSchema = z.object({
  error: z.literal('DUPLICATE_URL'),
  message: z.string(),
  existing_item_id: z.string(),
})
