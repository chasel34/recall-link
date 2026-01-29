import { Button, Textarea } from "@/components/base"
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
    <div className="px-6 lg:px-10 py-6 border-t border-border/40 bg-background/70 backdrop-blur-md">
      <div className="max-w-3xl mx-auto relative flex gap-2 items-end bg-card p-2 rounded-3xl border border-border/60 focus-within:border-border focus-within:shadow-[var(--shadow-card)] transition-all">
        <Textarea
          ref={textareaRef}
          value={value}
          onValueChange={setValue}
          onKeyDown={handleKeyDown}
          placeholder="询问你的收藏知识库..."
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
              color="default"
              variant="solid"
              onPress={handleSubmit}
              isDisabled={!value.trim() || isLoading}
              className="rounded-2xl"
            >
              <ArrowUp className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
      <div className="max-w-3xl mx-auto mt-2 text-center">
        <p className="text-[10px] text-muted-foreground">
          使用 AI 生成的内容请核对关键信息。
        </p>
      </div>
    </div>
  )
}
