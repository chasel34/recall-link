import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { FileText, MessageSquare, Settings, LogOut } from 'lucide-react'
import { Button } from "@/components/base"
import { ReactNode } from 'react'
import React from 'react'
import { apiClient } from '@/lib/api-client'
import { queryClient } from '@/lib/query-client'

interface AppSidebarProps {
  onItemClick?: () => void
  children?: ReactNode
}

export function AppSidebar({ onItemClick, children }: AppSidebarProps) {
  const router = useRouterState()
  const navigate = useNavigate()
  const currentPath = router.location.pathname
  const isActive = (path: string) => currentPath.startsWith(path)

  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const menuItems = [
    { name: '记录', path: '/items', icon: FileText, disabled: false },
    { name: '对话', path: '/chat', icon: MessageSquare, disabled: false },
    { name: '设置', path: '/settings', icon: Settings, disabled: true },
  ]

  return (
    <div className="h-full flex flex-col bg-sidebar">
      <div className="p-6 border-b border-border/40">
        <h1 className="text-xl font-semibold font-serif text-foreground/90">Recall Link</h1>
      </div>
      <div className="p-4 space-y-2">
        {menuItems.map((item) => (
          <div key={item.name}>
            {item.disabled ? (
              <Button
                isDisabled
                variant="light"
                className="w-full justify-start"
                startContent={<item.icon className="w-4 h-4" />}
              >
                {item.name}
              </Button>
            ) : (
              <Link to={item.path} className="block w-full" onClick={onItemClick}>
                <Button
                  variant={isActive(item.path) ? "flat" : "light"}
                  color={isActive(item.path) ? "primary" : "default"}
                  className="w-full justify-start"
                  startContent={<item.icon className="w-4 h-4" />}
                  as="div"
                >
                  {item.name}
                </Button>
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 pb-4">
        <Button
          variant="light"
          className="w-full justify-start"
          startContent={<LogOut className="w-4 h-4" />}
          isLoading={isLoggingOut}
          onPress={async () => {
            if (isLoggingOut) return
            setIsLoggingOut(true)
            try {
              await apiClient.logout()
            } catch {
              // ignore
            } finally {
              queryClient.clear()
              setIsLoggingOut(false)
              await navigate({ to: '/login', replace: true })
            }
          }}
        >
          退出登录
        </Button>
      </div>
      
      {children && (
        <div className="flex-1 border-t border-border overflow-hidden flex flex-col">
          {children}
        </div>
      )}
    </div>
  )
}
