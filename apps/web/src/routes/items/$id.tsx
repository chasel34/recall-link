import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useItem } from '@/hooks/use-item'
import { ItemDetail } from '@/components/items/item-detail'
import { ItemDetailSkeleton } from '@/components/items/item-detail-skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/items/$id')({
  component: ItemDetailPage,
})

function ItemDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: item, isLoading, error } = useItem(id)

  if (isLoading) {
    return (
      <div className="p-6">
        <ItemDetailSkeleton />
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>{error?.message || '网页不存在'}</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => navigate({ to: '/items' })}>
          返回列表
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6">
      <ItemDetail item={item} />
    </div>
  )
}
