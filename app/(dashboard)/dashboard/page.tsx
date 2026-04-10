import { createClient } from '@/lib/supabase/server'
import { TopNav } from '@/components/layout/TopNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user!.id)
    .single()

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'there'

  return (
    <>
      <TopNav title="Dashboard" />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Welcome back, {displayName}</h2>
          <p className="text-muted-foreground mt-1">Here&apos;s your health overview</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Use the sidebar to navigate. Log your meals, workouts, and habits to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
