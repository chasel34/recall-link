import { nanoid } from 'nanoid'
import { getDb } from '../db/context.js'
import { acquireJob, completeJob, createWorker, failJob, retryJob, type Job } from '@recall-link/jobs'
import { failItem } from '../features/jobs/jobs.db.js'
import { processFetchJob } from './processors/fetch.processor.js'
import { processAIJob, shouldRetryAIError } from './processors/ai.processor.js'
import { logger } from '../lib/logger.js'
import { publishItemUpdated } from '../features/events/events.bus.js'

const POLL_INTERVAL_MS = 5000

type WorkerConfig = {
  enabled: boolean
  pollInterval?: number
}

let workerController: ReturnType<typeof createWorker> | null = null
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

  workerController = createWorker({
    workerId,
    pollIntervalMs: pollInterval,
    acquireJob: (id) => acquireJob(getDb(), id),
    completeJob: (jobId) => completeJob(getDb(), jobId),
    retryJob: (jobId, data) => retryJob(getDb(), jobId, data),
    failJob: (jobId, errorMessage) => failJob(getDb(), jobId, errorMessage),
    handlers: {
      fetch: (job: Job) => processFetchJob(getDb(), job),
      ai_process: (job: Job) => processAIJob(getDb(), job),
    },
    shouldRetry: (job: Job, error) => {
      if (job.type === 'ai_process') {
        return shouldRetryAIError(error)
      }
      return true
    },
    onPermanentFailure: (job: Job, error) => {
      if (job.type === 'fetch' || job.type === 'ai_process') {
        const db = getDb()
        failItem(db, job.item_id, error.message)
        publishItemUpdated(db, job.item_id, job.type === 'ai_process' ? 'ai' : 'fetch')
      }
    },
    logger,
  })

  workerController.start()
}

/**
 * Stop the worker
 */
export function stopWorker(): void {
  if (workerController) {
    workerController.stop()
    workerController = null
    logger.info({ workerId }, 'Worker stopped')
    workerId = null
  }
}
