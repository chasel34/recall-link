import { Card, CardHeader, CardBody, Skeleton } from '@/components/base'

export function ItemCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="aspect-[16/10] p-0 overflow-hidden">
        <Skeleton className="h-full w-full" />
      </CardHeader>
      <CardBody className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="w-24 rounded-lg">
            <div className="h-3 w-full bg-muted/80" />
          </Skeleton>
          <Skeleton className="w-16 rounded-lg">
            <div className="h-3 w-full bg-muted/80" />
          </Skeleton>
        </div>

        <Skeleton className="w-4/5 rounded-lg">
          <div className="h-6 w-full bg-muted/80" />
        </Skeleton>

        <div className="space-y-2">
          <Skeleton className="w-full rounded-lg">
            <div className="h-4 w-full bg-muted/80" />
          </Skeleton>
          <Skeleton className="w-3/4 rounded-lg">
            <div className="h-4 w-full bg-muted/80" />
          </Skeleton>
        </div>

        <div className="flex gap-2 pt-2">
          <Skeleton className="w-16 rounded-full">
            <div className="h-6 w-full bg-muted/80" />
          </Skeleton>
          <Skeleton className="w-16 rounded-full">
            <div className="h-6 w-full bg-muted/80" />
          </Skeleton>
        </div>
      </CardBody>
    </Card>
  )
}
