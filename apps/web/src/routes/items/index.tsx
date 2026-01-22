import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { useState } from 'react'
import { useItems } from '@/hooks/use-items'
import { ItemsTagSidebar } from '@/components/items/items-tag-sidebar'
import { ItemsGrid } from '@/components/items/items-grid'
import { ItemsSearchBar } from '@/components/items/items-search-bar'
import { CreateItemDialog } from '@/components/items/create-item-dialog'
import { useSearchMode } from '@/hooks/use-search-mode'

const itemsSearchSchema = z.object({
  q: z.string().optional(),
  page: z.number().int().positive().optional(),
})

export const Route = createFileRoute('/items/')({
  validateSearch: itemsSearchSchema,
  component: ItemsPage,
})

function ItemsPage() {
  const search = Route.useSearch()
  const { mode } = useSearchMode()
  const query = mode === 'content' ? search.q : undefined
  const { data, isLoading } = useItems({ q: query })
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-57px)]">
        <ItemsSearchBar onCreateClick={() => setShowCreateDialog(true)} />
        <div className="flex flex-1 overflow-hidden">
          <ItemsTagSidebar />
          <div className="flex-1 overflow-auto p-6">
            <ItemsGrid items={data?.items || []} isLoading={isLoading} />
          </div>
        </div>
      </div>

      <CreateItemDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </>
  )
}
