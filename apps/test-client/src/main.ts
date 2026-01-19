const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787/api'

type CreateItemSuccess = {
  id: string
  url: string
  domain: string
  status: string
  created_at: string
}

type DuplicateUrlError = {
  error: 'DUPLICATE_URL'
  message: string
  existing_item_id: string
}

type ApiError = {
  error: string
  message?: string
}

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T | null =>
  document.querySelector(selector) as T | null

const $input = (selector: string) =>
  document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)

async function readResponseBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return res.json()
  return res.text()
}

function renderResult(el: HTMLElement, res: Response, body: unknown) {
  const statusLine = `HTTP ${res.status} ${res.statusText}`.trim()
  const payload = typeof body === 'string' ? body : JSON.stringify(body, null, 2)
  el.textContent = `${statusLine}\n${payload}`

  // Best-effort styling hooks
  el.classList.toggle('success', res.ok)
  el.classList.toggle('error', !res.ok)
}

// Health Check
$('#btn-health')?.addEventListener('click', async () => {
  const resultDiv = $('#health-result')
  if (!resultDiv) return

  resultDiv.textContent = 'Checking...'
  resultDiv.classList.remove('success', 'error')

  try {
    const res = await fetch(`${API_URL}/health`)
    const body = await readResponseBody(res)
    renderResult(resultDiv, res, body)
  } catch (err) {
    resultDiv.classList.add('error')
    resultDiv.textContent = `Error: ${String(err)}`
  }
})

// Items
$('#btn-list-items')?.addEventListener('click', async () => {
  const pre = $('#items-result')
  if (!pre) return

  pre.textContent = 'Loading...'
  pre.classList.remove('success', 'error')

  try {
    const res = await fetch(`${API_URL}/items`)
    const body = await readResponseBody(res)
    renderResult(pre, res, body)
  } catch (err) {
    pre.classList.add('error')
    pre.textContent = `Error: ${String(err)}`
  }
})

$('#btn-create-item')?.addEventListener('click', async () => {
  const url = $input('#item-url')?.value
  const pre = $('#items-result')
  if (!pre) return

  pre.textContent = 'Creating...'
  pre.classList.remove('success', 'error')

  if (!url) {
    pre.classList.add('error')
    pre.textContent = 'Error: URL is required'
    return
  }

  try {
    const res = await fetch(`${API_URL}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })

    const body = (await readResponseBody(res)) as CreateItemSuccess | DuplicateUrlError | ApiError | unknown
    renderResult(pre, res, body)
  } catch (err) {
    pre.classList.add('error')
    pre.textContent = `Error: ${String(err)}`
  }
})

// Chat
$('#btn-send-chat')?.addEventListener('click', async () => {
  const message = $input('#chat-message')?.value
  const pre = $('#chat-result')
  if (!pre) return

  pre.textContent = 'Sending...'
  pre.classList.remove('success', 'error')

  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })

    const body = await readResponseBody(res)
    renderResult(pre, res, body)
  } catch (err) {
    pre.classList.add('error')
    pre.textContent = `Error: ${String(err)}`
  }
})

// SSE
let eventSource: EventSource | null = null

$('#btn-connect-sse')?.addEventListener('click', () => {
  if (eventSource) return

  const status = $('#sse-status')
  const log = $('#sse-log')
  if (!status || !log) return

  status.textContent = 'Connecting...'
  status.className = 'status'

  eventSource = new EventSource(`${API_URL}/items/events`)

  eventSource.onopen = () => {
    status.textContent = 'Connected'
    status.className = 'status success'
    ;($('#btn-disconnect-sse') as HTMLButtonElement | null)?.toggleAttribute('disabled', false)
    ;($('#btn-connect-sse') as HTMLButtonElement | null)?.toggleAttribute('disabled', true)
    log.textContent += `[${new Date().toLocaleTimeString()}] Connected\n`
  }

  eventSource.onmessage = (event) => {
    log.textContent += `[${new Date().toLocaleTimeString()}] Message: ${event.data}\n`
    log.scrollTop = log.scrollHeight
  }

  eventSource.addEventListener('ping', (event) => {
    log.textContent += `[${new Date().toLocaleTimeString()}] Ping: ${event.data}\n`
  })

  eventSource.onerror = (err) => {
    console.error('SSE Error:', err)
    status.textContent = 'Error (see console)'
    status.className = 'status error'
    log.textContent += `[${new Date().toLocaleTimeString()}] Error occurred\n`
  }
})

$('#btn-disconnect-sse')?.addEventListener('click', () => {
  if (!eventSource) return

  eventSource.close()
  eventSource = null

  const status = $('#sse-status')
  if (status) {
    status.textContent = 'Disconnected'
    status.className = 'status'
  }

  ;($('#btn-disconnect-sse') as HTMLButtonElement | null)?.toggleAttribute('disabled', true)
  ;($('#btn-connect-sse') as HTMLButtonElement | null)?.toggleAttribute('disabled', false)

  const log = $('#sse-log')
  if (log) log.textContent += `[${new Date().toLocaleTimeString()}] Disconnected\n`
})
