import { Card, CardBody, CardFooter, Button } from "@heroui/react"
import { ExternalLink, FileText } from "lucide-react"
import { Link } from "@tanstack/react-router"
import type { ChatSource } from "@/lib/api-client"

interface SourceCardProps {
  source: ChatSource
}

export function SourceCard({ source }: SourceCardProps) {
  return (
    <Card className="w-full bg-card border border-border shadow-sm hover:shadow-md transition-all">
      <CardBody className="p-3 gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded-md bg-muted text-muted-foreground shrink-0">
              <FileText className="w-3 h-3" />
            </div>
            <h4 className="text-sm font-medium truncate text-foreground font-sans">
              {source.title || "Untitled Source"}
            </h4>
          </div>
        </div>
        {source.snippet && (
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {source.snippet}
          </p>
        )}
      </CardBody>
      <CardFooter className="p-3 pt-0 flex justify-end gap-2">
        {source.item_id && (
          <Button
            as={Link}
            to={`/items/${source.item_id}`}
            size="sm"
            variant="light"
            color="primary"
            className="text-xs h-7 min-w-0 px-2"
          >
            详情
          </Button>
        )}
        {source.url && (
          <Button
            size="sm"
            variant="light"
            className="text-xs h-7 min-w-0 px-2 text-muted-foreground"
            onPress={() => window.open(source.url, '_blank', 'noopener,noreferrer')}
            endContent={<ExternalLink className="w-3 h-3" />}
          >
            打开原文
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
