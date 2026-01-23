import { Link } from '@tanstack/react-router'
import { Card, CardHeader, CardBody, CardFooter, Chip } from '@heroui/react'
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
      <Card className="h-full border-none shadow-sm hover:shadow-md transition-all hover:-translate-y-1 bg-[#FDFBF7]">
        <CardHeader className="h-40 p-0 overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center relative group">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          {item.domain && (
            <div className="text-center z-10 transition-transform group-hover:scale-105">
              <div className="text-4xl mb-2 opacity-80">
                <span className="font-serif italic text-stone-600 font-bold text-5xl">
                  {item.domain.charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="text-xs font-medium tracking-wider text-stone-500 uppercase">{item.domain}</p>
            </div>
          )}
        </CardHeader>
        <CardBody className="pt-4 px-5 pb-2 flex-grow">
          <h3 className="font-serif font-bold text-lg leading-tight line-clamp-2 mb-3 text-stone-800">
            {displayTitle}
          </h3>
          <p className="text-sm text-stone-500 line-clamp-3 leading-relaxed font-sans">
            {displaySummary}
          </p>
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {visibleTags.map((tag) => (
                <Chip key={tag} size="sm" variant="flat" className="bg-stone-200/50 text-stone-600 text-[10px] font-medium tracking-wide">
                  {tag}
                </Chip>
              ))}
              {remainingCount > 0 && (
                <Chip size="sm" variant="light" className="text-stone-400 text-[10px]">
                  +{remainingCount}
                </Chip>
              )}
            </div>
          )}
        </CardBody>
        <CardFooter className="px-5 py-4 text-[10px] text-stone-400 font-medium tracking-widest uppercase border-t border-stone-100 flex justify-between items-center">
          <span>{item.domain}</span>
          <span>
            {formatDistanceToNow(new Date(item.created_at), {
              addSuffix: true,
              locale: zhCN,
            })}
          </span>
        </CardFooter>
      </Card>
    </Link>
  )
}
