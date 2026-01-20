import { z } from 'zod'

export const createItemSchema = z.object({
  url: z.string().url()
})

export const patchItemSchema = z.object({
  summary: z.string().min(1).max(5000).optional(),
  tags: z.array(z.string().min(1).max(64)).max(50).optional(),
  note: z.string().max(10000).optional()
})

export const listItemsQuerySchema = z.object({
  status: z.enum(['pending', 'completed', 'failed']).optional(),
  domain: z.string().min(1).optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'domain']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
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
