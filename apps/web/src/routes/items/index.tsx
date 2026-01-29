import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { useState } from 'react'
import { useItems } from '@/hooks/use-items'
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
      <div className="flex flex-col min-h-full">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md pb-4 pt-4 px-6 border-b border-border">
           <ItemsSearchBar onCreateClick={() => setShowCreateDialog(true)} />
        </div>
        <div className="p-6">
          <ItemsGrid items={data?.items || []} isLoading={isLoading} />
        </div>
      </div>

      <CreateItemDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </>
  )
}
