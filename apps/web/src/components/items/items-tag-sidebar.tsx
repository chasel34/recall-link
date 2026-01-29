import { Link, useParams, useSearch } from '@tanstack/react-router'
import { useTags } from '@/hooks/use-tags'
import { Chip, Skeleton } from '@/components/base'
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
      <div className="h-full flex flex-col p-4 space-y-2 bg-card/50">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="rounded-md">
            <div className="h-8 w-full bg-muted/80" />
          </Skeleton>
        ))}
      </div>
    )
  }

  const visibleTags =
    mode === 'tags' && query
      ? tags?.filter((tag) => tag.name.toLowerCase().includes(query.toLowerCase()))
      : tags

  return (
    <div className="h-full flex flex-col p-4 bg-card/30">
      <div className="space-y-1">
        <Link
          to="/items"
          className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            !currentTag
              ? 'bg-foreground text-background shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          全部
        </Link>

        <div className="mt-6">
          <h3 className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
            标签
          </h3>
          <div className="space-y-1">
            {visibleTags?.map((tag) => (
              <Link
                key={tag.id}
                to="/items/tags/$tag"
                params={{ tag: tag.name }}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all group ${
                  currentTag === tag.name
                    ? 'bg-muted/80 text-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="truncate font-medium">{tag.name}</span>
                <Chip
                  size="sm"
                  variant={currentTag === tag.name ? "solid" : "flat"}
                  className={`ml-2 h-5 min-w-5 flex justify-center px-1 text-[10px] font-bold ${
                    currentTag === tag.name
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground group-hover:bg-muted/80'
                  }`}
                >
                  {tag.item_count}
                </Chip>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
