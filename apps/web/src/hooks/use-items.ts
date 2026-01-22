import { useQuery } from '@tanstack/react-query'
import { apiClient, type ListItemsParams } from '@/lib/api-client'

export function useItems(params: ListItemsParams = {}) {
  return useQuery({
    queryKey: ['items', params],
    queryFn: () => apiClient.listItems(params),
  })
}
