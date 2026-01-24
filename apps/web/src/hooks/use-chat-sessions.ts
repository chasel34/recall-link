import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useChatSessions(params: { limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: ['chat', 'sessions', params],
    queryFn: () => apiClient.listChatSessions(params),
  })
}
