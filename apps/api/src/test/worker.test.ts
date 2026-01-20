import { describe, expect, it, vi, afterEach } from 'vitest'

const acquireJobMock = vi.fn()
const completeJobMock = vi.fn()
const failJobMock = vi.fn()
const retryJobMock = vi.fn()
const failItemMock = vi.fn()
const processFetchJobMock = vi.fn()
const getDbMock = vi.fn()

vi.mock('../features/jobs/jobs.db.js', () => ({
  acquireJob: acquireJobMock,
  completeJob: completeJobMock,
  failJob: failJobMock,
  retryJob: retryJobMock,
  failItem: failItemMock,
}))

vi.mock('../queue/processors/fetch.processor.js', () => ({
  processFetchJob: processFetchJobMock,
}))

vi.mock('../db/context.js', () => ({
  getDb: getDbMock,
}))

vi.mock('nanoid', () => ({
  nanoid: () => 'testid',
}))

const { startWorker, stopWorker } = await import('../queue/worker.js')

describe('worker', () => {
  afterEach(() => {
    stopWorker()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('does not throw when disabled', () => {
    expect(() => startWorker({ enabled: false })).not.toThrow()
  })

  it('polls for jobs when enabled', async () => {
    vi.useFakeTimers()
    acquireJobMock.mockReturnValue(null)

    startWorker({ enabled: true, pollInterval: 1000 })

    await vi.runAllTicks()
    expect(acquireJobMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1000)
    expect(acquireJobMock).toHaveBeenCalledTimes(2)
  })
})
