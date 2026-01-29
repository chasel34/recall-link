import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiClient, type ListItemsParams } from '@/lib/api-client'

export function useItems(params: ListItemsParams = {}) {
  const queryParams: ListItemsParams = {}

  if (params.tags) queryParams.tags = params.tags
  if (params.q) queryParams.q = params.q
  if (params.limit) queryParams.limit = params.limit
  if (params.offset) queryParams.offset = params.offset

  return useQuery({
    queryKey: ['items', queryParams],
    queryFn: () => apiClient.listItems(queryParams),
    placeholderData: keepPreviousData,
  })
}
