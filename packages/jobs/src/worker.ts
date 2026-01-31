export type JobLike = {
  id: string
  type: string
  attempt: number
}

export type RetrySchedule = {
  runAfter: string
  delayMinutes: number
  isRateLimit: boolean
}

export type RetryScheduleOptions = {
  attempt: number
  isRateLimit?: boolean
  baseDelayMinutes?: number
  rateLimitBaseDelayMinutes?: number
  now?: number
}

export type RetryJobInput = {
  attempt: number
  run_after: string
  error_message: string
}

export type WorkerLogger = {
  info: (data: Record<string, unknown>, message?: string) => void
  warn: (data: Record<string, unknown>, message?: string) => void
  error: (data: Record<string, unknown>, message?: string) => void
}

export type WorkerHandlers<TJob extends JobLike> = Record<string, (job: TJob) => Promise<void>>

export type WorkerConfig<TJob extends JobLike> = {
  workerId: string
  pollIntervalMs?: number
  maxAttempts?: number
  acquireJob: (workerId: string) => TJob | null | Promise<TJob | null>
  completeJob: (jobId: string) => void | Promise<void>
  retryJob: (jobId: string, data: RetryJobInput) => void | Promise<void>
  failJob: (jobId: string, errorMessage: string) => void | Promise<void>
  handlers: WorkerHandlers<TJob>
  shouldRetry?: (job: TJob, error: Error) => boolean
  isRateLimitError?: (error: Error) => boolean
  onPermanentFailure?: (job: TJob, error: Error) => void | Promise<void>
  onRetryScheduled?: (job: TJob, schedule: RetrySchedule) => void | Promise<void>
  logger?: WorkerLogger
}

export type WorkerController = {
  start: () => void
  stop: () => void
}

const DEFAULT_POLL_INTERVAL_MS = 5000
const DEFAULT_MAX_ATTEMPTS = 3

export function getRetrySchedule(options: RetryScheduleOptions): RetrySchedule {
  const isRateLimit = options.isRateLimit ?? false
  const baseDelayMinutes = options.baseDelayMinutes ?? 2
  const rateLimitBaseDelayMinutes = options.rateLimitBaseDelayMinutes ?? 5
  const delayMinutes = (isRateLimit ? rateLimitBaseDelayMinutes : baseDelayMinutes) *
    Math.pow(2, options.attempt)
  const now = options.now ?? Date.now()
  const runAfter = new Date(now + delayMinutes * 60 * 1000).toISOString()

  return {
    runAfter,
    delayMinutes,
    isRateLimit,
  }
}

export function createWorker<TJob extends JobLike>(config: WorkerConfig<TJob>): WorkerController {
  let workerInterval: NodeJS.Timeout | null = null

  const logger = config.logger
  const pollInterval = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
  const maxAttempts = config.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  const shouldRetry = config.shouldRetry ?? (() => true)
  const isRateLimitError = config.isRateLimitError ?? ((error: Error) => (error as any).status === 429)

  const processNextJob = async (): Promise<void> => {
    const job = await config.acquireJob(config.workerId)

    if (!job) {
      return
    }

    logger?.info({ jobId: job.id, type: job.type, attempt: job.attempt }, 'Acquired job')

    try {
      const handler = config.handlers[job.type]
      if (!handler) {
        throw new Error(`Unknown job type: ${job.type}`)
      }

      await handler(job)
      await config.completeJob(job.id)
      logger?.info({ jobId: job.id }, 'Completed job')
    } catch (error) {
      const jobError = error instanceof Error ? error : new Error(String(error))
      logger?.error(
        {
          jobId: job.id,
          error: jobError.message,
          stack: jobError.stack,
        },
        'Job failed'
      )

      const nextAttempt = job.attempt + 1
      const canRetry = shouldRetry(job, jobError) && nextAttempt < maxAttempts

      if (canRetry) {
        const schedule = getRetrySchedule({
          attempt: nextAttempt,
          isRateLimit: isRateLimitError(jobError),
        })

        logger?.info(
          {
            jobId: job.id,
            nextAttempt,
            delayMinutes: schedule.delayMinutes,
            isRateLimit: schedule.isRateLimit,
          },
          'Scheduling retry'
        )

        await config.retryJob(job.id, {
          attempt: nextAttempt,
          run_after: schedule.runAfter,
          error_message: jobError.message,
        })

        await config.onRetryScheduled?.(job, schedule)
      } else {
        logger?.warn(
          { jobId: job.id, type: job.type, attempts: nextAttempt },
          'Job failed permanently'
        )
        await config.failJob(job.id, jobError.message)
        await config.onPermanentFailure?.(job, jobError)
      }
    }
  }

  const start = (): void => {
    if (workerInterval) {
      return
    }

    workerInterval = setInterval(() => {
      processNextJob().catch((error) => {
        const jobError = error instanceof Error ? error : new Error(String(error))
        logger?.error(
          { error: jobError.message, stack: jobError.stack },
          'Error in processNextJob'
        )
      })
    }, pollInterval)

    processNextJob().catch((error) => {
      const jobError = error instanceof Error ? error : new Error(String(error))
      logger?.error(
        { error: jobError.message, stack: jobError.stack },
        'Error in initial processNextJob'
      )
    })
  }

  const stop = (): void => {
    if (!workerInterval) {
      return
    }

    clearInterval(workerInterval)
    workerInterval = null
  }

  return {
    start,
    stop,
  }
}
