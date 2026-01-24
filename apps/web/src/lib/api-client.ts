import { subscribeSSE } from './sse'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export interface Item {
  id: string
  url: string
  domain: string | null
  title: string | null
  summary: string | null
  clean_text: string | null
  clean_html?: string | null
  status: 'pending' | 'completed' | 'failed'
  tags: string[]
  created_at: string
  updated_at: string
}

export interface ListItemsParams {
  tags?: string
  q?: string
  page?: number
  limit?: number
  offset?: number
}

export interface ListItemsResponse {
  items: Item[]
  total: number
  limit: number
  offset: number
}

export interface Tag {
  id: string
  name: string
  item_count: number
  created_at: string
}

export interface UpdateItemDto {
  summary?: string
  tags?: string[]
  note?: string
}

export type ChatSession = {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}

export type ChatMessageRole = 'user' | 'assistant' | 'system'

export type ChatSource = {
  item_id: string
  url: string
  title: string | null
  snippet: string
}

export type ChatMessage = {
  id: string
  session_id: string
  role: ChatMessageRole
  content: string
  meta_json: string | null
  created_at: string
}

export type ListChatSessionsResponse = {
  sessions: ChatSession[]
  total: number
  limit: number
  offset: number
}

export type ListChatMessagesResponse = {
  messages: ChatMessage[]
}

export type ChatStreamMeta = {
  session_id: string
  user_message_id: string
  assistant_message_id: string
  sources: ChatSource[]
}

class ApiClient {
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  async listItems(params: ListItemsParams = {}): Promise<ListItemsResponse> {
    const searchParams = new URLSearchParams()

    if (params.tags) searchParams.set('tags', params.tags)
    if (params.q) searchParams.set('q', params.q)
    if (params.limit) searchParams.set('limit', params.limit.toString())
    if (params.offset) searchParams.set('offset', params.offset.toString())

    const query = searchParams.toString()
    return this.request<ListItemsResponse>(`/api/items${query ? `?${query}` : ''}`)
  }

  async getItem(id: string): Promise<Item> {
    return this.request<Item>(`/api/items/${id}`)
  }

  async createItem(url: string): Promise<Item> {
    return this.request<Item>('/api/items', {
      method: 'POST',
      body: JSON.stringify({ url }),
    })
  }

  async updateItem(id: string, data: UpdateItemDto): Promise<Item> {
    return this.request<Item>(`/api/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteItem(id: string): Promise<void> {
    await this.request<void>(`/api/items/${id}`, {
      method: 'DELETE',
    })
  }

  async listTags(): Promise<Tag[]> {
    const response = await this.request<{ tags: Tag[] }>('/api/tags')
    return response.tags
  }

  async listChatSessions(params: { limit?: number; offset?: number } = {}): Promise<ListChatSessionsResponse> {
    const searchParams = new URLSearchParams()
    if (params.limit) searchParams.set('limit', params.limit.toString())
    if (params.offset) searchParams.set('offset', params.offset.toString())
    const query = searchParams.toString()
    return this.request<ListChatSessionsResponse>(`/api/chat/sessions${query ? `?${query}` : ''}`)
  }

  async createChatSession(title?: string): Promise<ChatSession> {
    return this.request<ChatSession>('/api/chat/sessions', {
      method: 'POST',
      body: JSON.stringify(title ? { title } : {}),
    })
  }

  async listChatMessages(
    sessionId: string,
    params: { limit?: number; before?: string } = {}
  ): Promise<ListChatMessagesResponse> {
    const searchParams = new URLSearchParams()
    if (params.limit) searchParams.set('limit', params.limit.toString())
    if (params.before) searchParams.set('before', params.before)
    const query = searchParams.toString()
    return this.request<ListChatMessagesResponse>(
      `/api/chat/sessions/${sessionId}/messages${query ? `?${query}` : ''}`
    )
  }

  sendChatMessageStream(
    sessionId: string,
    message: string,
    opts: {
      onMeta: (meta: ChatStreamMeta) => void
      onDelta: (delta: string) => void
      onDone?: (data: { assistant_message_id: string }) => void
      onError?: (data: { error: string; message: string }) => void
      signal?: AbortSignal
    }
  ): { close: () => void } {
    const url = `${API_BASE}/api/chat/sessions/${sessionId}/messages`

    return subscribeSSE({
      url,
      method: 'POST',
      body: JSON.stringify({ message }),
      signal: opts.signal,
      onEvent: (evt) => {
        if (evt.event === 'meta') {
          opts.onMeta(JSON.parse(evt.data) as ChatStreamMeta)
          return
        }
        if (evt.event === 'delta') {
          try {
            const parsed = JSON.parse(evt.data) as { delta?: unknown }
            if (typeof parsed.delta === 'string') {
              opts.onDelta(parsed.delta)
            }
          } catch {
            // ignore malformed delta chunks
          }
          return
        }
        if (evt.event === 'done') {
          opts.onDone?.(JSON.parse(evt.data) as { assistant_message_id: string })
          return
        }
        if (evt.event === 'error') {
          opts.onError?.(JSON.parse(evt.data) as { error: string; message: string })
        }
      },
      onError: (err) => {
        opts.onError?.({ error: 'NETWORK_ERROR', message: err instanceof Error ? err.message : String(err) })
      },
    })
  }
}

export const apiClient = new ApiClient()
