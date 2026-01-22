import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

  return (
    <Link to="/items/$id" params={{ id: item.id }}>
      <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer">
        <CardHeader className="h-40 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
          {item.domain && (
            <div className="text-center">
              <div className="text-4xl mb-2">🔗</div>
              <p className="text-sm text-muted-foreground">{item.domain}</p>
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-4">
          <h3 className="font-semibold line-clamp-2 mb-2">{displayTitle}</h3>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {displaySummary}
          </p>
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {visibleTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {remainingCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  +{remainingCount}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          {item.domain} •{' '}
          {formatDistanceToNow(new Date(item.created_at), {
            addSuffix: true,
            locale: zhCN,
          })}
        </CardFooter>
      </Card>
    </Link>
  )
}
