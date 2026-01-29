import { Skeleton } from '@/components/base'

export function ItemRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Skeleton className="h-5 w-5 rounded-lg bg-muted/70" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <Skeleton className="h-4 w-2/3 rounded-lg bg-muted/70" />
            <Skeleton className="hidden sm:block h-3 w-16 rounded-lg bg-muted/70" />
          </div>
          <Skeleton className="mt-2 h-3 w-5/6 rounded-lg bg-muted/60" />
        </div>
      </div>
      <Skeleton className="hidden sm:block h-3 w-16 rounded-lg bg-muted/60" />
    </div>
  )
}
