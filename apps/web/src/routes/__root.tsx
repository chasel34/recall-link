import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { AppLayout } from '@/components/layout/app-layout'
import { ToastProvider } from '@heroui/react'

export const Route = createRootRoute({
  component: () => (
    <>
      <AppLayout>
        <Outlet />
      </AppLayout>
      <ToastProvider placement="bottom-right" maxVisibleToasts={3} />
      <TanStackRouterDevtools />
    </>
  ),
})
