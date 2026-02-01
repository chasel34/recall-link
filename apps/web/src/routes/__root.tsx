import React from 'react'
import { createRootRoute, Navigate, Outlet, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { AppLayout } from '@/components/layout/app-layout'
import { addToast, ToastViewport } from '@/lib/toast'
import { queryClient } from '@/lib/query-client'
import { apiClient, type Item, type ListItemsResponse } from '@/lib/api-client'
import { subscribeSSE } from '@/lib/sse'
import { Spinner } from '@/components/base'
import { useMe } from '@/hooks/use-me'
import { useAiSettings } from '@/hooks/ai-settings'

const DEFAULT_LOCAL_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

function AgentationDev() {
  const [Component, setComponent] = React.useState<React.ComponentType | null>(
    null
  )

  React.useEffect(() => {
    if (!import.meta.env.DEV) return

    let cancelled = false
    void import('agentation').then(({ Agentation }) => {
      if (cancelled) return
      setComponent(() => Agentation)
    })

    return () => {
      cancelled = true
    }
  }, [])

  if (!import.meta.env.DEV || !Component) return null
  return <Component />
}

export const Route = createRootRoute({
  component: Root,
})

type ItemUpdatedEnvelope = {
  v: 1
  ts: string
  type: 'item.updated'
  data: {
    item: Item
    source: 'fetch' | 'ai' | 'system'
  }
}

function Root() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  })

  const isAuthRoute = pathname === '/login' || pathname === '/register'

  const me = useMe({ enabled: !isAuthRoute })
  const aiSettings = useAiSettings(me.user?.id)
  const aiSettingsRef = React.useRef({
    mode: aiSettings.mode,
    gemini: aiSettings.gemini,
  })
  const localAiQueueRef = React.useRef<Item[]>([])
  const localAiPendingRef = React.useRef(new Set<string>())
  const localAiProcessingRef = React.useRef(false)
  const missingApiKeyToastRef = React.useRef(false)

  React.useEffect(() => {
    aiSettingsRef.current = {
      mode: aiSettings.mode,
      gemini: {
        apiKey: aiSettings.gemini.apiKey,
        baseURL: aiSettings.gemini.baseURL,
        model: aiSettings.gemini.model,
      },
    }
  }, [aiSettings.mode, aiSettings.gemini.apiKey, aiSettings.gemini.baseURL, aiSettings.gemini.model])

  const processLocalAiQueue = React.useCallback(async () => {
    if (localAiProcessingRef.current) return
    localAiProcessingRef.current = true

    try {
      while (localAiQueueRef.current.length > 0) {
        const nextItem = localAiQueueRef.current.shift()
        if (!nextItem) break
        localAiPendingRef.current.delete(nextItem.id)

        const settings = aiSettingsRef.current
        if (settings.mode !== 'local') continue

        const apiKey = settings.gemini.apiKey?.trim()
        if (!apiKey) {
          if (!missingApiKeyToastRef.current) {
            missingApiKeyToastRef.current = true
            addToast({
              title: '缺少 Gemini API Key',
              description: '请在设置中添加 API Key 后再试',
              color: 'danger',
            })
          }
          continue
        }

        const latest = queryClient.getQueryData<Item>(['items', nextItem.id])
        const candidate = latest ?? nextItem

        if (candidate.ai_mode !== 'local') continue
        if (candidate.status !== 'completed') continue
        if (!candidate.clean_text) continue
        if (candidate.summary) continue

        try {
          const { generateTagsAndSummary, mergeTagsWithExisting } = await import('@recall-link/ai')

          const config = {
            apiKey,
            model: settings.gemini.model,
            baseURL: settings.gemini.baseURL?.trim() || DEFAULT_LOCAL_GEMINI_BASE_URL,
          }

          const existingTagNames = (await apiClient.listTags()).map((t) => t.name)
          const generated = await generateTagsAndSummary(candidate.clean_text, config)
          const mergedTags = await mergeTagsWithExisting(generated.tags, existingTagNames, config)

          await apiClient.applyAiToItem(candidate.id, {
            summary: generated.summary,
            tags: mergedTags,
          })
        } catch (error) {
          console.error('Local AI generation failed', error)
          continue
        }
      }
    } finally {
      localAiProcessingRef.current = false
    }
  }, [])

  const enqueueLocalAi = React.useCallback(
    (item: Item, source: ItemUpdatedEnvelope['data']['source']) => {
      if (source !== 'fetch') return
      if (item.ai_mode !== 'local') return
      if (item.status !== 'completed') return
      if (!item.clean_text) return
      if (item.summary) return

      const settings = aiSettingsRef.current
      if (settings.mode !== 'local') return

      if (!settings.gemini.apiKey?.trim()) {
        if (!missingApiKeyToastRef.current) {
          missingApiKeyToastRef.current = true
          addToast({
            title: '缺少 Gemini API Key',
            description: '请在设置中添加 API Key 后再试',
          color: 'danger',
          })
        }
        return
      }

      if (localAiPendingRef.current.has(item.id)) return
      localAiPendingRef.current.add(item.id)
      localAiQueueRef.current.push(item)
      void processLocalAiQueue()
    },
    [processLocalAiQueue]
  )

  React.useEffect(() => {
    if (!me.user) return

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8787'
    const onItemUpdated = (event: MessageEvent) => {
      let payload: ItemUpdatedEnvelope
      try {
        payload = JSON.parse(event.data) as ItemUpdatedEnvelope
      } catch {
        return
      }

      const item = payload.data?.item
      if (!item?.id) return

      const prev = queryClient.getQueryData<Item>(['items', item.id])

      queryClient.setQueryData<Item>(['items', item.id], (old) => {
        if (!old) return item
        return { ...old, ...item }
      })

      queryClient.setQueriesData(
        { queryKey: ['items'] },
        (oldData: unknown) => {
          if (!oldData || typeof oldData !== 'object' || !('items' in oldData) || !Array.isArray((oldData as any).items)) {
            return oldData
          }
          const data = oldData as ListItemsResponse
          const idx = data.items.findIndex((it) => it.id === item.id)
          if (idx < 0) return oldData

          const nextItems = data.items.slice()
          nextItems[idx] = { ...nextItems[idx], ...item }

          return {
            ...data,
            items: nextItems,
          }
        }
      )

      if (payload.data.source === 'ai') {
        queryClient.invalidateQueries({ queryKey: ['tags'] })

        const prevHadSummary = !!prev?.summary
        const nextHasSummary = !!item.summary
        if (!prevHadSummary && nextHasSummary) {
          addToast({
            title: 'AI 处理完成',
            description: '摘要和标签已生成',
            color: 'success',
          })
        }
      }

      enqueueLocalAi(item, payload.data.source)
    }

    const sub = subscribeSSE({
      url: `${apiBase}/api/items/events`,
      method: 'GET',
      events: ['item.updated'],
      onEvent: (e) => {
        if (e.event !== 'item.updated') return
        onItemUpdated({ data: e.data } as MessageEvent)
      },
    })

    return () => {
      sub.close()
    }
  }, [enqueueLocalAi, me.user])

  if (isAuthRoute) {
    return (
      <>
        <Outlet />
        <AgentationDev />
        <ToastViewport />
        <TanStackRouterDevtools />
      </>
    )
  }

  if (me.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Spinner className="h-5 w-5" />
          <span className="text-sm">正在检查登录状态…</span>
        </div>
      </div>
    )
  }

  if (me.isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-border/60 bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="font-serif text-xl font-semibold">连接失败</div>
          <div className="mt-2 text-sm text-muted-foreground">
            {me.error?.message || '无法连接到服务器'}
          </div>
        </div>
      </div>
    )
  }

  if (!me.user) {
    return <Navigate to="/login" replace />
  }

  return (
    <>
      <AppLayout>
        <Outlet />
      </AppLayout>
      <AgentationDev />
      <ToastViewport />
      <TanStackRouterDevtools />
    </>
  )
}
