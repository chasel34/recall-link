import { ScrollShadow } from "@heroui/react"
import { Streamdown } from "streamdown"
import { useEffect, useRef, useMemo } from "react"
import rehypeRaw from "rehype-raw"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import { ChatMessage } from "../../lib/api-client"
import { cn } from "../../lib/utils"
import { SourcesBlock, SourceItem } from "./inline-sources"

interface MessageListProps {
  messages: ChatMessage[]
  isStreaming?: boolean
}

const sourcesSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "sources", "source"],
  attributes: {
    ...defaultSchema.attributes,
    source: ["title", "url", "item_id"],
  },
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, messages[messages.length - 1]?.content])

  const components = useMemo(() => ({
    sources: SourcesBlock as any,
    source: SourceItem as any,
  }), [])

  return (
    <ScrollShadow className="h-full w-full p-4 overflow-y-auto">
      <div className="max-w-3xl mx-auto flex flex-col gap-6 py-4">
        {messages.map((msg, index) => {
          const isUser = msg.role === "user"
          const isLast = index === messages.length - 1
          
          const hasCompleteSources = msg.content.includes("</sources>")
          const rehypePlugins = hasCompleteSources 
            ? [rehypeRaw, [rehypeSanitize, sourcesSchema]] as any
            : undefined
          const remarkRehypeOptions = hasCompleteSources 
            ? { allowDangerousHtml: true } 
            : undefined

          return (
            <div
              key={msg.id}
              className={cn(
                "flex w-full",
                isUser ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "relative max-w-[85%] rounded-2xl px-5 py-3.5 text-sm shadow-sm",
                  isUser
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-content2 text-foreground rounded-bl-sm"
                )}
              >
                {isUser ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <div className="prose dark:prose-invert max-w-none prose-sm prose-p:my-1 prose-pre:my-1 prose-headings:my-2">
                    <Streamdown 
                      isAnimating={isLast && isStreaming}
                      components={components}
                      rehypePlugins={rehypePlugins}
                      remarkRehypeOptions={remarkRehypeOptions}
                    >
                      {msg.content}
                    </Streamdown>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </ScrollShadow>
  )
}
