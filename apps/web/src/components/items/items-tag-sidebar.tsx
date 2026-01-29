import { Link, useParams, useSearch } from '@tanstack/react-router'
import { useTags } from '@/hooks/use-tags'
import { Chip, Skeleton } from '@/components/base'
import { useSearchMode } from '@/hooks/use-search-mode'
import { Clock, Inbox } from 'lucide-react'

export function ItemsTagSidebar() {
  const params = useParams({ strict: false })
  const search = useSearch({ strict: false })
  const currentTag = params.tag as string | undefined
  const { mode } = useSearchMode()
  const { data: tags, isLoading } = useTags()
  const query = typeof search.q === 'string' ? search.q : ''

  if (isLoading) {
    return (
      <div className="h-full flex flex-col p-6 space-y-2">
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
    <div className="h-full flex flex-col px-6 py-7">
      <div className="space-y-10">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/70 mb-5 px-2">
            分类
          </h3>
          <div className="space-y-1">
            <Link
              to="/items"
              className={`block px-4 py-2.5 rounded-xl text-[13px] transition-all ${
                !currentTag
                  ? 'bg-card shadow-[var(--shadow-card)] ring-1 ring-border/60 text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
              }`}
            >
              所有收藏
            </Link>

            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] text-muted-foreground/60 bg-transparent cursor-not-allowed select-none">
              <Clock className="w-4 h-4" />
              最近添加
              <span className="ml-auto text-[10px] font-semibold text-muted-foreground/50">即将上线</span>
            </div>

            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] text-muted-foreground/60 bg-transparent cursor-not-allowed select-none">
              <Inbox className="w-4 h-4" />
              待处理
              <span className="ml-auto text-[10px] font-semibold text-muted-foreground/50">即将上线</span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-5 px-2">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/70">
              标签
            </h3>
          </div>

          <div className="space-y-0.5">
            {visibleTags?.map((tag) => (
              <Link
                key={tag.id}
                to="/items/tags/$tag"
                params={{ tag: tag.name }}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-[13px] transition-all group ${
                  currentTag === tag.name
                    ? 'bg-card shadow-[var(--shadow-card)] ring-1 ring-border/60 text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
                }`}
              >
                <span className="flex items-center min-w-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full mr-3 transition-colors ${
                      currentTag === tag.name
                        ? 'bg-primary/70'
                        : 'bg-border group-hover:bg-primary/60'
                    }`}
                  />
                  <span className="truncate font-medium">{tag.name}</span>
                </span>
                <Chip
                  size="sm"
                  variant="flat"
                  className={`ml-2 h-5 min-w-6 flex justify-center px-1.5 text-[10px] font-bold ${
                    currentTag === tag.name
                      ? 'bg-muted text-foreground'
                      : 'bg-muted/70 text-muted-foreground group-hover:bg-muted'
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
