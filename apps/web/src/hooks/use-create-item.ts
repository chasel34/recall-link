import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { addToast } from '@/lib/toast'
import { useAiSettings } from '@/hooks/ai-settings'

export function useCreateItem() {
  const queryClient = useQueryClient()
  const { mode } = useAiSettings()

  return useMutation({
    mutationFn: (url: string) => apiClient.createItem(url, mode),
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
