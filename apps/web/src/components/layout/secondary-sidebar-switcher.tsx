import { useRouterState, useParams } from '@tanstack/react-router'
import { ItemsTagSidebar } from '@/components/items/items-tag-sidebar'
import { SessionsList } from '@/components/chat/sessions-list'
import { cn } from '@/lib/utils'

interface SecondarySidebarSwitcherProps {
  className?: string
}

export function SecondarySidebarSwitcher({ className }: SecondarySidebarSwitcherProps) {
  const router = useRouterState()
  const params = useParams({ strict: false }) as Record<string, unknown>
  const pathname = router.location.pathname
  
  const chatId = typeof params.id === 'string' ? params.id : undefined

  const isItemsList = pathname === '/items' || pathname === '/items/'
  const isItemsTags = pathname.startsWith('/items/tags/')
  const isItemsDetail =
    pathname.startsWith('/items/') && !isItemsList && !isItemsTags && /^\/items\/[^/]+$/.test(pathname)

  // Reading view should be distraction-free (no secondary sidebar)
  if (isItemsDetail) return null

  if (pathname.startsWith('/items')) {
    return (
      <div
        className={cn(
          className
            ? "flex flex-col min-h-0 bg-sidebar/40"
            : "h-full w-72 border-r border-sidebar-border flex flex-col bg-sidebar/60 backdrop-blur-sm",
          className
        )}
      >
        <ItemsTagSidebar />
      </div>
    )
  }

  if (pathname.startsWith('/chat')) {
    return (
      <div
        className={cn(
          className
            ? "flex flex-col min-h-0 bg-sidebar/40"
            : "h-full w-80 border-r border-sidebar-border flex flex-col bg-sidebar/60 backdrop-blur-sm",
          className
        )}
      >
        <SessionsList currentSessionId={chatId} />
      </div>
    )
  }

  return null
}
