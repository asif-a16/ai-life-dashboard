import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { TopNav } from '@/components/layout/TopNav'

export default function CalendarLoading() {
  return (
    <>
      <TopNav title="Calendar" />
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-64 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-48" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
