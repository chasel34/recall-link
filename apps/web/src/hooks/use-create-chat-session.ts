import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useCreateChatSession() {
  return useMutation({
    mutationFn: async (title?: string) => apiClient.createChatSession(title),
  })
}
