import { describe, expect, it } from 'vitest'
import { startWorker } from '../queue/worker.js'

describe('worker', () => {
  it('does not throw when disabled', () => {
    expect(() => startWorker({ enabled: false })).not.toThrow()
  })
})
