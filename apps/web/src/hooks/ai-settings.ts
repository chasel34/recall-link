import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, type UpdateAiSettingsRequest } from '@/lib/api-client'
import { addToast } from '@/lib/toast'

export const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview'
export const DEFAULT_ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
export const DEFAULT_ARK_EMBEDDING_MODEL = 'doubao-embedding-vision-251215'

export const AI_SETTINGS_QUERY_KEY = ['ai-settings']

export function useAiSettings() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: AI_SETTINGS_QUERY_KEY,
    queryFn: () => apiClient.getAiSettings(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateAiSettingsRequest) => apiClient.updateAiSettings(data),
    onSuccess: (newData) => {
      queryClient.setQueryData(AI_SETTINGS_QUERY_KEY, newData)
    },
    onError: (error: Error) => {
      addToast({
        title: '保存失败',
        description: error.message,
        color: 'danger',
      })
    },
  })

  const testMutation = useMutation({
    mutationFn: (data: UpdateAiSettingsRequest) => apiClient.testAiSettings(data),
  })

  return {
    settings: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    test: testMutation.mutate,
    testAsync: testMutation.mutateAsync,
    isTesting: testMutation.isPending,
  }
}
