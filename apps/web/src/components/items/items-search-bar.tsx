import { useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Input, Tabs, Tab, Button } from '@heroui/react'
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
        const filtered = tags.filter((tag) => tag.name.toLowerCase().includes(query.toLowerCase()))
        setFilteredTags(filtered)
      }
    }
  }, [query, mode, tags])

  return (
    <div className="border-b p-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Input
            placeholder={mode === 'content' ? '搜索内容...' : '搜索标签...'}
            value={query}
            onValueChange={setQuery}
            startContent={<Search className="h-4 w-4 text-default-400" />}
            size="sm"
            isClearable
            classNames={{
              inputWrapper: "bg-default-100",
            }}
          />
        </div>

        <Tabs
          selectedKey={mode}
          onSelectionChange={(key) => setMode(key as 'content' | 'tags')}
          size="sm"
          color="primary"
          radius="md"
        >
          <Tab key="content" title="内容" />
          <Tab key="tags" title="标签" />
        </Tabs>

        <Button onPress={onCreateClick} color="primary" size="sm" startContent={<Plus className="h-4 w-4" />}>
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
