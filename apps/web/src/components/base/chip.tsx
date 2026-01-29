import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

export interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'solid' | 'bordered' | 'light' | 'flat'
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
}

export const Chip = forwardRef<HTMLDivElement, ChipProps>(({ className, size = 'md', variant = 'solid', color = 'default', ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
      {...props}
    />
  )
})
Chip.displayName = "Chip"
