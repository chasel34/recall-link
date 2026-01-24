import type { Database } from 'better-sqlite3'
import { nanoid } from 'nanoid'
import { getDb } from '../db/context.js'
import type { Job } from '../features/jobs/jobs.db.js'
import { acquireJob, completeJob, failJob, retryJob, failItem } from '../features/jobs/jobs.db.js'
import { processFetchJob } from './processors/fetch.processor.js'
import { processAIJob, shouldRetryAIError } from './processors/ai.processor.js'
import { logger } from '../lib/logger.js'
import { publishItemUpdated } from '../features/events/events.bus.js'

const POLL_INTERVAL_MS = 5000
const MAX_ATTEMPTS = 3

type WorkerConfig = {
  enabled: boolean
  pollInterval?: number
}

let workerInterval: NodeJS.Timeout | null = null
let workerId: string | null = null

/**
 * Start the worker
 */
export function startWorker(config: WorkerConfig): void {
  if (!config.enabled) {
    logger.info('Worker disabled')
    return
  }

  workerId = `worker_${nanoid(8)}`
  const pollInterval = config.pollInterval ?? POLL_INTERVAL_MS

  logger.info({ workerId, pollInterval }, 'Starting worker')

  workerInterval = setInterval(() => {
    processNextJob().catch((error) => {
      logger.error({ error: error.message, stack: error.stack }, 'Error in processNextJob')
    })
  }, pollInterval)

  processNextJob().catch((error) => {
    logger.error({ error: error.message, stack: error.stack }, 'Error in initial processNextJob')
  })
}

/**
 * Stop the worker
 */
export function stopWorker(): void {
  if (workerInterval) {
    clearInterval(workerInterval)
    workerInterval = null
    logger.info({ workerId }, 'Worker stopped')
    workerId = null
  }
}

/**
 * Process next available job
 */
async function processNextJob(): Promise<void> {
  if (!workerId) {
    return
  }

  const db = getDb()
  const job = acquireJob(db, workerId)

  if (!job) {
    return
  }

  logger.info({ jobId: job.id, type: job.type, attempt: job.attempt }, 'Acquired job')

  try {
    await processJob(db, job)

    completeJob(db, job.id)
    logger.info({ jobId: job.id }, 'Completed job')
  } catch (error) {
    logger.error(
      {
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Job failed'
    )
    await handleJobFailure(db, job, error as Error)
  }
}

/**
 * Process job by type
 */
async function processJob(db: Database, job: Job): Promise<void> {
  switch (job.type) {
    case 'fetch':
      await processFetchJob(db, job)
      break
    case 'ai_process':
      await processAIJob(db, job)
      break
    default:
      throw new Error(`Unknown job type: ${job.type}`)
  }
}

/**
 * Handle job failure with retry logic
 */
async function handleJobFailure(db: Database, job: Job, error: Error): Promise<void> {
  const nextAttempt = job.attempt + 1
  const maxAttempts = 3

  let shouldRetry = false
  if (job.type === 'ai_process') {
    shouldRetry = shouldRetryAIError(error)
  } else {
    shouldRetry = true
  }

  if (shouldRetry && nextAttempt < maxAttempts) {
    const isRateLimit = (error as any).status === 429
    const baseDelay = isRateLimit ? 5 : 2
    const delayMinutes = baseDelay * Math.pow(2, nextAttempt)
    const runAfter = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString()

    logger.info(
      { jobId: job.id, nextAttempt, delayMinutes, isRateLimit },
      'Scheduling retry'
    )

    retryJob(db, job.id, {
      attempt: nextAttempt,
      run_after: runAfter,
      error_message: error.message,
    })
  } else {
    logger.warn({ jobId: job.id, type: job.type, attempts: nextAttempt }, 'Job failed permanently')
    failJob(db, job.id, error.message)
    if (job.type === 'fetch' || job.type === 'ai_process') {
      failItem(db, job.item_id, error.message)
      publishItemUpdated(db, job.item_id, job.type === 'ai_process' ? 'ai' : 'fetch')
    }
  }
}
