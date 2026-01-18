import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'

export const eventsApp = new Hono()

eventsApp.get('/', (c) => {
  return streamSSE(c, async (stream) => {
    // v1 skeleton: send a heartbeat then close
    await stream.writeSSE({ event: 'ping', data: JSON.stringify({ ok: true }) })
  })
})
