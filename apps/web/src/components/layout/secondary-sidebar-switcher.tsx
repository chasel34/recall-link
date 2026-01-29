import { useRouterState, useParams } from '@tanstack/react-router'
import { ItemsTagSidebar } from '@/components/items/items-tag-sidebar'
import { SessionsList } from '@/components/chat/sessions-list'
import { cn } from '@/lib/utils'

interface SecondarySidebarSwitcherProps {
  className?: string
}

export function SecondarySidebarSwitcher({ className }: SecondarySidebarSwitcherProps) {
  const router = useRouterState()
  const params = useParams({ strict: false })
  const pathname = router.location.pathname
  
  // Need to cast params to access dynamic properties since strict is false
  const chatId = (params as any).id as string | undefined

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
