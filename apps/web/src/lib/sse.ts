export type SSEEvent = {
  event: string
  data: string
}

export type SubscribeSSEOptions = {
  url: string
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: string
  signal?: AbortSignal
  /**
   * For GET/EventSource mode, you can subscribe to specific event names.
   * For fetch mode, all events are parsed.
   */
  events?: string[]
  onEvent: (event: SSEEvent) => void
  onError?: (error: unknown) => void
}

export type SSESubscription = {
  close: () => void
}

export function subscribeSSE(options: SubscribeSSEOptions): SSESubscription {
  const method = options.method ?? 'GET'

  if (method === 'GET' && options.body === undefined) {
    return subscribeEventSource(options)
  }

  return subscribeFetchSSE(options)
}

function subscribeEventSource(options: SubscribeSSEOptions): SSESubscription {
  // EventSource does not support custom headers or POST.
  const es = new EventSource(options.url)

  const handler = (event: MessageEvent) => {
    options.onEvent({ event: event.type || 'message', data: String(event.data ?? '') })
  }

  const events = options.events && options.events.length > 0 ? options.events : ['message']
  for (const name of events) {
    if (name === 'message') {
      es.onmessage = handler
    } else {
      es.addEventListener(name, handler)
    }
  }
  es.onerror = (e) => {
    options.onError?.(e)
  }

  // Also forward custom events if user adds listeners externally.
  // Consumers can rely on onEvent for the default message channel.

  if (options.signal) {
    const onAbort = () => es.close()
    if (options.signal.aborted) {
      es.close()
    } else {
      options.signal.addEventListener('abort', onAbort, { once: true })
    }
  }

  return {
    close: () => {
      for (const name of events) {
        if (name !== 'message') {
          es.removeEventListener(name, handler)
        }
      }
      es.close()
    },
  }
}

function subscribeFetchSSE(options: SubscribeSSEOptions): SSESubscription {
  const controller = new AbortController()
  const signal = options.signal

  if (signal) {
    if (signal.aborted) {
      controller.abort()
    } else {
      signal.addEventListener('abort', () => controller.abort(), { once: true })
    }
  }

  let closed = false
  void (async () => {
    try {
      const res = await fetch(options.url, {
        method: options.method ?? 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers ?? {}),
        },
        body: options.body,
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `HTTP ${res.status}`)
      }

      if (!res.body) {
        throw new Error('Missing response body')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      let buffer = ''
      let currentEvent = 'message'
      let currentData: string[] = []

      const flush = () => {
        if (currentData.length === 0) return
        const data = currentData.join('\n')
        options.onEvent({ event: currentEvent, data })
        currentEvent = 'message'
        currentData = []
      }

      while (!closed) {
        const { done, value } = await reader.read()
        if (done || closed) break

        buffer += decoder.decode(value, { stream: true })

        while (true) {
          const idx = buffer.indexOf('\n')
          if (idx === -1) break

          let line = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 1)

          if (line.endsWith('\r')) {
            line = line.slice(0, -1)
          }

          // Empty line = dispatch event
          if (line === '') {
            flush()
            continue
          }

          if (line.startsWith(':')) {
            continue
          }

          if (line.startsWith('event:')) {
            currentEvent = line.slice('event:'.length).trim() || 'message'
            continue
          }

          if (line.startsWith('data:')) {
            currentData.push(line.slice('data:'.length).trimStart())
            continue
          }
        }
      }

      // Flush remaining on close.
      if (!closed) {
        flush()
      }
    } catch (error) {
      if (!closed) {
        options.onError?.(error)
      }
    }
  })()

  return {
    close: () => {
      closed = true
      controller.abort()
    },
  }
}
