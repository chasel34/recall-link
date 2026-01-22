import type { Item } from '@/lib/api-client'
import { ItemCard } from './item-card'
import { ItemCardSkeleton } from './item-card-skeleton'

interface ItemsGridProps {
  items: Item[]
  isLoading?: boolean
}

export function ItemsGrid({ items, isLoading }: ItemsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <ItemCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-lg font-semibold mb-2">暂无保存的网页</h3>
        <p className="text-sm text-muted-foreground">
          点击右上角「保存网页」开始使用
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
