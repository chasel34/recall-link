import { Button, Listbox, ListboxItem, ScrollShadow } from "@/components/base"
import { useNavigate } from "@tanstack/react-router"
import { MessageSquarePlus } from "lucide-react"
import { useChatSessions } from "../../hooks/use-chat-sessions"
import { cn } from "../../lib/utils"

interface SessionsListProps {
  currentSessionId?: string
  onNewChat?: () => void
}

export function SessionsList({ currentSessionId, onNewChat }: SessionsListProps) {
  const navigate = useNavigate()
  const { data, isLoading } = useChatSessions()

  const sessions = data?.sessions || []

  return (
    <div className="flex flex-col h-full w-full min-h-0">
      <div className="h-20 px-6 flex items-center justify-between border-b border-border/40">
        <h2 className="text-sm font-semibold text-foreground/90 tracking-tight">知识对话</h2>
        <Button
          isIconOnly
          variant="light"
          onPress={() => {
            if (onNewChat) onNewChat()
            navigate({ to: '/chat' })
          }}
          aria-label="新对话"
          className="w-10 h-10 rounded-2xl hover:bg-card/70"
        >
          <MessageSquarePlus className="w-5 h-5" />
        </Button>
      </div>
      
      <ScrollShadow className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-5 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-2xl bg-muted/70 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="p-4">
            <Listbox 
              aria-label="Chat Sessions"
              variant="flat"
              disallowEmptySelection
              selectionMode="single"
              selectedKeys={currentSessionId ? [currentSessionId] : []}
              onAction={(key) => navigate({ to: `/chat/${key}` })}
                classNames={{
                list: "gap-2"
              }}
            >
              {sessions.map((session) => (
                <ListboxItem
                  key={session.id}
                  textValue={session.title || "新对话"}
                  className={cn(
                    "p-4 rounded-2xl border border-transparent hover:border-border/60 hover:bg-card/60 transition-all",
                    currentSessionId === session.id
                      ? "bg-card shadow-[var(--shadow-card)] ring-1 ring-border/60 text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <span className="truncate text-sm font-medium">
                      {session.title || "新对话"}
                    </span>
                  </div>
                </ListboxItem>
              ))}
            </Listbox>
          </div>
        )}
      </ScrollShadow>
    </div>
  )
}
