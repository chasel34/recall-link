import { Link, useRouterState } from '@tanstack/react-router'
import { FileText, MessageSquare, Settings } from 'lucide-react'
import { Button } from "@heroui/react"
import { ReactNode } from 'react'

interface AppSidebarProps {
  onItemClick?: () => void
  children?: ReactNode
}

export function AppSidebar({ onItemClick, children }: AppSidebarProps) {
  const router = useRouterState()
  const currentPath = router.location.pathname
  const isActive = (path: string) => currentPath.startsWith(path)

  const menuItems = [
    { name: '记录', path: '/items', icon: FileText, disabled: false },
    { name: '对话', path: '/chat', icon: MessageSquare, disabled: false },
    { name: '设置', path: '/settings', icon: Settings, disabled: true },
  ]

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-6 border-b dark:border-default-100">
        <h1 className="text-xl font-bold">Recall Link</h1>
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
      
      {children && (
        <div className="flex-1 border-t border-default-100 overflow-hidden flex flex-col">
          {children}
        </div>
      )}
    </div>
  )
}
