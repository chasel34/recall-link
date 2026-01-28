import type { ReactElement } from 'react'
import { HeroUIProvider } from '@heroui/react'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render } from '@testing-library/react'

export function renderWithRouter(ui: ReactElement) {
  const rootRoute = createRootRoute({
    component: () => (
      <HeroUIProvider>
        <Outlet />
      </HeroUIProvider>
    ),
  })

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => ui,
  })

  const itemRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/items/$id',
    component: () => <div>Item</div>,
  })

  const routeTree = rootRoute.addChildren([indexRoute, itemRoute])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  return render(<RouterProvider router={router} />)
}
