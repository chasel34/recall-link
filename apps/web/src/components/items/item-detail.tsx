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
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
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
    <div className="w-full mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-border max-w-6xl 2xl:max-w-7xl mx-auto xl:w-full">
        <Button
          variant="light"
          size="sm"
          onPress={() => navigate({ to: '/items' })}
          className="text-muted-foreground hover:text-foreground -ml-2 font-medium"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回列表
        </Button>
        <div className="flex gap-2">
          <Button variant="flat" size="sm" isDisabled className="bg-muted text-muted-foreground">
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
                  <Button color="danger" onPress={() => {
                    handleDelete()
                    onClose()
                  }}>
                    确认删除
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>

      <div className="mb-10 text-center">
        <div className="flex justify-center mb-6">
           <div className="bg-muted rounded-full p-4">
             <span className="text-4xl">
               {item.domain ? item.domain.charAt(0).toUpperCase() : '🔗'}
             </span>
           </div>
        </div>
        <h1 className="text-4xl font-serif font-bold mb-4 text-foreground leading-tight">
          {item.title || '无标题'}
        </h1>
        <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground font-medium">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1 transition-colors bg-muted/50 px-2 py-0.5 rounded-full border border-border"
          >
            🔗 {item.url}
          </a>
          <p className="tracking-wide uppercase text-xs mt-1">
            保存于 {format(new Date(item.created_at), 'PPP', { locale: zhCN })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] xl:grid-cols-[minmax(0,1fr)_minmax(0,44rem)_18rem_minmax(0,1fr)] gap-10">
        <div className="space-y-8 min-w-0 xl:col-start-2">
          {item.summary && (
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 17H4v2h10v-2zm6-8H4v2h16V9zM4 15h16v-2H4v2zM4 5v2h16V5H4z"/>
                </svg>
              </div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-warning rounded-full"></span>
                AI 摘要
              </h2>
              <p className="text-foreground leading-relaxed text-lg font-serif">
                {item.summary}
              </p>
            </div>
          )}

          {(item.clean_html || item.clean_text) && (
            <div className="prose prose-lg max-w-none break-words dark:prose-invert">
              <h2 className="text-xl font-bold mb-6 pb-2 border-b border-border">内容预览</h2>
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
          )}

          {!item.clean_text && item.status === 'pending' && (
            <div className="text-center py-12 bg-muted/50 rounded-lg border border-dashed border-border">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-4 w-4 bg-muted-foreground rounded-full mb-2"></div>
                <p className="text-muted-foreground font-medium">正在获取网页内容...</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8 xl:col-start-3">
           {item.tags.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">标签</h2>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <Chip 
                    key={tag} 
                    size="sm"
                    variant="flat" 
                    className="bg-muted hover:bg-muted/80 text-foreground transition-colors"
                  >
                    {tag}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
             <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">信息</h2>
             <dl className="space-y-3 text-xs">
               <div>
                  <dt className="text-muted-foreground mb-1">域名</dt>
                 <dd className="font-medium text-foreground">{item.domain}</dd>
               </div>
               <div>
                  <dt className="text-muted-foreground mb-1">ID</dt>
                  <dd className="font-mono text-muted-foreground truncate">{item.id}</dd>
               </div>
             </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
