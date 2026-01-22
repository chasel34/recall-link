import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => apiClient.listTags(),
  })
}
