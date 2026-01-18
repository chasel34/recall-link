import { describe, expect, it } from 'vitest'
import { startWorker } from '../src/queue/worker'

describe('worker', () => {
  it('does not throw when disabled', () => {
    expect(() => startWorker({ enabled: false })).not.toThrow()
  })
})
