import { createClient } from '@/lib/supabase/server'
import { TopNav } from '@/components/layout/TopNav'
import { HistoryView } from '@/components/logging/HistoryView'
import type { LogEntryRow } from '@/lib/types'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const { data: entries } = await supabase
    .from('log_entries')
    .select('*')
    .eq('user_id', session!.user.id)
    .order('logged_at', { ascending: false })

  return (
    <>
      <TopNav title="History" />
      <div className="p-6 max-w-3xl mx-auto">
        <HistoryView entries={(entries ?? []) as LogEntryRow[]} />
      </div>
    </>
  )
}
