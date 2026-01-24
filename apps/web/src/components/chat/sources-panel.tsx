import { ScrollShadow } from "@heroui/react"
import { Source, SourceCard } from "./source-card"

interface SourcesPanelProps {
  sources: Source[]
}

export function SourcesPanel({ sources }: SourcesPanelProps) {
  if (!sources || sources.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center">
        <div className="text-default-400">
          <p className="text-sm">Sources will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-default-100 dark:border-default-50">
        <h3 className="font-semibold text-sm text-default-600 uppercase tracking-wider">
          Sources ({sources.length})
        </h3>
      </div>
      <ScrollShadow className="flex-1 p-4">
        <div className="flex flex-col gap-3">
          {sources.map((source, i) => (
            <SourceCard key={`${source.item_id}-${i}`} source={source} />
          ))}
        </div>
      </ScrollShadow>
    </div>
  )
}
