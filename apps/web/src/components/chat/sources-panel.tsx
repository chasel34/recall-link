import { ScrollShadow } from "@heroui/react"
import { ChatSource } from "../../lib/api-client"
import { SourceCard } from "./source-card"

interface SourcesPanelProps {
  sources: ChatSource[]
}

export function SourcesPanel({ sources }: SourcesPanelProps) {
  if (!sources || sources.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center">
        <div className="text-muted-foreground">
          <p className="text-sm">Sources will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider font-sans">
          Sources ({sources.length})
        </h3>
      </div>
      <ScrollShadow className="flex-1 p-4 overflow-y-auto">
        <div className="flex flex-col gap-3">
          {sources.map((source, i) => (
            <SourceCard key={`${source.item_id}-${i}`} source={source} />
          ))}
        </div>
      </ScrollShadow>
    </div>
  )
}
