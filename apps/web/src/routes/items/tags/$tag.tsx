import { createFileRoute } from '@tanstack/react-router'
import { useItems } from '@/hooks/use-items'
import { ItemsGrid } from '@/components/items/items-grid'

export const Route = createFileRoute('/items/tags/$tag')({
  component: TagItemsPage,
})

function TagItemsPage() {
  const { tag } = Route.useParams()
  const { data, isLoading } = useItems({ tags: tag })

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">标签: {tag}</h2>
      <ItemsGrid items={data?.items || []} isLoading={isLoading} />
    </div>
  )
}
