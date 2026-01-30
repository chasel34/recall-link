import { Link, useSearch } from '@tanstack/react-router'
import { useTags } from '@/hooks/use-tags'
import { Chip, Skeleton } from '@/components/base'
import { useSearchMode } from '@/hooks/use-search-mode'
import { Clock, Inbox, LayoutGrid } from 'lucide-react'

const TAG_SIDEBAR_SKELETON_KEYS = [
  'tag-skeleton-a',
  'tag-skeleton-b',
  'tag-skeleton-c',
  'tag-skeleton-d',
  'tag-skeleton-e',
  'tag-skeleton-f',
  'tag-skeleton-g',
  'tag-skeleton-h',
] as const

export function ItemsTagSidebar() {
  const search = useSearch({ strict: false })
  const currentTag = typeof (search as { tag?: unknown }).tag === 'string' ? (search as { tag: string }).tag : undefined
  const currentCategory =
    typeof (search as { category?: unknown }).category === 'string'
      ? ((search as { category: string }).category as 'recent' | string)
      : undefined
  const { mode } = useSearchMode()
  const { data: tags, isLoading } = useTags()
  const query = typeof search.q === 'string' ? search.q : ''

  if (isLoading) {
    return (
      <div className="h-full flex flex-col p-6 space-y-2">
        {TAG_SIDEBAR_SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="rounded-md">
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

  const isRecent = currentCategory === 'recent'
  const isPending = currentCategory === 'pending'
  const isAll = !currentTag && !isRecent && !isPending

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-7">
        <div className="space-y-10">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/70 mb-5 px-2">
            分类
          </h3>
          <div className="space-y-1">
            <Link
              to="/items"
              search={(prev) => ({ ...prev, tag: undefined, category: undefined })}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] transition-all ${
                isAll
                  ? 'bg-primary/10 shadow-[var(--shadow-card)] ring-1 ring-primary/20 text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              所有收藏
            </Link>

            <Link
              to="/items"
              search={(prev) => ({ ...prev, tag: undefined, category: 'recent' })}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] transition-all ${
                isRecent
                  ? 'bg-primary/10 shadow-[var(--shadow-card)] ring-1 ring-primary/20 text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
              }`}
            >
              <Clock className="w-4 h-4" />
              最近添加
            </Link>

            <Link
              to="/items"
              search={(prev) => ({ ...prev, tag: undefined, category: 'pending' })}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] transition-all ${
                isPending
                  ? 'bg-primary/10 shadow-[var(--shadow-card)] ring-1 ring-primary/20 text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
              }`}
            >
              <Inbox className="w-4 h-4" />
              待处理
            </Link>
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
                to="/items"
                search={(prev) => ({ ...prev, tag: tag.name })}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-[13px] transition-all group ${
                  currentTag === tag.name
                    ? 'bg-primary/10 shadow-[var(--shadow-card)] ring-1 ring-primary/20 text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
                }`}
              >
                <span className="flex items-center min-w-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full mr-3 transition-colors ${
                      currentTag === tag.name
                        ? 'bg-primary'
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
                      ? 'bg-primary/15 text-primary'
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
    </div>
  )
}
