import { describe, it, expect } from 'vitest'
import { generateId, normalizeUrl } from './utils.js'

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

describe('normalizeUrl', () => {
  it('should upgrade http to https', () => {
    expect(normalizeUrl('http://example.com')).toBe('https://example.com')
  })

  it('should remove trailing slash', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com')
    expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path')
  })

  it('should lowercase hostname', () => {
    expect(normalizeUrl('https://Example.COM/Path')).toBe('https://example.com/Path')
  })

  it('should remove tracking parameters', () => {
    const url = 'https://example.com/article?id=123&utm_source=twitter&fbclid=xyz'
    expect(normalizeUrl(url)).toBe('https://example.com/article?id=123')
  })

  it('should preserve meaningful parameters', () => {
    const url = 'https://example.com/search?q=test&page=2&v=abc'
    expect(normalizeUrl(url)).toBe('https://example.com/search?q=test&page=2&v=abc')
  })

  it('should handle URLs without query params', () => {
    expect(normalizeUrl('https://example.com/article')).toBe('https://example.com/article')
  })

  it('should remove multiple tracking params', () => {
    const url = 'https://example.com/page?ref=x&gclid=y&_ga=z&id=real'
    expect(normalizeUrl(url)).toBe('https://example.com/page?id=real')
  })
})
