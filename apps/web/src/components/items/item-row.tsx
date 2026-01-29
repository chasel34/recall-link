import { Link } from '@tanstack/react-router'
import type { Item } from '@/lib/api-client'
import { Button, Chip } from '@/components/base'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { AlertTriangle, ExternalLink, FileText, LoaderCircle, MoreHorizontal } from 'lucide-react'

interface ItemRowProps {
  item: Item
}

export function ItemRow({ item }: ItemRowProps) {
  const displayTitle = item.title || item.url
  const displaySummary = item.summary || '暂无摘要'
  const visibleTags = item.tags.slice(0, 2)
  const remainingCount = item.tags.length - visibleTags.length

  const timeAgo = formatDistanceToNow(new Date(item.created_at), {
    addSuffix: true,
    locale: zhCN,
  })

  const StatusIcon = item.status === 'pending' ? LoaderCircle : item.status === 'failed' ? AlertTriangle : FileText

  return (
    <article
      className={cn(
        'group flex items-stretch justify-between gap-4 px-4',
        'hover:bg-muted/40 transition-colors'
      )}
    >
      <Link
        to="/items/$id"
        params={{ id: item.id }}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-4 py-3',
          'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background rounded-lg'
        )}
      >
        <div className="shrink-0">
          <StatusIcon
            className={cn(
              'h-5 w-5 text-muted-foreground/60 transition-colors group-hover:text-primary',
              item.status === 'pending' && 'animate-spin',
              item.status === 'failed' && 'text-destructive/70 group-hover:text-destructive'
            )}
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3 min-w-0">
            <h3 className="min-w-0 truncate font-serif text-[15px] font-semibold text-foreground/90 group-hover:text-primary transition-colors">
              {displayTitle}
            </h3>
            {item.domain && (
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                {item.domain}
              </span>
            )}
            {item.tags.length > 0 && (
              <div className="hidden md:flex items-center gap-1.5 min-w-0">
                {visibleTags.map((tag) => (
                  <Chip
                    key={tag}
                    size="sm"
                    variant="flat"
                    className="bg-muted/60 text-muted-foreground text-[9px] font-bold tracking-wider uppercase border border-border/40"
                  >
                    {tag}
                  </Chip>
                ))}
                {remainingCount > 0 && (
                  <Chip size="sm" variant="flat" className="bg-muted/40 text-muted-foreground text-[9px] font-semibold">
                    +{remainingCount}
                  </Chip>
                )}
              </div>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground/80 leading-relaxed">
            {displaySummary}
          </p>
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-3 py-3">
        <span className="hidden sm:inline text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.22em] tabular-nums whitespace-nowrap">
          {timeAgo}
        </span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <Button
            isIconOnly
            variant="light"
            size="sm"
            aria-label="打开原网页"
            className="w-8 h-8 rounded-lg"
            onPress={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button
            isIconOnly
            variant="light"
            size="sm"
            isDisabled
            aria-label="更多操作"
            className="w-8 h-8 rounded-lg"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </article>
  )
}
