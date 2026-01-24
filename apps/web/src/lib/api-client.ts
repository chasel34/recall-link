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
}

export const apiClient = new ApiClient()
