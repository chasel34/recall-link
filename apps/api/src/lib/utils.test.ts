import { describe, it, expect } from 'vitest'
import { generateId } from './utils.js'

describe('generateId', () => {
  it('should generate ID with prefix', () => {
    const id = generateId('item')
    expect(id).toMatch(/^item_[A-Za-z0-9_-]{16}$/)
  })

  it('should generate unique IDs', () => {
    const id1 = generateId('job')
    const id2 = generateId('job')
    expect(id1).not.toBe(id2)
  })

  it('should use custom prefix', () => {
    const id = generateId('test')
    expect(id).toMatch(/^test_/)
  })
})
