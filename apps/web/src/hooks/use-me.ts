import { useQuery } from '@tanstack/react-query'
import { apiClient, type ApiError, type User } from '@/lib/api-client'

export function useMe(opts: { enabled?: boolean } = {}): {
  user: User | null
  isLoading: boolean
  isError: boolean
  error: ApiError | null
} {
  const query = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiClient.me()
      return res.user
    },
    enabled: opts.enabled ?? true,
    retry: false,
  })

  const error = (query.error as ApiError | null) ?? null

  if (error?.status === 401) {
    return { user: null, isLoading: false, isError: false, error: null }
  }

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error,
  }
}
