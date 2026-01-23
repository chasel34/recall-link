import { useState } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Button,
} from '@heroui/react'
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
    <Modal isOpen={open} onOpenChange={handleOpenChange} placement="center">
      <ModalContent>
        {() => (
          <form onSubmit={handleSubmit}>
            <ModalHeader className="flex flex-col gap-1">
              保存网页
            </ModalHeader>
            <ModalBody>
              <p className="text-sm text-default-500">
                输入网页 URL，系统将自动提取内容并生成摘要和标签
              </p>
              <Input
                placeholder="https://example.com/article"
                value={url}
                onValueChange={setUrl}
                autoFocus
                isInvalid={!!error}
                errorMessage={error}
                variant="bordered"
              />
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={() => handleOpenChange(false)}
              >
                取消
              </Button>
              <Button 
                type="submit" 
                color="primary"
                isLoading={createMutation.isPending}
              >
                {createMutation.isPending ? '保存中...' : '保存'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  )
}
