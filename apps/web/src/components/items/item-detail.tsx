import { useNavigate } from '@tanstack/react-router'
import {
  Button,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure
} from '@/components/base'
import { ArrowLeft, Edit, Sparkles, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Item } from '@/lib/api-client'
import { useDeleteItem } from '@/hooks/use-delete-item'

interface ItemDetailProps {
  item: Item
}

export function ItemDetail({ item }: ItemDetailProps) {
  const navigate = useNavigate()
  const deleteMutation = useDeleteItem()
  const { isOpen, onOpen, onOpenChange } = useDisclosure()

  const handleDelete = () => {
    deleteMutation.mutate(item.id)
  }

  return (
    <div className="w-full">
      <div className="mx-auto max-w-5xl px-6 md:px-10 py-10">
        <div className="sticky top-0 z-30 -mx-6 md:-mx-10 px-6 md:px-10 bg-background/70 backdrop-blur-md border-b border-border/40">
          <div className="h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="light"
                size="sm"
                onPress={() => navigate({ to: '/items' })}
                className="text-muted-foreground hover:text-foreground -ml-2 font-medium"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                返回列表
              </Button>
              <div className="hidden sm:block h-4 w-px bg-border/70" />
              <span className="hidden sm:block text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground truncate">
                正在阅读：{item.title || '无标题'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="flat"
                size="sm"
                isDisabled
                className="bg-muted text-muted-foreground"
              >
                <Edit className="mr-1 h-4 w-4" />
                编辑标签
              </Button>
              <Button
                color="danger"
                variant="flat"
                size="sm"
                onPress={onOpen}
                className="bg-destructive/10 text-destructive hover:bg-destructive/20"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                删除
              </Button>
            </div>

            <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
              <ModalContent>
                {(onClose) => (
                  <>
                    <ModalHeader className="flex flex-col gap-1">确认删除</ModalHeader>
                    <ModalBody>
                      <p>此操作无法撤销。确定要删除这个网页吗？</p>
                    </ModalBody>
                    <ModalFooter>
                      <Button variant="light" onPress={onClose}>
                        取消
                      </Button>
                      <Button
                        color="danger"
                        onPress={() => {
                          handleDelete()
                          onClose()
                        }}
                      >
                        确认删除
                      </Button>
                    </ModalFooter>
                  </>
                )}
              </ModalContent>
            </Modal>
          </div>
        </div>

        <header className="pt-10 pb-10">
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.22em]">
              {item.domain || 'Saved'}
            </span>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.22em]">
              {format(new Date(item.created_at), 'PPP', { locale: zhCN })}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground leading-[1.08] tracking-tight">
            {item.title || '无标题'}
          </h1>

          <div className="mt-6 flex flex-col gap-3">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit max-w-full items-center gap-2 rounded-full bg-muted/60 border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-card/70 transition-colors"
              title={item.url}
            >
              <span className="truncate">{item.url}</span>
            </a>

            {item.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.22em] mr-1">
                  Smart Tags:
                </span>
                {item.tags.map((tag) => (
                  <Chip
                    key={tag}
                    size="sm"
                    variant="flat"
                    className="bg-muted/50 hover:bg-muted/70 text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.18em] rounded-full border border-border/40 transition-colors"
                  >
                    {tag}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_18rem] gap-10">
          <div className="min-w-0 space-y-10">
            {item.summary && (
              <div className="relative rounded-2xl border border-border/60 bg-card/70 shadow-[var(--shadow-card)] px-7 py-7 overflow-hidden">
                <div className="absolute -top-3 left-7 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-background shadow-[var(--shadow-popover)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI 深度总结
                </div>
                <p className="mt-6 text-[18px] leading-relaxed text-foreground/90 font-serif">
                  {item.summary}
                </p>
              </div>
            )}

            {(item.clean_html || item.clean_text) && (
              <article className="min-w-0">
                <div className="prose prose-neutral prose-lg max-w-none break-words dark:prose-invert prose-headings:font-serif prose-headings:tracking-tight prose-p:text-foreground/90 prose-p:leading-[1.85] prose-p:my-6">
                  {item.clean_html ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: item.clean_html }}
                      className="[&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto [&_table]:w-full"
                    />
                  ) : (
                    <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {item.clean_text}
                    </div>
                  )}
                </div>
                <div className="mt-16 pt-10 border-t border-border/60 flex flex-col items-center text-center">
                  <div className="h-10 w-10 rounded-2xl bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground shadow-[var(--shadow-card)]">
                    <span className="font-serif font-semibold">RL</span>
                  </div>
                  <p className="mt-4 text-xs font-bold text-muted-foreground uppercase tracking-[0.22em]">
                    已阅读至末尾
                  </p>
                </div>
              </article>
            )}

            {!item.clean_text && item.status === 'pending' && (
              <div className="text-center py-12 bg-muted/50 rounded-2xl border border-dashed border-border">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="h-4 w-4 bg-muted-foreground rounded-full mb-2" />
                  <p className="text-muted-foreground font-medium">正在获取网页内容...</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-8">
            <div className="rounded-2xl bg-muted/40 border border-border/60 p-5 shadow-[var(--shadow-card)]">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.22em] mb-4">
                信息
              </h2>
              <dl className="space-y-4 text-xs">
                <div>
                  <dt className="text-muted-foreground mb-1">域名</dt>
                  <dd className="font-medium text-foreground break-words">{item.domain}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1">ID</dt>
                  <dd className="font-mono text-muted-foreground break-all">{item.id}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
