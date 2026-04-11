import { createClient } from '@/lib/supabase/server'
import { TopNav } from '@/components/layout/TopNav'
import { CalendarTabs } from '@/components/calendar/CalendarTabs'
import type { CalendarEvent } from '@/lib/types'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session!.user.id
  const now = new Date().toISOString()

  const [{ data: events }, { data: logEntries }] = await Promise.all([
    supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gt('start_at', now)
      .order('start_at', { ascending: true })
      .limit(20),
    supabase
      .from('log_entries')
      .select('logged_at')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false }),
  ])

  const upcomingEvents = (events ?? []) as CalendarEvent[]
  const logDates = (logEntries ?? []).map((e) => e.logged_at as string)

  return (
    <>
      <TopNav title="Calendar" />
      <div className="p-6 max-w-2xl mx-auto">
        <CalendarTabs
          events={upcomingEvents}
          logDates={logDates}
          userId={userId}
        />
      </div>
    </>
  )
}
