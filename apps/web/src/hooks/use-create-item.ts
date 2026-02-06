import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { addToast } from '@/lib/toast'
import { AI_SETTINGS_QUERY_KEY, useAiSettings } from '@/hooks/ai-settings'

export function useCreateItem() {
  const queryClient = useQueryClient()
  const { settings } = useAiSettings()

  return useMutation({
    mutationFn: async (url: string) => {
      const resolvedSettings =
        settings ??
        (await queryClient.fetchQuery({
          queryKey: AI_SETTINGS_QUERY_KEY,
          queryFn: () => apiClient.getAiSettings(),
        }))

      return apiClient.createItem(url, resolvedSettings?.mode)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      addToast({
        title: '保存成功',
        description: '正在处理网页内容...',
        color: 'success',
      })
    },
    onError: (error: Error) => {
      addToast({
        title: '保存失败',
        description: error.message,
        color: 'danger',
      })
    },
  })
}
