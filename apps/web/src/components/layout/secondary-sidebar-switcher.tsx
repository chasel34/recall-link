import { useRouterState, useParams } from '@tanstack/react-router'
import { ItemsTagSidebar } from '@/components/items/items-tag-sidebar'
import { SessionsList } from '@/components/chat/sessions-list'

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
      <div className={className ?? "h-full w-64 border-r dark:border-default-100 flex flex-col bg-content2/20"}>
        <ItemsTagSidebar />
      </div>
    )
  }

  if (pathname.startsWith('/chat')) {
    return (
      <div className={className ?? "h-full w-64 border-r dark:border-default-100 flex flex-col bg-background"}>
        <SessionsList currentSessionId={chatId} />
      </div>
    )
  }

  return null
}
