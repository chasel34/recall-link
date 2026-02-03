import { ScrollArea } from '@base-ui/react/scroll-area'
import { cn } from '@/lib/utils'

export interface ScrollShadowProps {
  className?: string
  children: React.ReactNode
  viewportRef?: React.Ref<HTMLDivElement>
  viewportProps?: React.ComponentPropsWithoutRef<'div'>
}

export function ScrollShadow({ className, children, viewportRef, viewportProps }: ScrollShadowProps) {
  const { className: viewportClassName, ...restViewportProps } = viewportProps ?? {}

  return (
    <ScrollArea.Root className={cn("h-full w-full overflow-hidden", className)}>
      <ScrollArea.Viewport
        ref={viewportRef}
        className={cn('h-full w-full', viewportClassName)}
        {...restViewportProps}
      >
        {children}
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation="vertical" className="flex select-none touch-none p-0.5 bg-transparent transition-colors duration-[160ms] ease-out hover:bg-black/10 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5 z-50">
        <ScrollArea.Thumb className="flex-1 bg-muted-foreground/50 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  )
}
