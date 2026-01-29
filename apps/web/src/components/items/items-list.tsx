import type { Item } from '@/lib/api-client'
import { Inbox } from 'lucide-react'
import { ItemRow } from './item-row'
import { ItemRowSkeleton } from './item-row-skeleton'

interface ItemsListProps {
  items: Item[]
  isLoading?: boolean
}

export function ItemsList({ items, isLoading }: ItemsListProps) {
  if (isLoading) {
    return (
      <div className="border-y border-border/60 bg-transparent divide-y divide-border/60">
        {[...Array(10)].map((_, i) => (
          <ItemRowSkeleton key={i} />
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
        <p className="mt-2 text-sm text-muted-foreground">点击上方「保存网页」开始沉淀你的链接与知识。</p>
      </div>
    )
  }

  return (
    <div className="border-y border-border/60 bg-transparent divide-y divide-border/60">
      {items.map((item) => (
        <ItemRow key={item.id} item={item} />
      ))}
    </div>
  )
}
