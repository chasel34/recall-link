import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { subscribeEvents, type AnyEvent } from './events.bus.js'

export const eventsApp = new Hono()

eventsApp.get('/', (c) => {
  return streamSSE(c, async (stream) => {
    const queue: AnyEvent[] = []
    let notify: (() => void) | null = null
    let closed = false

    const waitForEvent = () =>
      new Promise<void>((resolve) => {
        notify = resolve
      })

    const unsubscribe = subscribeEvents((event) => {
      queue.push(event)
      if (notify) {
        notify()
        notify = null
      }
    })

    const close = () => {
      if (closed) return
      closed = true
      unsubscribe()
      if (notify) {
        notify()
        notify = null
      }
    }

    c.req.raw.signal.addEventListener('abort', close, { once: true })

    await stream.writeSSE({ event: 'ping', data: JSON.stringify({ ok: true }) })

    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

    while (!closed) {
      while (queue.length > 0) {
        const event = queue.shift()
        if (!event) continue
        try {
          await stream.writeSSE({ event: event.type, data: JSON.stringify(event) })
        } catch {
          close()
          break
        }
      }

      await Promise.race([waitForEvent(), sleep(25000)])

      if (closed) break
      if (queue.length === 0) {
        try {
          await stream.writeSSE({ event: 'ping', data: JSON.stringify({ ok: true }) })
        } catch {
          close()
          break
        }
      }
    }
  })
})
