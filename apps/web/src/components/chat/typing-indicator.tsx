import { cn } from "../../lib/utils"

interface TypingIndicatorProps {
  className?: string
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <output
      className={cn("flex items-center gap-1.5 h-6", className)}
      aria-label="Thinking"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.3s] motion-reduce:animate-pulse" />
      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.15s] motion-reduce:animate-pulse" />
      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 motion-reduce:animate-pulse" />
      <span className="sr-only">AI is generating a response...</span>
    </output>
  )
}
