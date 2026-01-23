import React from 'react'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { AppLayout } from '@/components/layout/app-layout'
import { ToastProvider } from '@heroui/react'

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
  component: () => (
    <>
      <AppLayout>
        <Outlet />
      </AppLayout>
      <AgentationDev />
      <ToastProvider placement="bottom-right" maxVisibleToasts={3} />
      <TanStackRouterDevtools />
    </>
  ),
})
