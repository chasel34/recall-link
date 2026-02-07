import { z } from 'zod'

export const createBookmarkImportBodySchema = z.object({
  ai_mode: z.enum(['server', 'user']).optional(),
})

export const bookmarkImportStatusSchema = z.enum(['queued', 'processing', 'completed', 'completed_with_errors', 'failed'])

export const bookmarkImportEntryStatusSchema = z.enum([
  'created',
  'duplicate_existing',
  'duplicate_in_file',
  'invalid',
  'queued',
  'fetching',
  'ai_processing',
  'embedding',
  'done',
  'failed',
])

export const bookmarkImportStatsSchema = z.object({
  total_count: z.number().int().nonnegative(),
  created_count: z.number().int().nonnegative(),
  duplicate_existing_count: z.number().int().nonnegative(),
  duplicate_in_file_count: z.number().int().nonnegative(),
  invalid_count: z.number().int().nonnegative(),
  failed_count: z.number().int().nonnegative(),
  done_count: z.number().int().nonnegative(),
})

export const createBookmarkImportResponseSchema = z.object({
  import_id: z.string(),
  status: bookmarkImportStatusSchema,
  stats: bookmarkImportStatsSchema,
})

export const listImportsQuerySchema = z.object({
  status: bookmarkImportStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export const listImportEntriesQuerySchema = z.object({
  status: bookmarkImportEntryStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type CreateBookmarkImportBody = z.infer<typeof createBookmarkImportBodySchema>
export type BookmarkImportStats = z.infer<typeof bookmarkImportStatsSchema>
