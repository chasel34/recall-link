import { Link, useParams, useSearch } from '@tanstack/react-router'
import { useTags } from '@/hooks/use-tags'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useSearchMode } from '@/hooks/use-search-mode'

export function ItemsTagSidebar() {
  const params = useParams({ strict: false })
  const search = useSearch({ strict: false })
  const currentTag = params.tag as string | undefined
  const { mode } = useSearchMode()
  const { data: tags, isLoading } = useTags()
  const query = typeof search.q === 'string' ? search.q : ''

  if (isLoading) {
    return (
      <div className="w-48 border-r p-4 space-y-2">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    )
  }

  const visibleTags =
    mode === 'tags' && query
      ? tags?.filter((tag) => tag.tag.toLowerCase().includes(query.toLowerCase()))
      : tags

  return (
    <div className="w-48 border-r p-4">
      <div className="space-y-1">
        <Link
          to="/items"
          className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            !currentTag
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          全部
        </Link>

        <div className="mt-4">
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            标签
          </h3>
          <div className="space-y-1">
            {visibleTags?.map((tag) => (
              <Link
                key={tag.tag}
                to="/items/tags/$tag"
                params={{ tag: tag.tag }}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                  currentTag === tag.tag
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <span className="truncate">{tag.tag}</span>
                <Badge variant="secondary" className="ml-2">
                  {tag.count}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
