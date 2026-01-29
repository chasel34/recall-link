import * as React from 'react'
import { Dialog } from '@base-ui/react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type DrawerPlacement = 'left' | 'right' | 'top' | 'bottom'
export type DrawerSize = 'xs' | 'sm' | 'md' | 'lg' | 'full'

interface DrawerContextValue {
  placement: DrawerPlacement
  size: DrawerSize
  onClose: () => void
}

const DrawerContext = React.createContext<DrawerContextValue | null>(null)

export interface DrawerProps {
  children: React.ReactNode
  isOpen?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  placement?: DrawerPlacement
  size?: DrawerSize
}

export function Drawer({
  isOpen,
  defaultOpen,
  onOpenChange,
  placement = 'left',
  size = 'xs',
  children,
}: DrawerProps) {
  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      onOpenChange?.(open)
    },
    [onOpenChange]
  )

  const contextValue = React.useMemo(
    () => ({
      placement,
      size,
      onClose: () => handleOpenChange(false),
    }),
    [placement, size, handleOpenChange]
  )

  return (
    <Dialog.Root
      open={isOpen}
      defaultOpen={defaultOpen}
      onOpenChange={handleOpenChange}
    >
      <DrawerContext.Provider value={contextValue}>
        {children}
      </DrawerContext.Provider>
    </Dialog.Root>
  )
}

export interface DrawerContentProps extends Omit<React.ComponentPropsWithoutRef<'div'>, 'children'> {
  children: React.ReactNode | ((onClose: () => void) => React.ReactNode)
}

export const DrawerContent = React.forwardRef<HTMLDivElement, DrawerContentProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(DrawerContext)
    if (!context) throw new Error('DrawerContent must be used within a Drawer')
    const { placement, size, onClose } = context

    const placementClasses = {
      left: 'left-0 top-0 bottom-0 h-full data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
      right: 'right-0 top-0 bottom-0 h-full data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
      top: 'top-0 left-0 right-0 w-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
      bottom: 'bottom-0 left-0 right-0 w-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
    }

    const sizeClasses = {
      xs: 'w-80',
      sm: 'w-96',
      md: 'w-[28rem]',
      lg: 'w-[32rem]',
      full: 'w-full',
    }
    
    const isHorizontal = placement === 'left' || placement === 'right'
    const sizeClass = isHorizontal ? sizeClasses[size] : ''

    const content = typeof children === 'function' ? children(onClose) : children

    return (
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Popup
          ref={ref}
          className={cn(
            'fixed z-50 bg-background shadow-lg transition ease-in-out duration-300',
            placementClasses[placement],
            sizeClass,
            className
          )}
          {...props}
        >
          {content}
        </Dialog.Popup>
      </Dialog.Portal>
    )
  }
)
DrawerContent.displayName = 'DrawerContent'

export const DrawerBody = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex-1 overflow-auto p-4', className)} {...props} />
  )
)
DrawerBody.displayName = 'DrawerBody'
