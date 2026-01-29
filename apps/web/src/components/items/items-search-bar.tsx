import { useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Input, Tabs, Tab, Button } from '@/components/base'
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
    const nextQ = query || undefined
    if (search.q === nextQ) return

    const timer = setTimeout(() => {
      navigate({
        search: (prev) => ({ ...prev, q: nextQ }),
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [query, navigate, search.q])

  useEffect(() => {
    if (mode === 'tags' && tags) {
      if (!query) {
        setFilteredTags(tags)
      } else {
        const filtered = tags.filter((tag) => tag.name.toLowerCase().includes(query.toLowerCase()))
        setFilteredTags(filtered)
      }
    }
  }, [query, mode, tags])

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex-1 md:max-w-[40%]">
            <Input
              placeholder={mode === 'content' ? '搜索你的记忆...' : '搜索标签...'}
              value={query}
              onValueChange={setQuery}
              startContent={<Search className="h-4 w-4 text-muted-foreground" />}
              size="md"
              isClearable
              variant="flat"
              classNames={{
                inputWrapper: "px-4 bg-muted/50 border border-border/60 focus-within:border-border",
                input: "font-medium",
              }}
            />
          </div>

          <Tabs
            selectedKey={mode}
            onSelectionChange={(key) => setMode(key as 'content' | 'tags')}
            size="md"
            color="primary"
            radius="md"
          >
            <Tab key="content" title="内容" />
            <Tab key="tags" title="标签" />
          </Tabs>
        </div>

        <Button
          onPress={onCreateClick}
          color="default"
          size="md"
          startContent={<Plus className="h-4 w-4" />}
          className="rounded-full px-5"
        >
          保存网页
        </Button>
      </div>

      {mode === 'tags' && query && (
        <div className="mt-3 flex flex-wrap gap-2">
          {filteredTags.map((tag) => (
            <Button
              key={tag.id}
              variant="bordered"
              size="sm"
              onPress={() => navigate({ to: '/items/tags/$tag', params: { tag: tag.name } })}
            >
              {tag.name}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
