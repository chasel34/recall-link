import { Link, useRouterState } from '@tanstack/react-router'
import { Settings2 } from 'lucide-react'

export function SettingsSidebar() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  })

  const isAi = pathname.startsWith('/settings/ai')

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-7">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/70 mb-5 px-2">
            AI
          </h3>

          <div className="space-y-1">
            <Link
              to="/settings/ai"
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] transition-all ${
                isAi
                  ? 'bg-primary/10 shadow-[var(--shadow-card)] ring-1 ring-primary/20 text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              模式与密钥
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
