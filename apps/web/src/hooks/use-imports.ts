import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface UseImportsParams {
  limit?: number
  offset?: number
  status?: string
}

export function useImports(params: UseImportsParams = {}) {
  const queryParams: UseImportsParams = {}
  
  if (params.limit) queryParams.limit = params.limit
  if (params.offset) queryParams.offset = params.offset
  if (params.status) queryParams.status = params.status

  return useQuery({
    queryKey: ['imports', queryParams],
    queryFn: () => apiClient.listImports(queryParams),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const hasActiveImport = query.state.data?.imports.some(i => 
        i.status === 'processing' || i.status === 'queued'
      )
      return hasActiveImport ? 3000 : false
    },
  })
}

export function useImport(id: string) {
  return useQuery({
    queryKey: ['imports', id],
    queryFn: () => apiClient.getImport(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return (status === 'processing' || status === 'queued') ? 2000 : false
    },
  })
}

export interface UseImportEntriesParams {
  limit?: number
  offset?: number
  status?: string
}

export function useImportEntries(id: string, params: UseImportEntriesParams = {}) {
  const queryParams: UseImportEntriesParams = {}
  
  if (params.limit) queryParams.limit = params.limit
  if (params.offset) queryParams.offset = params.offset
  if (params.status) queryParams.status = params.status

  return useQuery({
    queryKey: ['imports', id, 'entries', queryParams],
    queryFn: () => apiClient.listImportEntries(id, queryParams),
    placeholderData: keepPreviousData,
    enabled: !!id,
    refetchInterval: 3000,
  })
}

export function useCreateImport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { file: File; ai_mode?: 'server' | 'user' }) =>
      apiClient.importBookmarks(data.file, { ai_mode: data.ai_mode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] })
    },
  })
}
