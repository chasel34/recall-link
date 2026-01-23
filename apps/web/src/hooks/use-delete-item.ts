import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useNavigate } from '@tanstack/react-router'
import { addToast } from '@heroui/react'

export function useDeleteItem() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      addToast({
        title: '删除成功',
        description: '网页已删除',
        color: 'success',
      })
      navigate({ to: '/items' })
    },
    onError: (error: Error) => {
      addToast({
        title: '删除失败',
        description: error.message,
        color: 'danger',
      })
    },
  })
}
