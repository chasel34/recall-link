import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

export function useDeleteItem() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      toast.success('删除成功', {
        description: '网页已删除',
      })
      navigate({ to: '/items' })
    },
    onError: (error: Error) => {
      toast.error('删除失败', {
        description: error.message,
      })
    },
  })
}
