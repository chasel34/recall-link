import { Skeleton } from '@/components/base'

export function ItemDetailSkeleton() {
  return (
    <div className="w-full">
      <div className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="w-full px-6 md:px-12 lg:px-20">
          <div className="h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Skeleton className="rounded-xl h-10 w-10" />
              <div className="h-4 w-px bg-border/70" />
              <Skeleton className="rounded-lg h-4 w-60" />
            </div>
            <Skeleton className="rounded-xl h-10 w-10" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl xl:max-w-6xl 2xl:max-w-7xl px-6 md:px-12 lg:px-20 py-16 md:py-20">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="rounded-lg w-28 h-6" />
            <Skeleton className="rounded-lg w-24 h-6" />
          </div>
          <Skeleton className="rounded-xl w-5/6 h-16" />
          <div className="mt-6">
            <Skeleton className="rounded-full w-4/5 h-8" />
          </div>
          <div className="mt-8 flex items-center gap-2 flex-wrap">
            <Skeleton className="rounded-full w-16 h-5" />
            <Skeleton className="rounded-full w-24 h-7" />
            <Skeleton className="rounded-full w-28 h-7" />
            <Skeleton className="rounded-full w-20 h-7" />
          </div>
          <div className="mt-8 flex items-center gap-4">
            <Skeleton className="rounded-2xl h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="rounded-lg h-4 w-40" />
              <Skeleton className="rounded-lg h-3 w-24" />
            </div>
          </div>
        </div>

        <Skeleton className="rounded-2xl w-full h-48" />

        <div className="mt-14 space-y-3">
          <Skeleton className="rounded-lg w-full h-5" />
          <Skeleton className="rounded-lg w-full h-5" />
          <Skeleton className="rounded-lg w-5/6 h-5" />
          <Skeleton className="rounded-lg w-full h-5" />
          <Skeleton className="rounded-lg w-4/6 h-5" />
          <Skeleton className="rounded-lg w-full h-40 mt-6" />
        </div>
      </div>
    </div>
  )
}
