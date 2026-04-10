import { TopNav } from '@/components/layout/TopNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LogPage() {
  return (
    <>
      <TopNav title="Log Entry" />
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Log Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Logging form coming in Phase 2.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
