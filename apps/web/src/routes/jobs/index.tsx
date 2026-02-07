import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { useJobs } from '@/hooks/use-jobs'
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

export const JOB_TYPE_LABEL_MAP: Record<string, string> = {
  fetch: '抓取',
  ai_process: 'AI分析',
  embed_process: '向量化',
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

function JobsPage() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  
  const jobsQuery = useJobs(search)
  const jobs = jobsQuery.data?.jobs ?? []
  const isLoading = jobsQuery.isPending
  const isError = jobsQuery.isError

  const setStatusFilter = (status: UiStatus | undefined) => {
    navigate({
      search: (old) => ({ ...old, status, offset: 0 }),
    })
  }

  const setTypeFilter = (type: string | undefined) => {
    navigate({
      search: (old) => ({ ...old, type, offset: 0 }),
    })
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-10 bg-background/70 backdrop-blur-md pb-5 pt-5 border-b border-border/40">
        <div className="max-w-7xl 2xl:max-w-[88rem] mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
               <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground/90">任务中心</h1>
               <p className="mt-1 text-sm text-muted-foreground">
                 查看系统正在处理的后台任务。
               </p>
             </div>
            <Button
              variant="light"
              size="sm"
              isIconOnly
              onPress={() => jobsQuery.refetch()}
            >
              <RotateCw className={cn("w-4 h-4", jobsQuery.isFetching && 'animate-spin')} />
            </Button>
          </div>
           
           <div className="mt-6 flex flex-col gap-3">
             <div className="flex flex-wrap items-center gap-2">
               <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/70 mr-1">
                 状态
               </span>
               <FilterPill isActive={search.status == null} onPress={() => setStatusFilter(undefined)}>
                 全部状态
               </FilterPill>
               <FilterPill isActive={search.status === 'running'} onPress={() => setStatusFilter('running')}>
                 运行中
               </FilterPill>
               <FilterPill isActive={search.status === 'queued'} onPress={() => setStatusFilter('queued')}>
                 排队
               </FilterPill>
               <FilterPill isActive={search.status === 'scheduled'} onPress={() => setStatusFilter('scheduled')}>
                 计划中
               </FilterPill>
               <FilterPill isActive={search.status === 'stale_lock'} onPress={() => setStatusFilter('stale_lock')}>
                 锁过期
               </FilterPill>
             </div>

             <div className="flex flex-wrap items-center gap-2">
               <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/70 mr-1">
                 类型
               </span>
               <FilterPill isActive={search.type == null} onPress={() => setTypeFilter(undefined)}>
                 全部类型
               </FilterPill>
               <FilterPill isActive={search.type === 'fetch'} onPress={() => setTypeFilter('fetch')}>
                 抓取
               </FilterPill>
                <FilterPill isActive={search.type === 'ai_process'} onPress={() => setTypeFilter('ai_process')}>
                  AI分析
                </FilterPill>
                <FilterPill isActive={search.type === 'embed_process'} onPress={() => setTypeFilter('embed_process')}>
                  向量化
                </FilterPill>
              </div>
            </div>
         </div>
       </div>

      <div className="max-w-7xl 2xl:max-w-[88rem] mx-auto w-full px-4 lg:px-8 py-10">
        {isError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
             <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20 shadow-[var(--shadow-card)]">
                 <AlertCircle className="h-6 w-6 text-destructive" />
             </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">加载失败</h3>
              <p className="mt-2 text-sm text-muted-foreground">无法获取任务列表，请稍后重试。</p>
              <div className="mt-6">
                <Button variant="flat" onPress={() => jobsQuery.refetch()}>重试</Button>
              </div>
          </div>
        ) : (
          isLoading ? (
            <div className="border-y border-border/60 bg-transparent divide-y divide-border/60">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-4 py-4 flex items-center gap-4">
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
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted/70 border border-border/60 flex items-center justify-center shadow-[var(--shadow-card)]">
                <Activity className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="mt-6 font-serif text-xl font-semibold">暂无任务</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                所有任务都已完成，或者当前筛选条件下没有任务。
              </p>
            </div>
          ) : (
            <div className="border-y border-border/60 bg-transparent divide-y divide-border/60">
              {jobs.map((job) => (
                <div key={job.id} className="group px-4 py-4 hover:bg-muted/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="min-w-[100px] flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase">{JOB_TYPE_LABEL_MAP[job.type] || job.type}</span>
                        <StatusBadge status={job.ui_status} lastErrorMessage={job.last_error_message} />
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <RotateCw className="w-3 h-3" />
                        第 {job.attempt} 次尝试
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      {job.item_title && (
                        <Link
                          to="/items/$id"
                          params={{ id: job.item_id }}
                          className="block font-serif text-[15px] font-semibold text-foreground/90 hover:text-primary truncate transition-colors"
                        >
                          {job.item_title}
                        </Link>
                      )}
                      <a href={job.item_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline truncate block">
                        {job.item_url}
                      </a>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {job.run_after
                          ? `计划于 ${new Date(job.run_after).toLocaleString()} 执行`
                          : job.started_at
                            ? `开始于 ${new Date(job.started_at).toLocaleString()}`
                            : `创建于 ${new Date(job.created_at).toLocaleString()}`}
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
          )
        )}
      </div>
    </div>
  )
}
