import { TopNav } from '@/components/layout/TopNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function CalendarPage() {
  return (
    <>
      <TopNav title="Calendar" />
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Calendar and ICS import coming in Phase 5.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
