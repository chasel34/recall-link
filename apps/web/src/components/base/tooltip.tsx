import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'
import { cn } from '@/lib/utils'
import React from 'react'

export interface TooltipProps {
  content: React.ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
  children: React.ReactNode
  className?: string
}

export function Tooltip({ content, placement = 'top', children, className }: TooltipProps) {
  return (
    <BaseTooltip.Provider>
      <BaseTooltip.Root>
        <BaseTooltip.Trigger render={(props) => (
             React.isValidElement(children) 
               ? React.cloneElement(children as React.ReactElement, props)
               : <span {...props} className={cn("inline-block", className)}>{children}</span>
        )} />
        <BaseTooltip.Portal>
          <BaseTooltip.Positioner side={placement}>
             <BaseTooltip.Popup
               className={cn(
                 "z-50 overflow-hidden rounded-xl bg-foreground px-3 py-1.5 text-xs text-background shadow-[var(--shadow-popover)] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                 className
               )}
             >
                {content}
                <BaseTooltip.Arrow className="fill-foreground" />
              </BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      </BaseTooltip.Root>
    </BaseTooltip.Provider>
  )
}
