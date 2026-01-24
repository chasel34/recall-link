import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { apiClient, ChatMessage, ChatSource } from "../../lib/api-client"
import { useChatMessages } from "../../hooks/use-chat-messages"
import { ChatLayout } from "./chat-layout"
import { Composer } from "./composer"
import { MessageList } from "./message-list"
import { SessionsList } from "./sessions-list"
import { SourcesPanel } from "./sources-panel"

interface ChatContainerProps {
  sessionId?: string
  initialMessage?: string
}

export function ChatContainer({ sessionId, initialMessage }: ChatContainerProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sources, setSources] = useState<ChatSource[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const streamingUserIdRef = useRef<string | null>(null)
  const streamingAssistantIdRef = useRef<string | null>(null)
  const isFirstRender = useRef(true)

  // Fetch messages if sessionId exists
  const { data: historyData, isLoading: isLoadingHistory } = useChatMessages(sessionId || "")

  // Sync history to local state
  useEffect(() => {
    if (historyData?.messages) {
      setMessages(historyData.messages)
      const lastMsg = historyData.messages[historyData.messages.length - 1]
      if (lastMsg?.role === 'assistant' && lastMsg.meta_json) {
        try {
          const meta = JSON.parse(lastMsg.meta_json) as { sources?: ChatSource[] }
          setSources(meta.sources ?? [])
        } catch {
          setSources([])
        }
      } else setSources([])
    }
  }, [historyData])

  // Handle initial message (handoff from new chat)
  useEffect(() => {
    if (sessionId && initialMessage && isFirstRender.current) {
      isFirstRender.current = false
      handleSend(initialMessage)
    }
  }, [sessionId, initialMessage])

  const createSessionMutation = useMutation({
    mutationFn: () => apiClient.createChatSession(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] })
    }
  })

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsStreaming(false)
    }
  }

  const handleSend = async (content: string) => {
    let currentSessionId = sessionId

    if (!currentSessionId) {
      try {
        const session = await createSessionMutation.mutateAsync()
        currentSessionId = session.id
        
        navigate({ 
          to: '/chat/$id',
          params: { id: session.id },
          search: { q: content },
          replace: true
        })
        return
      } catch (err) {
        console.error("Failed to create session", err)
        return
      }
    }

    const userMsgId = `temp-${Date.now()}`
    const userMsg: ChatMessage = {
      id: userMsgId,
      session_id: currentSessionId,
      role: 'user',
      content,
      meta_json: null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsStreaming(true)
    setSources([])

    abortControllerRef.current = new AbortController()
    
    const assistantMsgId = `temp-ai-${Date.now()}`
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      session_id: currentSessionId,
      role: 'assistant',
      content: '',
      meta_json: null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, assistantMsg])

    streamingUserIdRef.current = userMsgId
    streamingAssistantIdRef.current = assistantMsgId

    try {
        apiClient.sendChatMessageStream(currentSessionId, content, {
          signal: abortControllerRef.current.signal,
          onMeta: (meta) => {
            if (meta.sources) {
              setSources(meta.sources)
            }
            if (meta.user_message_id && meta.assistant_message_id) {
              streamingUserIdRef.current = meta.user_message_id
              streamingAssistantIdRef.current = meta.assistant_message_id
              setMessages(prev => prev.map(m => {
                if (m.id === userMsgId) return { ...m, id: meta.user_message_id }
                if (m.id === assistantMsgId) {
                  return {
                    ...m,
                    id: meta.assistant_message_id,
                    meta_json: JSON.stringify({ sources: meta.sources }),
                  }
                }
                return m
              }))
            }
          },
          onDelta: (delta) => {
            const assistantId = streamingAssistantIdRef.current
            if (!assistantId) return
            setMessages(prev => prev.map(m => {
              if (m.id !== assistantId) return m
              return { ...m, content: m.content + delta }
            }))
          },
          onDone: () => {
            setIsStreaming(false)
            abortControllerRef.current = null
            streamingUserIdRef.current = null
            streamingAssistantIdRef.current = null
            queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] })
            queryClient.invalidateQueries({ queryKey: ['chat', 'messages', currentSessionId] })
          },
          onError: (err) => {
            console.error("Streaming error", err)
            setIsStreaming(false)
            streamingUserIdRef.current = null
            streamingAssistantIdRef.current = null
          }
        })
    } catch (err) {
      console.error("Send error", err)
      setIsStreaming(false)
    }
  }

  const handleNewChat = () => {
    handleStop()
  }

  return (
    <ChatLayout
      sidebar={
        <SessionsList 
          currentSessionId={sessionId} 
          onNewChat={handleNewChat}
        />
      }
      sourcesPanel={
        <SourcesPanel sources={sources} />
      }
      showSources={sources.length > 0}
    >
      <div className="flex flex-col h-full w-full min-h-0">
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {messages.length === 0 && !isLoadingHistory ? (
             <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <div className="i-lucide-sparkles w-8 h-8 text-primary" />
                </div>
               <h2 className="text-2xl font-bold">Recall Link AI</h2>
               <p className="text-default-500 max-w-md">
                 Ask questions about your saved items. I'll search through them and provide answers with sources.
               </p>
             </div>
          ) : (
            <MessageList messages={messages} isStreaming={isStreaming} />
          )}
        </div>
        <Composer 
          onSend={handleSend} 
          onStop={handleStop}
          isStreaming={isStreaming}
          isLoading={!sessionId && createSessionMutation.isPending}
        />
      </div>
    </ChatLayout>
  )
}
