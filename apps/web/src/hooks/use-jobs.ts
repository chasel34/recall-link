import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface UseJobsParams {
  limit?: number
  offset?: number
  type?: string
  status?: string
}

export function useJobs(params: UseJobsParams = {}) {
  const queryParams: UseJobsParams = {}
  
  if (params.limit) queryParams.limit = params.limit
  if (params.offset) queryParams.offset = params.offset
  if (params.type) queryParams.type = params.type
  if (params.status) queryParams.status = params.status

  return useQuery({
    queryKey: ['jobs', queryParams],
    queryFn: () => apiClient.listInProgressJobs(queryParams),
    placeholderData: keepPreviousData,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  })
}
