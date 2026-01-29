import { Link } from '@tanstack/react-router'
import { Card, CardHeader, CardBody, Chip } from '@/components/base'
import type { Item } from '@/lib/api-client'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface ItemCardProps {
  item: Item
}

export function ItemCard({ item }: ItemCardProps) {
  const displayTitle = item.title || item.url
  const displaySummary = item.summary || '暂无摘要'
  const visibleTags = item.tags.slice(0, 3)
  const remainingCount = item.tags.length - 3

  const timeAgo = formatDistanceToNow(new Date(item.created_at), {
    addSuffix: true,
    locale: zhCN,
  })

  return (
    <Link to="/items/$id" params={{ id: item.id }}>
      <Card className="group h-full overflow-hidden border border-border/60 bg-card shadow-[var(--shadow-card)] transition-all duration-500 ease-out hover:shadow-[var(--shadow-float)] hover:-translate-y-1">
        <CardHeader className="aspect-[16/9] p-0 overflow-hidden bg-sidebar/40 flex items-center justify-center relative">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          {item.domain && (
            <div className="text-center z-10">
              <span className="font-serif text-6xl font-bold text-border/70">
                {item.domain.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </CardHeader>
        <CardBody className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              {item.domain || 'link'}
            </p>
            <span className="text-[10px] font-semibold text-muted-foreground/80">
              {timeAgo}
            </span>
          </div>

          <h3 className="font-serif font-semibold text-base leading-snug line-clamp-2 text-foreground/90 group-hover:text-primary transition-colors">
            {displayTitle}
          </h3>

          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {displaySummary}
          </p>

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {visibleTags.map((tag) => (
                <Chip
                  key={tag}
                  size="sm"
                  variant="flat"
                  className="bg-muted/60 text-muted-foreground text-[10px] font-bold tracking-wider uppercase border border-border/40"
                >
                  {tag}
                </Chip>
              ))}
              {remainingCount > 0 && (
                <Chip size="sm" variant="flat" className="bg-muted/40 text-muted-foreground text-[10px] font-semibold">
                  +{remainingCount}
                </Chip>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </Link>
  )
}
