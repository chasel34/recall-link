import { z } from 'zod'

export const uiStatusSchema = z.enum(['running', 'scheduled', 'stale_lock', 'queued'])

export const listJobsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  type: z.string().optional(),
  status: z.string().optional(),
})

export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>

export const jobInListSchema = z.object({
  id: z.string(),
  item_id: z.string(),
  item_url: z.string(),
  item_title: z.string().nullable(),
  type: z.string(),
  state: z.string(),
  ui_status: uiStatusSchema,
  attempt: z.number(),
  run_after: z.string(),
  locked_by: z.string().nullable(),
  lock_expires_at: z.string().nullable(),
  last_error_code: z.string().nullable(),
  last_error_message: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  started_at: z.string().nullable(),
  finished_at: z.string().nullable(),
  progress_percent: z.number().nullable(),
  progress_stage: z.string().nullable(),
  progress_message: z.string().nullable(),
  progress_updated_at: z.string().nullable(),
})

export type JobInList = z.infer<typeof jobInListSchema>

export const listJobsResponseSchema = z.object({
  jobs: z.array(jobInListSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
})

export type ListJobsResponse = z.infer<typeof listJobsResponseSchema>
