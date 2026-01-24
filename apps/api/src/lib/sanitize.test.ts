import { describe, expect, it } from 'vitest'
import { sanitizeReadabilityHtml } from './sanitize.js'

describe('sanitizeReadabilityHtml', () => {
  it('drops scripts/images, strips event handlers/styles, and normalizes links', () => {
    const html = [
      '<div>',
      '  <h1 onclick="alert(1)">Hello</h1>',
      '  <p style="color:red">Para <strong data-x="1">bold</strong></p>',
      '  <img src="/x.png" alt="x" />',
      '  <script>alert(1)</script>',
      '  <a href="/rel">rel</a>',
      '  <a href="javascript:alert(1)">bad</a>',
      '</div>',
    ].join('')

    const out = sanitizeReadabilityHtml(html, 'https://example.com/a/b')

    expect(out).not.toContain('<script')
    expect(out).not.toContain('<img')
    expect(out).not.toContain('onclick=')
    expect(out).not.toContain('style=')
    expect(out).not.toContain('data-x=')

    expect(out).toContain('href="https://example.com/rel"')
    expect(out).toContain('rel="noopener noreferrer"')
    expect(out).toContain('target="_blank"')
    expect(out).not.toContain('href="javascript:')
  })
})
