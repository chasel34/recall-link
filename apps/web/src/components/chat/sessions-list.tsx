import { Button, Listbox, ListboxItem, ScrollShadow } from "@heroui/react"
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
      <div className="p-4 border-b border-default-100">
        <Button 
          className="w-full justify-start font-medium" 
          color="primary" 
          variant="flat"
          startContent={<MessageSquarePlus className="w-4 h-4" />}
          onPress={() => {
            if (onNewChat) onNewChat()
            navigate({ to: '/chat' })
          }}
        >
          新对话
        </Button>
      </div>
      
      <ScrollShadow className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-default-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="p-2">
            <Listbox 
              aria-label="Chat Sessions"
              variant="flat"
              disallowEmptySelection
              selectionMode="single"
              selectedKeys={currentSessionId ? [currentSessionId] : []}
              onAction={(key) => navigate({ to: `/chat/${key}` })}
              classNames={{
                list: "gap-1"
              }}
            >
              {sessions.map((session) => (
                <ListboxItem
                  key={session.id}
                  textValue={session.title || "新对话"}
                  className={cn(
                    "px-3 py-2 rounded-lg data-[selected=true]:bg-default-100",
                    currentSessionId === session.id ? "bg-default-100 font-medium" : "text-default-500"
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <span className="truncate text-sm text-foreground">
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
