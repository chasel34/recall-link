import * as React from "react"
import { Input as BaseInput } from "@base-ui/react/input"
import { Field } from "@base-ui/react/field"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

export interface InputProps extends Omit<React.ComponentProps<"input">, "size" | "onChange" | "value"> {
  value?: string
  onValueChange?: (value: string) => void
  startContent?: React.ReactNode
  isClearable?: boolean
  isInvalid?: boolean
  errorMessage?: string | null
  size?: "sm" | "md" | "lg"
  variant?: "bordered" | "flat" | "faded" | "underlined" | "solid"
  classNames?: {
    inputWrapper?: string
    input?: string
  }
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      value,
      onValueChange,
      startContent,
      isClearable,
      isInvalid,
      errorMessage,
      size = "md",
      variant = "bordered",
      classNames,
      autoFocus,
      ...props
    },
    ref
  ) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange?.(event.target.value)
    }

    const handleClear = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onValueChange?.("")
    }

    const sizeStyles = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    }

    const variantStyles = {
      bordered: "border-2 border-border bg-transparent focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
      flat: "bg-muted hover:bg-muted/80",
      faded: "bg-muted/50 border border-border hover:bg-muted",
      underlined: "border-b-2 border-border rounded-none px-0",
      solid: "bg-secondary text-secondary-foreground",
    }

    const wrapperClasses = cn(
      "relative flex w-full items-center gap-2 rounded-lg transition-colors overflow-hidden",
      sizeStyles[size],
      variantStyles[variant],
      isInvalid && "border-destructive focus-within:ring-destructive",
      classNames?.inputWrapper
    )

    return (
      <Field.Root invalid={isInvalid} className={cn("w-full", className)}>
        <div className={wrapperClasses}>
          {startContent && (
            <div className="flex-shrink-0 text-muted-foreground flex items-center justify-center">
              {startContent}
            </div>
          )}
          
          <BaseInput
            ref={ref}
            className={cn(
              "flex-1 bg-transparent outline-none w-full placeholder:text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium",
              classNames?.input
            )}
            value={value}
            onChange={handleChange}
            autoFocus={autoFocus}
            {...props}
          />

          {isClearable && value && (
            <button
              type="button"
              onClick={handleClear}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full p-0.5"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        
        {isInvalid && errorMessage && (
          <Field.Error match className="text-xs text-destructive mt-1">
            {errorMessage}
          </Field.Error>
        )}
      </Field.Root>
    )
  }
)

Input.displayName = "Input"

export { Input }
