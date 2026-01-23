import React from 'react'
import ReactDOM from 'react-dom/client'
import { HeroUIProvider } from '@heroui/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { queryClient } from './lib/query-client'
import './index.css'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HeroUIProvider
        navigate={(to) => router.navigate({ to })}
        useHref={(to) => router.buildLocation({ to }).href}
      >
        <RouterProvider router={router} />
      </HeroUIProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
