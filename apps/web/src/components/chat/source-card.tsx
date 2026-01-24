import { Card, CardBody, CardFooter, Link } from "@heroui/react"
import { ExternalLink, FileText } from "lucide-react"

export interface Source {
  item_id?: string
  title?: string
  url?: string
  snippet?: string
}

interface SourceCardProps {
  source: Source
}

export function SourceCard({ source }: SourceCardProps) {
  return (
    <Card className="w-full bg-content2 dark:bg-content1 border-none shadow-sm hover:bg-content3 transition-colors">
      <CardBody className="p-3 gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded-md bg-default-100 text-default-500 shrink-0">
              <FileText className="w-3 h-3" />
            </div>
            <h4 className="text-sm font-medium truncate text-foreground">
              {source.title || "Untitled Source"}
            </h4>
          </div>
        </div>
        {source.snippet && (
          <p className="text-xs text-default-500 line-clamp-3 leading-relaxed">
            {source.snippet}
          </p>
        )}
      </CardBody>
      <CardFooter className="p-3 pt-0 flex justify-end gap-2">
        {source.item_id && (
          <Link
            href={`/items/${source.item_id}`}
            color="primary"
            size="sm"
            className="text-xs"
          >
            View Item
          </Link>
        )}
        {source.url && (
          <Link
            isExternal
            href={source.url}
            color="foreground"
            size="sm"
            className="text-xs gap-1 text-default-500 hover:text-foreground"
          >
            Open <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </CardFooter>
    </Card>
  )
}
