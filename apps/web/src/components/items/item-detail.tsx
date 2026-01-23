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
} from '@heroui/react'
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
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-200">
        <Button
          variant="light"
          size="sm"
          onPress={() => navigate({ to: '/items' })}
          className="text-stone-600 hover:text-stone-900 -ml-2 font-medium"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回列表
        </Button>
        <div className="flex gap-2">
          <Button variant="flat" size="sm" isDisabled className="bg-stone-100 text-stone-400">
            <Edit className="mr-1 h-4 w-4" />
            编辑标签
          </Button>
          <Button 
            color="danger" 
            variant="flat" 
            size="sm" 
            onPress={onOpen}
            className="bg-red-50 text-red-600 hover:bg-red-100"
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
           <div className="bg-stone-100 rounded-full p-4">
             <span className="text-4xl">
               {item.domain ? item.domain.charAt(0).toUpperCase() : '🔗'}
             </span>
           </div>
        </div>
        <h1 className="text-4xl font-serif font-bold mb-4 text-stone-900 leading-tight">
          {item.title || '无标题'}
        </h1>
        <div className="flex flex-col items-center gap-2 text-sm text-stone-500 font-medium">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-600 hover:text-stone-900 hover:underline flex items-center gap-1 transition-colors bg-stone-50 px-3 py-1 rounded-full border border-stone-200"
          >
            🔗 {item.url}
          </a>
          <p className="tracking-wide uppercase text-xs mt-2">
            保存于 {format(new Date(item.created_at), 'PPP', { locale: zhCN })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-10">
        <div className="space-y-8">
          {item.summary && (
            <div className="bg-[#FDFBF7] p-6 rounded-xl border border-stone-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 17H4v2h10v-2zm6-8H4v2h16V9zM4 15h16v-2H4v2zM4 5v2h16V5H4z"/>
                </svg>
              </div>
              <h2 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                AI 摘要
              </h2>
              <p className="text-stone-700 leading-relaxed text-lg font-serif">
                {item.summary}
              </p>
            </div>
          )}

          {item.clean_text && (
            <div className="prose prose-stone prose-lg max-w-none">
              <h2 className="text-xl font-bold mb-6 pb-2 border-b border-stone-200">内容预览</h2>
              <div
                dangerouslySetInnerHTML={{ __html: item.clean_text }}
                className="opacity-90"
              />
            </div>
          )}

          {!item.clean_text && item.status === 'pending' && (
            <div className="text-center py-12 bg-stone-50 rounded-lg border border-dashed border-stone-300">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-4 w-4 bg-stone-400 rounded-full mb-2"></div>
                <p className="text-stone-500 font-medium">正在获取网页内容...</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
           {item.tags.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">标签</h2>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <Chip 
                    key={tag} 
                    variant="flat" 
                    className="bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                  >
                    {tag}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          
          <div className="bg-stone-50 p-5 rounded-lg border border-stone-200">
             <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">信息</h2>
             <dl className="space-y-3 text-sm">
               <div>
                 <dt className="text-stone-500 mb-1">域名</dt>
                 <dd className="font-medium text-stone-800">{item.domain}</dd>
               </div>
               <div>
                 <dt className="text-stone-500 mb-1">ID</dt>
                 <dd className="font-mono text-xs text-stone-400 truncate">{item.id}</dd>
               </div>
             </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
