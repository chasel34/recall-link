import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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

  const handleDelete = () => {
    deleteMutation.mutate(item.id)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/items' })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
        <Button variant="outline" size="sm" disabled>
          <Edit className="mr-2 h-4 w-4" />
          编辑标签
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                此操作无法撤销。确定要删除这个网页吗？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-3">{item.title || '无标题'}</h1>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            🔗 {item.url}
          </a>
          <p>
            📅 保存于{' '}
            {format(new Date(item.created_at), 'PPP', { locale: zhCN })}
          </p>
        </div>
      </div>

      {item.summary && (
        <div className="border-t pt-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">AI 摘要</h2>
          <p className="text-muted-foreground">{item.summary}</p>
        </div>
      )}

      {item.tags.length > 0 && (
        <div className="border-t pt-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">标签</h2>
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {item.clean_text && (
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">内容</h2>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: item.clean_text }}
          />
        </div>
      )}

      {!item.clean_text && item.status === 'pending' && (
        <div className="border-t pt-6 text-center text-muted-foreground">
          <p>正在获取网页内容...</p>
        </div>
      )}
    </div>
  )
}
