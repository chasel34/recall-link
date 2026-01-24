import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useItem } from '@/hooks/use-item'
import { ItemDetail } from '@/components/items/item-detail'
import { ItemDetailSkeleton } from '@/components/items/item-detail-skeleton'
import { Button, Card, CardBody } from "@heroui/react"

export const Route = createFileRoute('/items/$id')({
  component: ItemDetailPage,
})

function ItemDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: item, isLoading, error } = useItem(id)

  if (isLoading) {
    return (
      <div className="w-full">
        <ItemDetailSkeleton />
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="border-danger border bg-danger-50 dark:bg-danger-900/20" shadow="none">
          <CardBody>
            <h4 className="font-bold text-danger text-lg">错误</h4>
            <p className="text-danger-600 dark:text-danger-400">{error?.message || '网页不存在'}</p>
          </CardBody>
        </Card>
        <Button className="mt-4" onPress={() => navigate({ to: '/items' })}>
          返回列表
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <ItemDetail item={item} />
    </div>
  )
}
