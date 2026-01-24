import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { apiClient, ChatMessage } from "../../lib/api-client"
import { ChatLayout } from "./chat-layout"
import { Composer } from "./composer"
import { MessageList } from "./message-list"
import { SessionsList } from "./sessions-list"
import { Source, SourceCard } from "./source-card"
import { SourcesPanel } from "./sources-panel"

interface ChatContainerProps {
  sessionId?: string
  initialMessage?: string
}

export function ChatContainer({ sessionId, initialMessage }: ChatContainerProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isFirstRender = useRef(true)

  // Fetch messages if sessionId exists
  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['chat-messages', sessionId],
    queryFn: () => sessionId ? apiClient.listChatMessages(sessionId) : Promise.resolve({ messages: [] }),
    enabled: !!sessionId,
  })

  // Sync history to local state
  useEffect(() => {
    if (historyData?.messages) {
      setMessages(historyData.messages)
      const lastMsg = historyData.messages[historyData.messages.length - 1]
      if (lastMsg?.role === 'assistant' && lastMsg.meta?.sources) {
        setSources(lastMsg.meta.sources)
      } else {
        setSources([])
      }
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] })
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
          to: `/chat/${session.id}`, 
          search: { q: content } as any 
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
      role: 'user',
      content,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMsg])
    setIsStreaming(true)
    setSources([])

    abortControllerRef.current = new AbortController()
    
    const assistantMsgId = `temp-ai-${Date.now()}`
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, assistantMsg])

    try {
      await apiClient.sendChatMessageStream(currentSessionId, content, {
        signal: abortControllerRef.current.signal,
        onMeta: (meta) => {
          if (meta.sources) {
            setSources(meta.sources)
          }
          if (meta.user_message_id && meta.assistant_message_id) {
            setMessages(prev => prev.map(m => {
              if (m.id === userMsgId) return { ...m, id: meta.user_message_id }
              if (m.id === assistantMsgId) return { ...m, id: meta.assistant_message_id, meta }
              return m
            }))
          }
        },
        onDelta: (delta) => {
          setMessages(prev => prev.map(m => {
            if (m.id === assistantMsgId || (m.role === 'assistant' && m.id === prev[prev.length-1].id)) {
              return { ...m, content: m.content + delta }
            }
            return m
          }))
        },
        onDone: () => {
          setIsStreaming(false)
          abortControllerRef.current = null
          queryClient.invalidateQueries({ queryKey: ['chat-sessions'] })
        },
        onError: (err) => {
          console.error("Streaming error", err)
          setIsStreaming(false)
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
      <div className="flex flex-col h-full w-full">
        <div className="flex-1 overflow-hidden relative">
          {messages.length === 0 && !isLoadingHistory ? (
             <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
               <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                 <div className="i-lucide-sparkles w-8 h-8 text-primary" />
               </div>
               <h2 className="text-2xl font-bold">How can I help you today?</h2>
               <p className="text-default-500 max-w-md">
                 Ask me about your saved items, or let me help you find connections between them.
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
