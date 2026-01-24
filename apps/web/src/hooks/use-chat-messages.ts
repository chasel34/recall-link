import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useChatMessages(sessionId: string, params: { limit?: number; before?: string } = {}) {
  return useQuery({
    queryKey: ['chat', 'messages', sessionId, params],
    enabled: !!sessionId,
    queryFn: () => apiClient.listChatMessages(sessionId, params),
  })
}
