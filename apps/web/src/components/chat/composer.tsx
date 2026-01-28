import { Button, Textarea } from "@heroui/react"
import { ArrowUp, Square } from "lucide-react"
import { useRef, useState } from "react"
import type { KeyboardEvent } from 'react'

interface ComposerProps {
  onSend: (content: string) => void
  onStop?: () => void
  isStreaming?: boolean
  isLoading?: boolean
}

export function Composer({ onSend, onStop, isStreaming, isLoading }: ComposerProps) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    if (!value.trim() || isLoading) return
    onSend(value)
    setValue("")
  }

  return (
    <div className="p-4 border-t border-border bg-background/50 backdrop-blur-md">
      <div className="max-w-3xl mx-auto relative flex gap-2 items-end bg-card p-2 rounded-2xl border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all shadow-sm">
        <Textarea
          ref={textareaRef}
          value={value}
          onValueChange={setValue}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          minRows={1}
          maxRows={8}
          variant="flat"
          classNames={{
            input: "text-base text-foreground placeholder:text-muted-foreground",
            inputWrapper: "bg-transparent shadow-none hover:bg-transparent focus-within:bg-transparent p-0",
          }}
          className="flex-1"
        />
        <div className="pb-1 pr-1">
          {isStreaming ? (
            <Button
              isIconOnly
              size="sm"
              color="danger"
              variant="flat"
              onPress={onStop}
              className="rounded-full"
            >
              <Square className="w-4 h-4 fill-current" />
            </Button>
          ) : (
            <Button
              isIconOnly
              size="sm"
              color="primary"
              variant="solid"
              onPress={handleSubmit}
              isDisabled={!value.trim() || isLoading}
              className="rounded-full"
            >
              <ArrowUp className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
      <div className="max-w-3xl mx-auto mt-2 text-center">
        <p className="text-[10px] text-muted-foreground">
          AI can make mistakes. Check important info.
        </p>
      </div>
    </div>
  )
}
