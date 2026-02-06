import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { useJobs } from '@/hooks/use-jobs'
import { Tabs, Tab } from '@/components/base/tabs'
import { Skeleton } from '@/components/base/skeleton'
import { Button } from '@/components/base'
import { RotateCw, AlertCircle, Clock, Timer, Loader2, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UiStatus } from '@/lib/api-client'

const jobsSearchSchema = z.object({
  status: z.enum(['running', 'queued', 'scheduled', 'stale_lock']).optional(),
  type: z.string().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
})

export const Route = createFileRoute('/jobs/')({
  validateSearch: jobsSearchSchema,
  component: JobsPage,
})

const STATUS_MAP: Record<UiStatus, { label: string; color: string; icon: any }> = {
  running: { label: '运行中', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', icon: Loader2 },
  queued: { label: '排队', color: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20', icon: Clock },
  scheduled: { label: '计划中', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20', icon: Timer },
  stale_lock: { label: '锁过期', color: 'text-red-500 bg-red-500/10 border-red-500/20', icon: AlertCircle },
}

function StatusBadge({ status, lastErrorMessage }: { status: UiStatus; lastErrorMessage?: string | null }) {
  let config = STATUS_MAP[status] || { label: status, color: 'text-gray-500', icon: AlertCircle }

  if (status === 'scheduled' && lastErrorMessage) {
    config = {
      label: '重试中',
      color: 'text-orange-600 bg-orange-500/10 border-orange-500/20',
      icon: RotateCw,
    }
  }

  const Icon = config.icon
  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border", config.color)}>
      <Icon className={cn("w-3.5 h-3.5", status === 'running' && "animate-spin")} />
      {config.label}
    </div>
  )
}

function ProgressBar({ percent, stage, message }: { percent: number | null, stage: string | null, message: string | null }) {
  if (percent !== null) {
    return (
      <div className="w-full max-w-[200px] flex flex-col gap-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{percent}%</span>
        </div>
        <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out" 
            style={{ width: `${Math.max(5, percent)}%` }}
          />
        </div>
        {message && <div className="text-xs text-muted-foreground truncate" title={message}>{message}</div>}
      </div>
    )
  }

  return (
    <div className="w-full max-w-[200px] flex flex-col gap-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{stage || 'Processing...'}</span>
      </div>
      <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
        <div className="h-full w-2/3 bg-primary/50 rounded-full animate-pulse" />
      </div>
      {message && <div className="text-xs text-muted-foreground truncate" title={message}>{message}</div>}
    </div>
  )
}

function JobsPage() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  
  const jobsQuery = useJobs(search)
  const jobs = jobsQuery.data?.jobs ?? []
  const isLoading = jobsQuery.isPending
  const isError = jobsQuery.isError

  const handleStatusChange = (status: string) => {
    navigate({
      search: (old) => ({ ...old, status: status === 'all' ? undefined : status as any, offset: 0 }),
    })
  }

  const handleTypeChange = (type: string) => {
    navigate({
      search: (old) => ({ ...old, type: type === 'all' ? undefined : type, offset: 0 }),
    })
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-10 bg-background/70 backdrop-blur-md pb-5 pt-5 border-b border-border/40">
        <div className="max-w-7xl 2xl:max-w-[88rem] mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground/90">任务中心</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                查看系统正在处理的后台任务。
              </p>
            </div>
            <Button
              variant="light"
              size="sm"
              isIconOnly
              onPress={() => jobsQuery.refetch()}
              className={cn(jobsQuery.isFetching && "animate-spin")}
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <Tabs 
              selectedKey={search.status || 'all'} 
              onSelectionChange={handleStatusChange}
              size="sm"
            >
              <Tab key="all" title="全部状态" />
              <Tab key="running" title="运行中" />
              <Tab key="queued" title="排队" />
              <Tab key="scheduled" title="计划中" />
              <Tab key="stale_lock" title="锁过期" />
            </Tabs>

             <Tabs 
              selectedKey={search.type || 'all'} 
              onSelectionChange={handleTypeChange}
              size="sm"
            >
              <Tab key="all" title="全部类型" />
              <Tab key="fetch" title="抓取" />
              <Tab key="ai_process" title="AI分析" />
            </Tabs>
          </div>
        </div>
      </div>

      <div className="max-w-7xl 2xl:max-w-[88rem] mx-auto w-full px-4 lg:px-8 py-10">
        {isError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
             <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
             </div>
             <h3 className="mt-4 text-sm font-semibold text-foreground">加载失败</h3>
             <p className="mt-2 text-sm text-muted-foreground">无法获取任务列表，请稍后重试。</p>
             <div className="mt-6">
               <Button variant="flat" onPress={() => jobsQuery.refetch()}>重试</Button>
             </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
             {isLoading ? (
               <div className="divide-y divide-border">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-4 flex items-center gap-4">
                      <Skeleton className="h-4 w-24" />
                      <div className="flex-1">
                         <Skeleton className="h-4 w-full max-w-md mb-2" />
                         <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
               </div>
             ) : jobs.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                 <div className="bg-muted/50 p-4 rounded-full mb-4">
                   <Activity className="w-8 h-8 text-muted-foreground" />
                 </div>
                 <h3 className="text-lg font-medium text-foreground">没有进行中的任务</h3>
                 <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                   所有任务都已完成，或者当前筛选条件下没有任务。
                 </p>
               </div>
             ) : (
               <div className="divide-y divide-border">
                 {jobs.map((job) => (
                   <div key={job.id} className="group p-4 hover:bg-muted/30 transition-colors">
                     <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                       <div className="min-w-[100px] flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase">{job.type}</span>
                            <StatusBadge status={job.ui_status} lastErrorMessage={job.last_error_message} />
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                             <RotateCw className="w-3 h-3" />
                             第 {job.attempt} 次尝试
                          </div>
                       </div>
                       
                       <div className="flex-1 min-w-0">
                         {job.item_title && (
                            <Link to="/items/$id" params={{ id: job.item_id }} className="block font-medium text-foreground hover:text-primary truncate transition-colors">
                              {job.item_title}
                            </Link>
                         )}
                         <a href={job.item_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline truncate block">
                           {job.item_url}
                         </a>
                         <div className="mt-1 text-xs text-muted-foreground">
                            {job.run_after ? `计划于 ${new Date(job.run_after).toLocaleString()} 执行` : job.started_at ? `开始于 ${new Date(job.started_at).toLocaleString()}` : `创建于 ${new Date(job.created_at).toLocaleString()}`}
                         </div>
                         {job.last_error_message && (
                           <div className="mt-1 text-xs text-destructive/80 truncate" title={job.last_error_message}>
                             上次失败：{job.last_error_message}
                           </div>
                         )}
                       </div>

                       <div className="w-full sm:w-auto flex items-center justify-end">
                         <ProgressBar 
                           percent={job.progress_percent} 
                           stage={job.progress_stage} 
                           message={job.progress_message} 
                         />
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  )
}
