import { describe, expect, it } from 'vitest'
import { app } from '../src/app'

describe('routes', () => {
  it('GET /api/health', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
  })

  it('POST /api/items validates body', async () => {
    const res = await app.request('/api/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'not-a-url' })
    })
    expect(res.status).toBe(400)
  })

  it('GET /api/items/events is SSE', async () => {
    const res = await app.request('/api/items/events')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')?.includes('text/event-stream')).toBe(true)
  })
})
