import React from 'react'
import { createRootRoute, Navigate, Outlet, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { AppLayout } from '@/components/layout/app-layout'
import { addToast, ToastViewport } from '@/lib/toast'
import { queryClient } from '@/lib/query-client'
import type { Item, ListItemsResponse } from '@/lib/api-client'
import { subscribeSSE } from '@/lib/sse'
import { Spinner } from '@/components/base'
import { useMe } from '@/hooks/use-me'

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
        (oldData: ListItemsResponse | undefined) => {
          if (!oldData) return oldData
          const idx = oldData.items.findIndex((it) => it.id === item.id)
          if (idx < 0) return oldData

          const nextItems = oldData.items.slice()
          nextItems[idx] = { ...nextItems[idx], ...item }

          return {
            ...oldData,
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
  }, [me.user])

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
