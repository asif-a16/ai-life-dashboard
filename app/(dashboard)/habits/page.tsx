import { TopNav } from '@/components/layout/TopNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function HabitsPage() {
  return (
    <>
      <TopNav title="Habits" />
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Habits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Habit tracking coming in Phase 2.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
