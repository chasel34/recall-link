import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCreateItem } from '@/hooks/use-create-item'
import { z } from 'zod'

const urlSchema = z.string().url('请输入有效的 URL')

interface CreateItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateItemDialog({ open, onOpenChange }: CreateItemDialogProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const createMutation = useCreateItem()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const validation = urlSchema.safeParse(url)
    if (!validation.success) {
      setError(validation.error.errors[0].message)
      return
    }

    try {
      await createMutation.mutateAsync(url)
      setUrl('')
      onOpenChange(false)
    } catch (err) {
      // handled by mutation
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setUrl('')
      setError(null)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>保存网页</DialogTitle>
          <DialogDescription>
            输入网页 URL，系统将自动提取内容并生成摘要和标签
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
            />

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
