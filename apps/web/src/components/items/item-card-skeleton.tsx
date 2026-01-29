import { Card, CardHeader, CardBody, CardFooter, Skeleton } from '@/components/base'

export function ItemCardSkeleton() {
  return (
    <Card className="h-full border-none shadow-sm bg-card">
      <CardHeader className="h-40 p-0 overflow-hidden">
        <Skeleton className="h-full w-full" />
      </CardHeader>
      <CardBody className="pt-4 px-5 pb-2 space-y-3">
        <Skeleton className="w-3/4 rounded-lg">
          <div className="h-6 w-full bg-muted/80" />
        </Skeleton>
        <div className="space-y-2">
          <Skeleton className="w-full rounded-lg">
            <div className="h-3 w-full bg-muted/80" />
          </Skeleton>
          <Skeleton className="w-full rounded-lg">
            <div className="h-3 w-full bg-muted/80" />
          </Skeleton>
        </div>
        <div className="flex gap-2 mt-3">
          <Skeleton className="w-16 rounded-full">
            <div className="h-6 w-full bg-muted/80" />
          </Skeleton>
          <Skeleton className="w-16 rounded-full">
            <div className="h-6 w-full bg-muted/80" />
          </Skeleton>
        </div>
      </CardBody>
      <CardFooter className="px-5 py-4">
        <Skeleton className="w-32 rounded-lg">
          <div className="h-3 w-full bg-muted/80" />
        </Skeleton>
      </CardFooter>
    </Card>
  )
}
