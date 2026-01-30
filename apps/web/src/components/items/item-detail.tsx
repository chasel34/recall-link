import type { ComponentProps } from 'react'
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
import { ArrowLeft, Globe, Sparkles, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Streamdown } from 'streamdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import type { Item } from '@/lib/api-client'
import { useDeleteItem } from '@/hooks/use-delete-item'

interface ItemDetailProps {
  item: Item
}

export function ItemDetail({ item }: ItemDetailProps) {
  const navigate = useNavigate()
  const deleteMutation = useDeleteItem()
  const { isOpen, onOpen, onOpenChange } = useDisclosure()

  const contentRehypePlugins = [
    rehypeRaw,
    [rehypeSanitize, defaultSchema] as const,
  ] as unknown as ComponentProps<typeof Streamdown>['rehypePlugins']

  const contentRemarkRehypeOptions = {
    allowDangerousHtml: true,
  } as unknown as ComponentProps<typeof Streamdown>['remarkRehypeOptions']

  const handleDelete = () => {
    deleteMutation.mutate(item.id)
  }

  return (
    <div className="w-full">
      <div className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="w-full px-6 md:px-12 lg:px-20">
          <div className="h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                isIconOnly
                variant="light"
                size="md"
                onPress={() => navigate({ to: '/items' })}
                className="-ml-2"
                aria-label="返回列表"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="h-4 w-px bg-border/70" />
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground truncate">
                正在阅读：{item.title || '无标题'}
              </span>
            </div>

            <Button
              isIconOnly
              color="danger"
              variant="light"
              size="md"
              onPress={onOpen}
              aria-label="删除"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
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

      <div className="mx-auto max-w-5xl px-6 md:px-12 lg:px-20 py-16 md:py-20">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.22em]">
              {item.domain || 'Saved'}
            </span>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.22em]">
              {format(new Date(item.created_at), 'PPP', { locale: zhCN })}
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-serif font-bold text-foreground leading-[1.06] tracking-tight">
            {item.title || '无标题'}
          </h1>

          <div className="mt-6">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit max-w-full items-center gap-2 rounded-full bg-muted/60 border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-card/70 transition-colors"
              title={item.url}
            >
              <span className="truncate">{item.url}</span>
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.22em] mr-2">
              Smart Tags:
            </span>
            {item.tags.length > 0 ? (
              item.tags.map((tag) => (
                <Chip
                  key={tag}
                  size="sm"
                  variant="flat"
                  className="bg-muted/50 hover:bg-muted/70 text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.18em] rounded-full border border-border/40 transition-colors"
                >
                  {tag}
                </Chip>
              ))
            ) : (
              <span className="text-[11px] font-medium text-muted-foreground">暂无</span>
            )}
          </div>

          <div className="mt-8 flex items-center gap-4">
            <div className="h-10 w-10 rounded-2xl bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground shadow-[var(--shadow-card)]">
              <Globe className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground break-words">{item.domain}</p>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-[0.22em]">
                网页快照
              </p>
            </div>
          </div>
        </header>

        {item.summary && (
          <div className="relative px-10 py-9 my-14 bg-card/60 border border-border/40 rounded-2xl shadow-[var(--shadow-card)]">
            <div className="absolute -top-4 left-10 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-background shadow-[var(--shadow-popover)]">
              <Sparkles className="h-3.5 w-3.5" />
              AI 深度总结
            </div>
            <p className="mt-6 text-xl text-foreground/90 font-medium leading-relaxed">
              {item.summary}
            </p>
          </div>
        )}

        {(item.clean_html || item.clean_text) && (
          <article className="min-w-0">
            <div className="prose prose-neutral max-w-none break-words dark:prose-invert font-serif prose-headings:font-serif prose-headings:tracking-tight prose-h2:text-3xl prose-h2:font-bold prose-h2:mt-16 prose-h2:mb-8 prose-p:text-[1.25rem] prose-p:leading-[1.85] prose-p:my-8 prose-p:text-foreground/90">
              {item.clean_html ? (
                <div className="[&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto [&_table]:w-full">
                  <Streamdown
                    rehypePlugins={contentRehypePlugins}
                    remarkRehypeOptions={contentRemarkRehypeOptions}
                  >
                    {item.clean_html}
                  </Streamdown>
                </div>
              ) : (
                <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {item.clean_text}
                </div>
              )}
            </div>
            <div className="mt-24 pt-12 border-t border-border/60 flex flex-col items-center text-center">
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
    </div>
  )
}
