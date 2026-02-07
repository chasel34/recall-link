import { subscribeSSE } from './sse'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export type ApiErrorData = {
  error?: string
  message?: string
}

export class ApiError extends Error {
  status: number
  data: ApiErrorData

  constructor(status: number, message: string, data: ApiErrorData) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export type User = {
  id: string
  email: string
  created_at: string
}

export interface Item {
  id: string
  url: string
  domain: string | null
  title: string | null
  summary: string | null
  clean_text: string | null
  clean_html?: string | null
  ai_mode?: 'server' | 'user' | null
  status: 'pending' | 'completed' | 'failed'
  tags: string[]
  created_at: string
  updated_at: string
}

export interface ListItemsParams {
  tags?: string
  q?: string
  status?: 'pending' | 'completed' | 'failed'
  domain?: string
  created_after?: string
  created_before?: string
  sort_by?: 'created_at' | 'updated_at' | 'domain'
  sort_order?: 'asc' | 'desc'
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

export type ChatHistoryEntry = {
  role: ChatMessageRole
  content: string
}

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

export type AiMode = 'server' | 'user'
export type AiProvider = 'gemini'

export interface AiSettingsGeminiConfig {
  model: string
  baseUrl?: string
  apiKey?: string
}

export interface AiSettingsArkConfig {
  embeddingModel: string
  baseUrl?: string
  apiKey?: string
}

export interface AiSettings {
  mode: AiMode
  provider: AiProvider
  gemini: {
    model: string
    baseUrl: string
    hasApiKey: boolean
  }
  ark: {
    embeddingModel: string
    baseUrl: string
    hasApiKey: boolean
  }
}

export type UpdateAiSettingsRequest =
  | {
      mode: 'server'
      provider: 'gemini'
      gemini?: Partial<AiSettingsGeminiConfig>
      ark?: Partial<AiSettingsArkConfig>
    }
  | {
      mode: 'user'
      provider: 'gemini'
      gemini: AiSettingsGeminiConfig
      ark?: Partial<AiSettingsArkConfig>
    }

export type UiStatus = 'running' | 'scheduled' | 'stale_lock' | 'queued'

export interface JobInList {
  id: string
  item_id: string
  item_url: string
  item_title: string | null
  type: string
  state: string
  ui_status: UiStatus
  attempt: number
  run_after: string
  locked_by: string | null
  lock_expires_at: string | null
  last_error_code: string | null
  last_error_message: string | null
  created_at: string
  updated_at: string
  started_at: string | null
  finished_at: string | null
  progress_percent: number | null
  progress_stage: string | null
  progress_message: string | null
  progress_updated_at: string | null
}

export interface ListJobsResponse {
  jobs: JobInList[]
  total: number
  limit: number
  offset: number
}

class ApiClient {
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as ApiErrorData
      throw new ApiError(response.status, data.message || `HTTP ${response.status}`, data)
    }

    return response.json()
  }

  async getAiSettings(): Promise<AiSettings> {
    return this.request<AiSettings>('/api/settings/ai')
  }

  async updateAiSettings(data: UpdateAiSettingsRequest): Promise<AiSettings> {
    return this.request<AiSettings>('/api/settings/ai', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async testAiSettings(data: UpdateAiSettingsRequest): Promise<{ ok: boolean; error?: string; message?: string }> {
    const result = await this.request<{ ok: boolean; error?: string; message?: string }>(
      '/api/settings/ai/test',
      {
      method: 'POST',
      body: JSON.stringify(data),
      }
    )

    if (!result.ok) {
      throw new Error(result.message || result.error || 'AI test failed')
    }

    return result
  }

  async register(email: string, password: string): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async login(email: string, password: string): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async logout(): Promise<{ ok: true } | { ok: boolean }> {
    return this.request<{ ok: true }>('/api/auth/logout', {
      method: 'POST',
    })
  }

  async me(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/me')
  }

  async listItems(params: ListItemsParams = {}): Promise<ListItemsResponse> {
    const searchParams = new URLSearchParams()

    if (params.tags) searchParams.set('tags', params.tags)
    if (params.q) searchParams.set('q', params.q)
    if (params.status) searchParams.set('status', params.status)
    if (params.domain) searchParams.set('domain', params.domain)
    if (params.created_after) searchParams.set('created_after', params.created_after)
    if (params.created_before) searchParams.set('created_before', params.created_before)
    if (params.sort_by) searchParams.set('sort_by', params.sort_by)
    if (params.sort_order) searchParams.set('sort_order', params.sort_order)
    if (params.limit) searchParams.set('limit', params.limit.toString())
    if (params.offset) searchParams.set('offset', params.offset.toString())

    const query = searchParams.toString()
    return this.request<ListItemsResponse>(`/api/items${query ? `?${query}` : ''}`)
  }

  async listInProgressJobs(params: {
    limit?: number
    offset?: number
    type?: string
    status?: string
  } = {}): Promise<ListJobsResponse> {
    const searchParams = new URLSearchParams()
    if (params.limit) searchParams.set('limit', params.limit.toString())
    if (params.offset) searchParams.set('offset', params.offset.toString())
    if (params.type) searchParams.set('type', params.type)
    if (params.status) searchParams.set('status', params.status)

    const query = searchParams.toString()
    return this.request<ListJobsResponse>(`/api/jobs/in-progress${query ? `?${query}` : ''}`)
  }

  async getItem(id: string): Promise<Item> {
    return this.request<Item>(`/api/items/${id}`)
  }

  async createItem(url: string, ai_mode?: 'server' | 'user'): Promise<Item> {
    return this.request<Item>('/api/items', {
      method: 'POST',
      body: JSON.stringify({ url, ai_mode }),
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
