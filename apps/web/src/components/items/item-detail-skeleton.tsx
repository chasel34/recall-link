import { Skeleton } from '@/components/base'

export function ItemDetailSkeleton() {
  return (
    <div className="w-full mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-border max-w-6xl 2xl:max-w-7xl mx-auto xl:w-full">
        <Skeleton className="rounded-lg w-20 h-8" />
        <div className="flex gap-2">
          <Skeleton className="rounded-lg w-24 h-8" />
          <Skeleton className="rounded-lg w-16 h-8" />
        </div>
      </div>

      <div className="mb-10 flex flex-col items-center">
        <Skeleton className="rounded-full w-20 h-20 mb-6" />
        <Skeleton className="rounded-lg w-3/4 h-12 mb-4" />
        <Skeleton className="rounded-full w-64 h-6" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] xl:grid-cols-[minmax(0,1fr)_minmax(0,44rem)_18rem_minmax(0,1fr)] gap-10">
        <div className="space-y-8 min-w-0 xl:col-start-2">
          <Skeleton className="rounded-xl w-full h-32" />

          <div className="space-y-4">
             <Skeleton className="rounded-lg w-32 h-8" />
             <div className="space-y-2">
               <Skeleton className="rounded-lg w-full h-4" />
               <Skeleton className="rounded-lg w-full h-4" />
               <Skeleton className="rounded-lg w-5/6 h-4" />
               <Skeleton className="rounded-lg w-full h-4" />
               <Skeleton className="rounded-lg w-4/6 h-4" />
             </div>
             <div className="space-y-2 mt-4">
               <Skeleton className="rounded-lg w-full h-32" />
             </div>
          </div>
        </div>

        <div className="space-y-8 xl:col-start-3">
           <div className="space-y-3">
             <Skeleton className="rounded w-12 h-4" />
             <div className="flex gap-2 flex-wrap">
               <Skeleton className="rounded-full w-16 h-6" />
               <Skeleton className="rounded-full w-20 h-6" />
               <Skeleton className="rounded-full w-14 h-6" />
             </div>
           </div>
          
           <Skeleton className="rounded-lg w-full h-32" />
        </div>
      </div>
    </div>
  )
}
