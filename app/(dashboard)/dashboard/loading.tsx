import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { TopNav } from '@/components/layout/TopNav'

export default function DashboardLoading() {
  return (
    <>
      <TopNav title="Dashboard" />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <Skeleton className="h-14 w-24 rounded-lg" />
              <Skeleton className="h-14 w-24 rounded-lg" />
              <Skeleton className="h-14 w-24 rounded-lg" />
              <Skeleton className="h-14 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
