import { Skeleton } from '@/components/base'

export function ItemDetailSkeleton() {
  return (
    <div className="w-full">
      <div className="mx-auto max-w-5xl px-6 md:px-10 py-10">
        <div className="sticky top-0 z-30 -mx-6 md:-mx-10 px-6 md:px-10 bg-background/70 backdrop-blur-md border-b border-border/40">
          <div className="h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Skeleton className="rounded-lg w-20 h-8" />
              <div className="hidden sm:block h-4 w-px bg-border/70" />
              <Skeleton className="hidden sm:block rounded-lg w-56 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="rounded-lg w-24 h-8" />
              <Skeleton className="rounded-lg w-16 h-8" />
            </div>
          </div>
        </div>

        <div className="pt-10 pb-10">
          <div className="flex items-center gap-2 mb-6">
            <Skeleton className="rounded-full w-28 h-6" />
            <Skeleton className="rounded-full w-24 h-6" />
          </div>
          <Skeleton className="rounded-xl w-5/6 h-14" />
          <div className="mt-6 space-y-3">
            <Skeleton className="rounded-full w-4/5 h-8" />
            <div className="flex items-center gap-2 flex-wrap">
              <Skeleton className="rounded-full w-20 h-7" />
              <Skeleton className="rounded-full w-24 h-7" />
              <Skeleton className="rounded-full w-28 h-7" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_18rem] gap-10">
          <div className="min-w-0 space-y-10">
            <Skeleton className="rounded-2xl w-full h-44" />
            <div className="space-y-3">
              <Skeleton className="rounded-lg w-full h-5" />
              <Skeleton className="rounded-lg w-full h-5" />
              <Skeleton className="rounded-lg w-5/6 h-5" />
              <Skeleton className="rounded-lg w-full h-5" />
              <Skeleton className="rounded-lg w-4/6 h-5" />
              <Skeleton className="rounded-lg w-full h-32 mt-6" />
            </div>
          </div>

          <div className="space-y-8">
            <Skeleton className="rounded-2xl w-full h-40" />
          </div>
        </div>
      </div>
    </div>
  )
}
