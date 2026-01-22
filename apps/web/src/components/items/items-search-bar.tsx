import { useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Button } from '@/components/ui/button'
import { Search, Plus } from 'lucide-react'
import { useSearchMode } from '@/hooks/use-search-mode'
import { useTags } from '@/hooks/use-tags'

interface ItemsSearchBarProps {
  onCreateClick: () => void
}

export function ItemsSearchBar({ onCreateClick }: ItemsSearchBarProps) {
  const navigate = useNavigate({ from: '/items/' })
  const search = useSearch({ from: '/items/' })
  const { mode, setMode } = useSearchMode()
  const { data: tags } = useTags()

  const [query, setQuery] = useState(search.q || '')
  const [filteredTags, setFilteredTags] = useState(tags || [])

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate({
        search: { q: query || undefined },
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [query, navigate])

  useEffect(() => {
    if (mode === 'tags' && tags) {
      if (!query) {
        setFilteredTags(tags)
      } else {
        const filtered = tags.filter((tag) =>
          tag.tag.toLowerCase().includes(query.toLowerCase())
        )
        setFilteredTags(filtered)
      }
    }
  }, [query, mode, tags])

  return (
    <div className="border-b p-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={mode === 'content' ? '搜索内容...' : '搜索标签...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(value) => {
            if (value) setMode(value as 'content' | 'tags')
          }}
        >
          <ToggleGroupItem value="content" aria-label="搜索内容">
            内容
          </ToggleGroupItem>
          <ToggleGroupItem value="tags" aria-label="搜索标签">
            标签
          </ToggleGroupItem>
        </ToggleGroup>

        <Button onClick={onCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          保存网页
        </Button>
      </div>

      {mode === 'tags' && query && (
        <div className="mt-3 flex flex-wrap gap-2">
          {filteredTags.map((tag) => (
            <Button
              key={tag.tag}
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/items/tags/$tag', params: { tag: tag.tag } })}
            >
              {tag.tag}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
