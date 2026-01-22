import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'

export function useCreateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (url: string) => apiClient.createItem(url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      toast.success('保存成功', {
        description: '正在处理网页内容...',
      })
    },
    onError: (error: Error) => {
      toast.error('保存失败', {
        description: error.message,
      })
    },
  })
}
