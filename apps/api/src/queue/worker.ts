import type { Database } from 'better-sqlite3'
import { nanoid } from 'nanoid'
import { getDb } from '../db/context.js'
import type { Job } from '../features/jobs/jobs.db.js'
import { acquireJob, completeJob, failJob, retryJob, failItem } from '../features/jobs/jobs.db.js'
import { processFetchJob } from './processors/fetch.processor.js'

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
    console.log('[worker] disabled')
    return
  }

  workerId = `worker_${nanoid(8)}`
  const pollInterval = config.pollInterval ?? POLL_INTERVAL_MS

  console.log(`[worker] starting ${workerId}`)

  workerInterval = setInterval(() => {
    processNextJob().catch((error) => {
      console.error('[worker] Error in processNextJob:', error)
    })
  }, pollInterval)

  processNextJob().catch((error) => {
    console.error('[worker] Error in initial processNextJob:', error)
  })
}

/**
 * Stop the worker
 */
export function stopWorker(): void {
  if (workerInterval) {
    clearInterval(workerInterval)
    workerInterval = null
    console.log(`[worker] stopped ${workerId}`)
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

  console.log(`[worker] Acquired job ${job.id} (type: ${job.type}, attempt: ${job.attempt})`)

  try {
    await processJob(db, job)

    completeJob(db, job.id)
    console.log(`[worker] Completed job ${job.id}`)
  } catch (error) {
    console.error(`[worker] Job ${job.id} failed:`, error)
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
    default:
      throw new Error(`Unknown job type: ${job.type}`)
  }
}

/**
 * Handle job failure with retry logic
 */
async function handleJobFailure(db: Database, job: Job, error: Error): Promise<void> {
  const nextAttempt = job.attempt + 1

  if (nextAttempt >= MAX_ATTEMPTS) {
    console.log(`[worker] Job ${job.id} failed after ${nextAttempt} attempts`)
    failJob(db, job.id, error.message)
    failItem(db, job.item_id, error.message)
  } else {
    const delayMinutes = Math.pow(2, nextAttempt)
    const runAfter = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString()

    console.log(`[worker] Scheduling retry ${nextAttempt} for job ${job.id} after ${delayMinutes} min`)

    retryJob(db, job.id, {
      attempt: nextAttempt,
      run_after: runAfter,
      error_message: error.message,
    })
  }
}
