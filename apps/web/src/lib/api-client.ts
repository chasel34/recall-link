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

export interface ChatSession {
  id: string
  title: string | null
  updated_at: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  meta?: any
}

export interface SendMessageOptions {
  onMeta?: (meta: any) => void
  onDelta?: (delta: string) => void
  onDone?: () => void
  onError?: (error: Error) => void
  signal?: AbortSignal
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

  async listChatSessions(): Promise<{ sessions: ChatSession[] }> {
    return this.request<{ sessions: ChatSession[] }>('/api/chat/sessions')
  }

  async createChatSession(): Promise<ChatSession> {
    return this.request<ChatSession>('/api/chat/sessions', {
      method: 'POST',
    })
  }

  async listChatMessages(sessionId: string): Promise<{ messages: ChatMessage[] }> {
    return this.request<{ messages: ChatMessage[] }>(`/api/chat/sessions/${sessionId}/messages`)
  }

  async sendChatMessageStream(
    sessionId: string, 
    content: string, 
    options: SendMessageOptions
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/api/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
        signal: options.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const match = line.match(/^event: (.+)\ndata: (.+)$/s)
          if (!match) continue
          
          const [, event, data] = match
          
          if (event === 'meta') {
            options.onMeta?.(JSON.parse(data))
          } else if (event === 'delta') {
            try {
              const json = JSON.parse(data)
              options.onDelta?.(json.delta)
            } catch (e) {
              console.warn('Failed to parse delta', e)
            }
          } else if (event === 'done') {
            options.onDone?.()
            return
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      options.onError?.(err instanceof Error ? err : new Error('Unknown error'))
    }
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
}

export const apiClient = new ApiClient()
