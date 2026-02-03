import { ScrollShadow } from "@/components/base"
import { Streamdown } from "streamdown"
import { useCallback, useEffect, useMemo, useRef } from "react"
import rehypeRaw from "rehype-raw"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import { ChatMessage } from "../../lib/api-client"
import { cn } from "../../lib/utils"
import { SourcesBlock, SourceItem } from "./inline-sources"
import { Sparkles, User } from "lucide-react"
import { TypingIndicator } from "./typing-indicator"

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
  const viewportRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isPinnedToBottomRef = useRef(true)
  const lastScrolledMessageIdRef = useRef<string | null>(null)
  const lastScrolledMessageContentRef = useRef<string | null>(null)

  const handleViewportScroll = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const threshold = 64
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isPinnedToBottomRef.current = distanceFromBottom <= threshold
  }, [])

  const lastMessage = messages[messages.length - 1]
  const lastMessageId = lastMessage?.id
  const lastMessageContent = lastMessage?.content

  useEffect(() => {
    if (!lastMessageId) return
    if (!isPinnedToBottomRef.current) return

    const isFirstAutoScroll = lastScrolledMessageIdRef.current === null
    const isSameMessage = lastScrolledMessageIdRef.current === lastMessageId
    const isDeltaUpdate = isSameMessage && lastScrolledMessageContentRef.current !== lastMessageContent
    const behavior: ScrollBehavior =
      isFirstAutoScroll || (isStreaming && isDeltaUpdate) ? 'auto' : 'smooth'
    bottomRef.current?.scrollIntoView({ behavior })
    lastScrolledMessageIdRef.current = lastMessageId
    lastScrolledMessageContentRef.current = lastMessageContent ?? null
  }, [isStreaming, lastMessageId, lastMessageContent])

  const components = useMemo(() => ({
    sources: SourcesBlock as any,
    source: SourceItem as any,
  }), [])

  return (
    <ScrollShadow
      className="h-full w-full overflow-y-auto px-6 lg:px-10 py-10"
      viewportRef={viewportRef}
      viewportProps={{ onScroll: handleViewportScroll }}
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-10">
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
              <div className="max-w-[92%] sm:max-w-[86%] lg:max-w-[72%] xl:max-w-[66%]">
                <div
                  className={cn(
                    "flex items-center gap-3 mb-3",
                    isUser ? "justify-end" : "justify-start"
                  )}
                >
                  {!isUser ? (
                    <>
                      <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.22em]">
                        Recall Link AI
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.22em]">
                        YOU
                      </span>
                      <div className="w-6 h-6 rounded-lg bg-muted/70 border border-border/60 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </>
                  )}
                </div>

                <div
                  className={cn(
                    "relative rounded-3xl px-6 py-5 text-[15px] leading-relaxed",
                    isUser
                      ? "bg-card text-foreground border border-border/60 shadow-[var(--shadow-card)]"
                      : "bg-muted/60 text-foreground/90 border border-border/40"
                  )}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                  ) : (
                    <div className="prose prose-neutral dark:prose-invert max-w-none prose-sm prose-p:my-2 prose-pre:my-2 prose-headings:my-3 font-serif">
                      {isLast && isStreaming && !msg.content ? (
                        <TypingIndicator />
                      ) : (
                        <Streamdown
                          isAnimating={isLast && isStreaming}
                          components={components}
                          rehypePlugins={rehypePlugins}
                          remarkRehypeOptions={remarkRehypeOptions}
                        >
                          {msg.content}
                        </Streamdown>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </ScrollShadow>
  )
}
