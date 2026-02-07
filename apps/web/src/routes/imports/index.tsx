import { createFileRoute, Link } from '@tanstack/react-router'
import { useImports, useCreateImport } from '@/hooks/use-imports'
import { Button } from '@/components/base'
import { Upload, FileText, CheckCircle, AlertCircle, Clock, Loader2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRef } from 'react'
import { addToast } from '@/lib/toast'
import { Skeleton } from '@/components/base/skeleton'

export const Route = createFileRoute('/imports/')({
  component: ImportsPage,
})

function StatusBadge({ status, errorMessage }: { status: string; errorMessage?: string | null }) {
  const config = {
    queued: { label: '排队中', color: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20', icon: Clock },
    processing: { label: '处理中', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', icon: Loader2 },
    completed: { label: '已完成', color: 'text-green-600 bg-green-500/10 border-green-500/20', icon: CheckCircle },
    completed_with_errors: { label: '已完成 (有错误)', color: 'text-orange-600 bg-orange-500/10 border-orange-500/20', icon: AlertCircle },
    failed: { label: '失败', color: 'text-red-600 bg-red-500/10 border-red-500/20', icon: AlertCircle },
  }[status] || { label: status, color: 'text-gray-500', icon: AlertCircle }

  const Icon = config.icon

  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border", config.color)} title={errorMessage || undefined}>
      <Icon className={cn("w-3.5 h-3.5", status === 'processing' && "animate-spin")} />
      {config.label}
    </div>
  )
}

export function ImportsPage() {
  const { data, isLoading } = useImports()
  const createImport = useCreateImport()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    createImport.mutate({ file }, {
      onSuccess: () => {
        addToast({ title: '导入已开始', description: '您的书签正在处理中。', color: 'success' })
        if (fileInputRef.current) fileInputRef.current.value = ''
      },
      onError: (err) => {
        addToast({ title: '导入失败', description: err.message, color: 'danger' })
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    })
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-10 bg-background/70 backdrop-blur-md pb-5 pt-5 border-b border-border/40">
        <div className="max-w-7xl 2xl:max-w-[88rem] mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground/90">导入书签</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                上传您的浏览器书签以保存到 Recall Link。
              </p>
            </div>
            <div>
              <input
                type="file"
                accept=".html"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <Button
                variant="flat"
                color="primary"
                startContent={<Upload className="w-4 h-4" />}
                isLoading={createImport.isPending}
                onPress={() => fileInputRef.current?.click()}
              >
                上传 HTML
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl 2xl:max-w-[88rem] mx-auto w-full px-4 lg:px-8 py-10">
        {isLoading ? (
          <div className="border-y border-border/60 bg-transparent divide-y divide-border/60">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-4 py-4 flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : !data?.imports.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/70 border border-border/60 flex items-center justify-center shadow-[var(--shadow-card)]">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="mt-6 font-serif text-xl font-semibold">暂无导入</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              上传书签 HTML 文件以开始。
            </p>
            <Button
              className="mt-6"
              variant="flat"
              onPress={() => fileInputRef.current?.click()}
            >
              上传 HTML
            </Button>
          </div>
        ) : (
          <div className="border-y border-border/60 bg-transparent divide-y divide-border/60">
            {data.imports.map((imp) => (
              <Link
                key={imp.id}
                to="/imports/$id"
                params={{ id: imp.id }}
                className="group block hover:bg-muted/40 transition-colors"
              >
                <div className="px-4 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <FileText className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground truncate">{imp.file_name}</h3>
                      <StatusBadge status={imp.status} errorMessage={imp.error_message} />
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span>{new Date(imp.created_at).toLocaleString()}</span>
                      <span>{(imp.file_size_bytes / 1024).toFixed(1)} KB</span>
                      <span>{imp.stats.total_count} 个项目</span>
                    </div>
                  </div>

                  {imp.progress && imp.status === 'processing' && (
                     <div className="hidden sm:flex flex-col items-end gap-1 w-32">
                        <div className="text-xs font-medium text-primary">{imp.progress.progress_percent}%</div>
                        <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${imp.progress.progress_percent}%` }} />
                        </div>
                     </div>
                  )}

                  <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
