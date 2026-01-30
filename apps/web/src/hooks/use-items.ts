import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiClient, type ListItemsParams } from '@/lib/api-client'

export function useItems(params: ListItemsParams = {}) {
  const queryParams: ListItemsParams = {}

  if (params.tags) queryParams.tags = params.tags
  if (params.q) queryParams.q = params.q
  if (params.status) queryParams.status = params.status
  if (params.domain) queryParams.domain = params.domain
  if (params.created_after) queryParams.created_after = params.created_after
  if (params.created_before) queryParams.created_before = params.created_before
  if (params.sort_by) queryParams.sort_by = params.sort_by
  if (params.sort_order) queryParams.sort_order = params.sort_order
  if (params.limit) queryParams.limit = params.limit
  if (params.offset) queryParams.offset = params.offset

  return useQuery({
    queryKey: ['items', queryParams],
    queryFn: () => apiClient.listItems(queryParams),
    placeholderData: keepPreviousData,
  })
}
