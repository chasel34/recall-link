import type { Item } from '@/lib/api-client'
import { ItemCard } from './item-card'
import { ItemCardSkeleton } from './item-card-skeleton'
import { Inbox } from 'lucide-react'

interface ItemsGridProps {
  items: Item[]
  isLoading?: boolean
}

export function ItemsGrid({ items, isLoading }: ItemsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
        {[...Array(8)].map((_, i) => (
          <ItemCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted/70 border border-border/60 flex items-center justify-center shadow-[var(--shadow-card)]">
          <Inbox className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="mt-6 font-serif text-xl font-semibold">暂无收藏</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          点击上方「保存网页」开始沉淀你的链接与知识。
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
