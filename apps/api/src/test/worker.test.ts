import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'

const acquireJobMock = vi.fn()
const completeJobMock = vi.fn()
const failJobMock = vi.fn()
const retryJobMock = vi.fn()
const processFetchJobMock = vi.fn()
const processAIJobMock = vi.fn()
const processEmbedJobMock = vi.fn()
const failItemMock = vi.fn()
const failBookmarkImportEntryByItemIdMock = vi.fn()
const getDbMock = vi.fn()

vi.mock('@recall-link/jobs', async () => {
  const actual = await vi.importActual<typeof import('@recall-link/jobs')>('@recall-link/jobs')
  return {
    ...actual,
    acquireJob: acquireJobMock,
    completeJob: completeJobMock,
    failJob: failJobMock,
    retryJob: retryJobMock,
  }
})

vi.mock('../queue/processors/fetch.processor.js', () => ({
  processFetchJob: processFetchJobMock,
}))

vi.mock('../queue/processors/ai.processor.js', () => ({
  processAIJob: processAIJobMock,
  shouldRetryAIError: () => false,
}))

vi.mock('../queue/processors/embed.processor.js', () => ({
  processEmbedJob: processEmbedJobMock,
  shouldRetryEmbedError: () => false,
}))

vi.mock('../features/jobs/jobs.db.js', () => ({
  failItem: failItemMock,
}))

vi.mock('../features/imports/imports.db.js', () => ({
  failBookmarkImportEntryByItemId: failBookmarkImportEntryByItemIdMock,
}))

vi.mock('../db/context.js', () => ({
  getDb: getDbMock,
}))

vi.mock('nanoid', () => ({
  nanoid: () => 'testid',
}))

const { startWorker, stopWorker } = await import('../queue/worker.js')

describe('worker', () => {
  beforeEach(() => {
    getDbMock.mockReturnValue({})
  })

  afterEach(() => {
    stopWorker()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('does not throw when disabled', () => {
    expect(() => startWorker({ enabled: false })).not.toThrow()
  })

  it('polls for jobs when enabled', () => {
    vi.useFakeTimers()
    acquireJobMock.mockReturnValue(null)

    startWorker({ enabled: true, pollInterval: 1000 })

    void vi.runAllTicks()
    expect(acquireJobMock).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1000)
    expect(acquireJobMock).toHaveBeenCalledTimes(2)
  })

  it('marks embed permanent failures on import entry only', async () => {
    vi.useFakeTimers()
    const now = new Date().toISOString()
    acquireJobMock
      .mockReturnValueOnce({
        id: 'job_embed_1',
        item_id: 'item_1',
        type: 'embed_process',
        state: 'pending',
        attempt: 0,
        run_after: now,
        locked_by: null,
        lock_expires_at: null,
        last_error_code: null,
        last_error_message: null,
        created_at: now,
        updated_at: now,
        started_at: null,
        finished_at: null,
      })
      .mockReturnValue(null)
    processEmbedJobMock.mockRejectedValue(new Error('embed failure'))

    startWorker({ enabled: true, pollInterval: 1000 })
    await vi.runOnlyPendingTimersAsync()

    expect(failJobMock).toHaveBeenCalledWith({}, 'job_embed_1', 'embed failure')
    expect(failBookmarkImportEntryByItemIdMock).toHaveBeenCalledWith({}, {
      itemId: 'item_1',
      errorCode: 'EMBEDDING_FAILED',
      errorMessage: 'embed failure',
    })
    expect(failItemMock).not.toHaveBeenCalled()
  })
})
