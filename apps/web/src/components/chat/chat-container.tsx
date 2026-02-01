import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Sparkles } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { apiClient, ChatMessage, ChatStreamMeta } from "../../lib/api-client"
import { useChatMessages } from "../../hooks/use-chat-messages"
import { useChatSessions } from "../../hooks/use-chat-sessions"
import { useAiSettings } from "../../hooks/ai-settings"
import { addToast } from "../../lib/toast"
import { Composer } from "./composer"
import { MessageList } from "./message-list"

const DEFAULT_LOCAL_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

interface ChatContainerProps {
  sessionId?: string
  initialMessage?: string
}

export function ChatContainer({ sessionId, initialMessage }: ChatContainerProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const streamingUserIdRef = useRef<string | null>(null)
  const streamingAssistantIdRef = useRef<string | null>(null)
  const isFirstRender = useRef(true)
  const missingKeyToastShownRef = useRef(false)
  const aiSettings = useAiSettings()

  // Fetch messages if sessionId exists
  const { data: historyData, isLoading: isLoadingHistory } = useChatMessages(sessionId || "")

  const { data: sessionsData } = useChatSessions()
  const sessionTitle = sessionId
    ? sessionsData?.sessions?.find((s) => s.id === sessionId)?.title || "对话"
    : "Recall Link AI"

  // Sync history to local state
  useEffect(() => {
    if (historyData?.messages) {
      // Don't overwrite optimistic/streaming local state with partial history.
      // History can lag while the assistant stream is in-flight.
      if (isStreaming || streamingUserIdRef.current || streamingAssistantIdRef.current) return
      setMessages(historyData.messages)
    }
  }, [historyData, isStreaming])

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

  const handleSend = useCallback(async (content: string) => {

    if (aiSettings.mode === 'local' && !aiSettings.gemini.apiKey?.trim()) {
      if (!missingKeyToastShownRef.current) {
        missingKeyToastShownRef.current = true
        addToast({
          title: '缺少 API Key',
          description: '需要配置 Gemini API Key 才能使用本地模式。',
          color: 'danger',
        })
      }
      return
    }

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
      if (aiSettings.mode === 'remote') {
          apiClient.sendChatMessageStream(currentSessionId, content, {
            signal: abortControllerRef.current.signal,
            onMeta: (meta) => {
              if (meta.user_message_id && meta.assistant_message_id) {
                streamingUserIdRef.current = meta.user_message_id
                streamingAssistantIdRef.current = meta.assistant_message_id
                setMessages(prev => prev.map(m => {
                  if (m.id === userMsgId) return { ...m, id: meta.user_message_id }
                  if (m.id === assistantMsgId) {
                    return {
                      ...m,
                      id: meta.assistant_message_id,
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
        return
      }

      let preparedMeta: ChatStreamMeta | null = null
      let assistantContent = ''
      let aborted = false

      try {
        const prepared = await apiClient.prepareLocalChatMessage(currentSessionId, content)
        preparedMeta = prepared.meta
        streamingUserIdRef.current = prepared.meta.user_message_id
        streamingAssistantIdRef.current = prepared.meta.assistant_message_id
        setMessages(prev => prev.map(m => {
          if (m.id === userMsgId) return { ...m, id: prepared.meta.user_message_id }
          if (m.id === assistantMsgId) {
            return {
              ...m,
              id: prepared.meta.assistant_message_id,
            }
          }
          return m
        }))

        const { streamChatAnswer } = await import('@recall-link/ai')

        const stream = await streamChatAnswer(
          {
            question: content,
            history: prepared.history,
            sources: prepared.meta.sources,
            signal: abortControllerRef.current.signal,
          },
          {
            apiKey: aiSettings.gemini.apiKey.trim(),
            model: aiSettings.gemini.model,
            baseURL: aiSettings.gemini.baseURL?.trim() || DEFAULT_LOCAL_GEMINI_BASE_URL,
          }
        )

        for await (const delta of stream) {
          assistantContent += delta
          const assistantId = streamingAssistantIdRef.current
          if (!assistantId) continue
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m
              return { ...m, content: m.content + delta }
            })
          )
        }

        aborted = abortControllerRef.current?.signal.aborted ?? false
      } catch (err) {
        aborted = abortControllerRef.current?.signal.aborted ?? false
        if (!aborted) {
          console.error("Local streaming error", err)
          addToast({
            title: '本地 AI 出错',
            description: '生成失败，请检查 API Key 和网络后重试。',
            color: 'danger',
          })
        }
      } finally {
        setIsStreaming(false)
        abortControllerRef.current = null
        const assistantId = preparedMeta?.assistant_message_id
        streamingUserIdRef.current = null
        streamingAssistantIdRef.current = null

        if (preparedMeta && assistantId && assistantContent.trim()) {
          try {
            await apiClient.persistLocalChatAssistantMessage(currentSessionId, {
              assistant_message_id: assistantId,
              content: assistantContent,
              meta_json: JSON.stringify({
                sources: preparedMeta.sources,
                aborted,
                provider: 'gemini',
                mode: 'local',
              }),
            })
          } catch (persistError) {
            console.error('Failed to persist local assistant message', persistError)
          }
        }

        queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] })
        queryClient.invalidateQueries({ queryKey: ['chat', 'messages', currentSessionId] })
      }
    } catch (err) {
      console.error("Send error", err)
      setIsStreaming(false)
    }
  }, [aiSettings, createSessionMutation, navigate, queryClient, sessionId])

  // Handle initial message (handoff from new chat)
  useEffect(() => {
    if (sessionId && initialMessage && isFirstRender.current) {
      isFirstRender.current = false
      handleSend(initialMessage)
    }
  }, [sessionId, initialMessage, handleSend])

  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-background">
      <div className="h-20 flex items-center justify-between px-6 lg:px-10 border-b border-border/40 bg-background/70 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className={sessionId ? "w-2 h-2 rounded-full bg-emerald-500" : "w-2 h-2 rounded-full bg-muted-foreground/40"} />
          <h1 className="text-sm font-semibold text-foreground/90 tracking-tight truncate">
            {sessionTitle}
          </h1>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden relative">
        {messages.length === 0 && !isLoadingHistory ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2 max-w-md">
                <h2 className="font-serif text-2xl font-semibold text-foreground">Recall Link AI</h2>
                <p className="text-muted-foreground">
                  询问你的收藏知识库，我会结合来源为你整理答案。
                </p>
              </div>
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
  )
}
