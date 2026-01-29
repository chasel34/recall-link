import { Link, useRouterState } from '@tanstack/react-router'
import { FileText, MessageSquare, Settings, Command } from 'lucide-react'
import { Button, Tooltip } from "@/components/base"

interface PrimaryNavRailProps {
  className?: string
}

export function PrimaryNavRail({ className }: PrimaryNavRailProps) {
  const router = useRouterState()
  const currentPath = router.location.pathname
  const isActive = (path: string) => currentPath.startsWith(path)

  const menuItems = [
    { name: '记录', path: '/items', icon: FileText, disabled: false },
    { name: '对话', path: '/chat', icon: MessageSquare, disabled: false },
    { name: '设置', path: '/settings', icon: Settings, disabled: true },
  ]

  return (
    <div className={`flex flex-col items-center py-6 bg-sidebar border-r border-sidebar-border ${className}`}>
      <div className="mb-6">
        <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center text-foreground shadow-[var(--shadow-card)]">
          <Command size={20} />
        </div>
      </div>
      
      <div className="flex-1 flex flex-col gap-2 w-full px-2">
        {menuItems.map((item) => (
          <Tooltip key={item.name} content={item.name} placement="right">
            <div className="w-full flex justify-center">
              {item.disabled ? (
                <Button
                  isDisabled
                  isIconOnly
                  variant="light"
                  className="w-10 h-10"
                  aria-label={item.name}
                >
                  <item.icon className="w-5 h-5" />
                </Button>
              ) : (
                <Link to={item.path} className="block">
                  <Button
                    isIconOnly
                    variant="light"
                    color="default"
                    className={
                      isActive(item.path)
                        ? "w-10 h-10 bg-card text-foreground shadow-[var(--shadow-card)] ring-1 ring-border/60"
                        : "w-10 h-10 text-muted-foreground hover:text-foreground hover:bg-card/60"
                    }
                    as="div"
                    aria-label={item.name}
                  >
                    <item.icon className="w-5 h-5" />
                  </Button>
                </Link>
              )}
            </div>
          </Tooltip>
        ))}
      </div>
    </div>
  )
}
