import * as React from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { cn } from '@/lib/utils'

export interface ModalProps {
  children: React.ReactNode
  isOpen?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  placement?: 'center' | 'top' | 'bottom'
}

interface ModalContextValue {
  onClose: () => void
}

const ModalContext = React.createContext<ModalContextValue>({
  onClose: () => {},
})

export function Modal({
  children,
  isOpen,
  defaultOpen,
  onOpenChange,
  placement = 'center',
}: ModalProps) {
  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      onOpenChange?.(open)
    },
    [onOpenChange]
  )

  const onClose = React.useCallback(() => {
    handleOpenChange(false)
  }, [handleOpenChange])

  return (
    <Dialog.Root open={isOpen} defaultOpen={defaultOpen} onOpenChange={handleOpenChange}>
      <ModalContext.Provider value={{ onClose }}>
        <Dialog.Portal>
          <Dialog.Backdrop
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          />
          <div className={cn(
            "fixed inset-0 z-50 flex p-4",
            placement === 'center' && "items-center justify-center",
            placement === 'top' && "items-start justify-center pt-20",
            placement === 'bottom' && "items-end justify-center pb-20"
          )}>
             {children}
          </div>
        </Dialog.Portal>
      </ModalContext.Provider>
    </Dialog.Root>
  )
}

export interface ModalContentProps {
  children: React.ReactNode | ((onClose: () => void) => React.ReactNode)
  className?: string
}

export function ModalContent({ children, className }: ModalContentProps) {
  return (
    <Dialog.Popup
      className={cn(
        "relative w-full max-w-lg gap-4 rounded-xl border border-border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-2xl",
        className
      )}
    >
      <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        <span className="sr-only">Close</span>
      </Dialog.Close>
      <ModalContext.Consumer>
        {({ onClose }) => (
          <>
            {typeof children === 'function' ? children(onClose) : children}
          </>
        )}
      </ModalContext.Consumer>
    </Dialog.Popup>
  )
}

export function ModalHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)}>
      <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
        {children}
      </Dialog.Title>
    </div>
  )
}

export function ModalBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("py-2", className)}>
       {children}
    </div>
  )
}

export function ModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4", className)}>
      {children}
    </div>
  )
}
