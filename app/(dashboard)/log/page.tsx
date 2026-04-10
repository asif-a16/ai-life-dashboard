import { createClient } from '@/lib/supabase/server'
import { TopNav } from '@/components/layout/TopNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LogEntryForm } from '@/components/logging/LogEntryForm'
import { RecentLogList } from '@/components/logging/RecentLogList'
import type { LogEntryRow } from '@/lib/types'

export default async function LogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: entries } = await supabase
    .from('log_entries')
    .select('*')
    .eq('user_id', user!.id)
    .order('logged_at', { ascending: false })
    .limit(10)

  return (
    <>
      <TopNav title="Log Entry" />
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>New Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <LogEntryForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentLogList entries={(entries ?? []) as LogEntryRow[]} showDelete={true} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
