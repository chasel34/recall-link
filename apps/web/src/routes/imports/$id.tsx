import { createFileRoute, Link } from '@tanstack/react-router'
import { useImport, useImportEntries } from '@/hooks/use-imports'
import { Button } from '@/components/base'
import { ArrowLeft, CheckCircle, AlertCircle, Clock, Loader2, Link as LinkIcon, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/base/skeleton'
import { z } from 'zod'

const importDetailSearchSchema = z.object({
  status: z.string().optional(),
})

export const Route = createFileRoute('/imports/$id')({
  validateSearch: importDetailSearchSchema,
  component: ImportDetailPage,
})

function FilterPill({ isActive, children, onPress }: { isActive: boolean; children: React.ReactNode; onPress: () => void }) {
  return (
    <Button
      variant="light"
      size="sm"
      aria-pressed={isActive}
      onPress={onPress}
      className={cn(
        'h-8 px-3 rounded-full border text-xs font-medium transition-all',
        isActive
          ? 'bg-primary/10 shadow-[var(--shadow-card)] ring-1 ring-primary/20 text-foreground font-semibold border-transparent'
          : 'bg-transparent text-muted-foreground border-border/60 hover:text-foreground hover:bg-card/60'
      )}
    >
      {children}
    </Button>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    queued: { label: '排队中', color: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20', icon: Clock },
    fetching: { label: '获取中', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', icon: Loader2 },
    ai_processing: { label: 'AI 处理中', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20', icon: Loader2 },
    embedding: { label: '嵌入中', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', icon: Loader2 },
    done: { label: '完成', color: 'text-green-600 bg-green-500/10 border-green-500/20', icon: CheckCircle },
    failed: { label: '失败', color: 'text-red-600 bg-red-500/10 border-red-500/20', icon: AlertCircle },
    duplicate_existing: { label: '重复 (现有)', color: 'text-gray-500 bg-gray-500/10 border-gray-500/20', icon: CheckCircle },
    duplicate_in_file: { label: '重复 (文件)', color: 'text-gray-500 bg-gray-500/10 border-gray-500/20', icon: CheckCircle },
    invalid: { label: '无效', color: 'text-destructive bg-destructive/10 border-destructive/20', icon: AlertCircle },
    created: { label: '已创建', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', icon: CheckCircle },
  }[status] || { label: status, color: 'text-gray-500', icon: AlertCircle }

  const Icon = config.icon

  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border", config.color)}>
      <Icon className={cn("w-3 h-3", (status === 'fetching' || status === 'ai_processing' || status === 'embedding') && "animate-spin")} />
      {config.label}
    </div>
  )
}

function StatCard({ label, value, subtext }: { label: string, value: string | number, subtext?: string }) {
  return (
    <div className="bg-card border border-border/60 rounded-xl p-4 shadow-[var(--shadow-card)]">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-serif font-semibold mt-1">{value}</div>
      {subtext && <div className="text-xs text-muted-foreground mt-1">{subtext}</div>}
    </div>
  )
}

function ImportDetailPage() {
  const { id } = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <ImportDetailPageContent
      id={id}
      status={search.status}
      onStatusChange={(status) => {
        navigate({
          search: (old) => ({ ...old, status }),
        })
      }}
    />
  )
}

interface ImportDetailPageContentProps {
  id: string
  status?: string
  onStatusChange: (status: string | undefined) => void
}

export function ImportDetailPageContent({ id, status, onStatusChange }: ImportDetailPageContentProps) {
  
  const { data: imp, isLoading: isImportLoading } = useImport(id)
  const { data: entriesData, isLoading: isEntriesLoading } = useImportEntries(id, {
    status,
  })

  const setStatusFilter = (status: string | undefined) => {
    onStatusChange(status)
  }

  if (isImportLoading) {
    return (
      <div className="p-8 space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    )
  }

  if (!imp) {
    return <div className="p-8 text-center text-muted-foreground">未找到导入</div>
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-10 bg-background/70 backdrop-blur-md pb-5 pt-5 border-b border-border/40">
        <div className="max-w-7xl 2xl:max-w-[88rem] mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/imports">
              <Button variant="light" isIconOnly size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex-1">
               <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground/90">{imp.file_name}</h1>
               <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                 <span>{new Date(imp.created_at).toLocaleString()}</span>
                 <span>•</span>
                 <span>{(imp.file_size_bytes / 1024).toFixed(1)} KB</span>
                 <span>•</span>
                  <span className={cn(
                    "font-medium",
                    imp.status === 'completed' && "text-green-600",
                    imp.status === 'failed' && "text-destructive",
                    imp.status === 'processing' && "text-blue-500"
                  )}>
                    {{
                      queued: '排队中',
                      processing: '处理中',
                      completed: '已完成',
                      completed_with_errors: '已完成(有错误)',
                      failed: '失败',
                    }[imp.status] || imp.status.toUpperCase().replace('_', ' ')}
                  </span>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <StatCard label="总项目数" value={imp.stats.total_count} />
            <StatCard label="已导入" value={imp.stats.created_count} subtext="新创建的项目" />
            <StatCard label="已跳过" value={imp.stats.duplicate_existing_count + imp.stats.duplicate_in_file_count} subtext="重复项" />
            <StatCard label="失败" value={imp.stats.failed_count + imp.stats.invalid_count} subtext="无效或失败" />
          </div>
          
          {imp.progress && imp.status === 'processing' && (
             <div className="mt-6 flex flex-col gap-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                   <span>处理中... {imp.progress.done_count} / {imp.progress.total_count}</span>
                   <span>{imp.progress.progress_percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                   <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${imp.progress.progress_percent}%` }} />
                </div>
             </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl 2xl:max-w-[88rem] mx-auto w-full px-4 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-4">
           <h2 className="text-lg font-semibold font-serif">条目</h2>
           <div className="flex flex-wrap items-center gap-2">
             <FilterPill isActive={!status} onPress={() => setStatusFilter(undefined)}>全部</FilterPill>
             <FilterPill isActive={status === 'created'} onPress={() => setStatusFilter('created')}>已创建</FilterPill>
             <FilterPill isActive={status === 'duplicate_existing'} onPress={() => setStatusFilter('duplicate_existing')}>重复</FilterPill>
             <FilterPill isActive={status === 'failed'} onPress={() => setStatusFilter('failed')}>失败</FilterPill>
           </div>
         </div>

        {isEntriesLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : !entriesData?.entries.length ? (
          <div className="text-center py-10 text-muted-foreground">未找到条目</div>
        ) : (
          <div className="border border-border/60 rounded-xl overflow-hidden bg-card/50">
             <div className="divide-y divide-border/60">
               {entriesData.entries.map((entry) => (
                 <div key={entry.id} className="p-4 hover:bg-muted/40 transition-colors flex items-start gap-4">
                   <div className="mt-1">
                     <StatusBadge status={entry.status} />
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-foreground/90" title={entry.title_raw || '无标题'}>
                        {entry.title_raw || '无标题'}
                      </div>
                      <div className="text-sm text-muted-foreground truncate flex items-center gap-1">
                         <LinkIcon className="w-3 h-3" />
                         {entry.url_raw}
                      </div>
                      {entry.error_message && (
                        <div className="text-xs text-destructive mt-1">
                          {entry.error_message}
                        </div>
                      )}
                      {entry.item_id && (
                        <div className="mt-2">
                          <Link to="/items/$id" params={{ id: entry.item_id }} className="text-xs text-primary hover:underline flex items-center gap-1">
                            查看项目 <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>
    </div>
  )
}
