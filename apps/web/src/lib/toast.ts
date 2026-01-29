import React from 'react'
import { Toast } from '@base-ui/react/toast'
import { cn } from '@/lib/utils'

export type ToastColor = 'success' | 'danger' | 'default'

export type AddToastOptions = {
  title?: string
  description?: string
  color?: ToastColor
}

export const toastManager = Toast.createToastManager()

export function addToast({ title, description, color }: AddToastOptions) {
  const type = color === 'success' ? 'success' : color === 'danger' ? 'danger' : undefined
  return toastManager.add({ title, description, type })
}

function ToastViewportContent() {
  const { toasts } = Toast.useToastManager()

  return React.createElement(
    Toast.Portal,
    null,
    React.createElement(
      Toast.Viewport,
      {
        className:
          'fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 outline-none',
      },
      toasts.map((toast) =>
        React.createElement(
          Toast.Root,
          {
            key: toast.id,
            toast,
            className: cn(
              'pointer-events-auto relative w-full rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm transition',
              'data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0 data-[ending-style]:translate-y-2 data-[ending-style]:opacity-0',
              'bg-card border-border text-foreground',
              'data-[type=success]:bg-foreground data-[type=success]:text-background data-[type=success]:border-foreground/20',
              'data-[type=danger]:bg-destructive/10 data-[type=danger]:border-destructive data-[type=danger]:text-destructive'
            ),
          },
          React.createElement(
            Toast.Content,
            { className: 'flex flex-col gap-1' },
            React.createElement(Toast.Title, {
              className:
                'text-sm font-semibold leading-none data-[type=success]:text-background',
            }),
            React.createElement(Toast.Description, {
              className: cn(
                'text-xs leading-snug text-muted-foreground',
                'data-[type=success]:text-background/80',
                'data-[type=danger]:text-destructive/90'
              ),
            })
          )
        )
      )
    )
  )
}

export function ToastViewport() {
  return React.createElement(
    Toast.Provider,
    { toastManager, limit: 3 },
    React.createElement(ToastViewportContent)
  )
}
