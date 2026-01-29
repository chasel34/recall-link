import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends Omit<React.ComponentProps<'textarea'>, 'value'> {
  value?: string
  onValueChange?: (value: string) => void
  minRows?: number
  maxRows?: number
  variant?: 'bordered' | 'flat' | 'faded' | 'underlined' | 'solid'
  classNames?: {
    inputWrapper?: string
    input?: string
  }
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      value,
      onValueChange,
      minRows = 1,
      maxRows,
      variant = 'bordered',
      classNames,
      onChange,
      style,
      ...props
    },
    ref
  ) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    
    React.useImperativeHandle(ref, () => textareaRef.current!)

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onValueChange?.(event.target.value)
      onChange?.(event)
      autoResize()
    }

    const autoResize = React.useCallback(() => {
      const textarea = textareaRef.current
      if (!textarea) return

      textarea.style.height = 'auto'
      
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight, 10) || 20
      const padding = parseInt(getComputedStyle(textarea).paddingTop, 10) + parseInt(getComputedStyle(textarea).paddingBottom, 10) || 0
      
      const minHeight = minRows * lineHeight + padding
      const maxHeight = maxRows ? maxRows * lineHeight + padding : Infinity

      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
      
      textarea.style.height = `${newHeight}px`
      textarea.style.overflowY = newHeight >= maxHeight ? 'auto' : 'hidden'
    }, [minRows, maxRows])

    React.useLayoutEffect(() => {
      autoResize()
    }, [value, autoResize])

    const variantStyles = {
      bordered: 'border-2 border-border bg-transparent focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
      flat: 'bg-muted hover:bg-muted/80',
      faded: 'bg-muted/50 border border-border hover:bg-muted',
      underlined: 'border-b-2 border-border rounded-none px-0',
      solid: 'bg-secondary text-secondary-foreground',
    }

    const wrapperClasses = cn(
      'relative flex w-full items-center gap-2 rounded-lg transition-colors overflow-hidden',
      variantStyles[variant],
      classNames?.inputWrapper,
      className
    )

    return (
      <div className={wrapperClasses}>
        <textarea
          ref={textareaRef}
          className={cn(
            'flex-1 bg-transparent outline-none w-full placeholder:text-muted-foreground resize-none py-2 px-3 min-h-[40px] text-sm',
            classNames?.input
          )}
          value={value}
          onChange={handleChange}
          rows={minRows}
          style={style}
          {...props}
        />
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Textarea }
