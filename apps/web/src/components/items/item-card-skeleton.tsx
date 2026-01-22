import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function ItemCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-40 w-full" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <div className="flex gap-2 mt-3">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-3 w-32" />
      </CardFooter>
    </Card>
  )
}
