import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { useState } from 'react'
import { useItems } from '@/hooks/use-items'
import { ItemsGrid } from '@/components/items/items-grid'
import { ItemsList } from '@/components/items/items-list'
import { ItemsSearchBar } from '@/components/items/items-search-bar'
import { CreateItemDialog } from '@/components/items/create-item-dialog'
import { useSearchMode } from '@/hooks/use-search-mode'
import { useItemsViewMode } from '@/hooks/use-items-view-mode'
import { Button } from '@/components/base'
import { LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'

const itemsSearchSchema = z.object({
  q: z.string().optional(),
  tag: z.string().optional(),
  page: z.number().int().positive().optional(),
})

export const Route = createFileRoute('/items/')({
  validateSearch: itemsSearchSchema,
  component: ItemsPage,
})

function ItemsPage() {
  const search = Route.useSearch()
  const { mode: searchMode } = useSearchMode()
  const { mode: viewMode, setMode: setViewMode } = useItemsViewMode()
  const tag = typeof search.tag === 'string' ? search.tag : undefined
  const query = searchMode === 'content' ? search.q : undefined
  const itemsQuery = useItems({ q: query, tags: tag })
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const items = itemsQuery.data?.items ?? []
  const showSkeleton = itemsQuery.isPending && itemsQuery.data == null

  return (
    <>
        <div className="flex flex-col min-h-full">
          <div className="sticky top-0 z-10 bg-background/70 backdrop-blur-md pb-5 pt-5 border-b border-border/40">
          <div className="max-w-7xl 2xl:max-w-[88rem] mx-auto px-4 lg:px-8">
            <ItemsSearchBar onCreateClick={() => setShowCreateDialog(true)} />
          </div>
        </div>
        <div className="max-w-7xl 2xl:max-w-[88rem] mx-auto w-full px-4 lg:px-8 py-10">
          <div className="mb-10 flex items-end justify-between gap-6">
            <div>
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground/90">
                所有收藏
                <span className="ml-3 text-sm font-sans font-medium text-muted-foreground">
                  {viewMode === 'list' ? '高密度视图' : '网格视图'}
                </span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                沉淀思想，记录每一个灵感瞬间。
              </p>
            </div>

            <div className="flex items-center bg-muted/50 p-1 rounded-xl ring-1 ring-border/60">
              <Button
                isIconOnly
                variant="flat"
                className={cn(
                  'w-9 h-9',
                  viewMode === 'grid'
                    ? 'bg-card shadow-[var(--shadow-card)] ring-1 ring-border/60'
                    : 'bg-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground'
                )}
                aria-label="网格视图"
                onPress={() => setViewMode('grid')}
              >
                <LayoutGrid className="w-4.5 h-4.5" />
              </Button>
              <Button
                isIconOnly
                variant="flat"
                className={cn(
                  'w-9 h-9',
                  viewMode === 'list'
                    ? 'bg-card shadow-[var(--shadow-card)] ring-1 ring-border/60'
                    : 'bg-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground'
                )}
                aria-label="列表视图"
                onPress={() => setViewMode('list')}
              >
                <List className="w-4.5 h-4.5" />
              </Button>
            </div>
          </div>
          {viewMode === 'grid' ? (
            <ItemsGrid items={items} isLoading={showSkeleton} />
          ) : (
            <ItemsList items={items} isLoading={showSkeleton} />
          )}
        </div>
      </div>

      <CreateItemDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </>
  )
}
