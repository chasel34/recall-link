import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useItem(id: string) {
  return useQuery({
    queryKey: ['items', id],
    queryFn: () => apiClient.getItem(id),
    enabled: !!id,
  })
}
