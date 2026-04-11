import { createClient } from '@/lib/supabase/server'
import { TopNav } from '@/components/layout/TopNav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ICSUploader } from '@/components/calendar/ICSUploader'
import type { CalendarEvent } from '@/lib/types'

function formatEventDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const now = new Date().toISOString()

  const { data: events } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', session!.user.id)
    .gt('start_at', now)
    .order('start_at', { ascending: true })
    .limit(20)

  const upcomingEvents = (events ?? []) as CalendarEvent[]

  return (
    <>
      <TopNav title="Calendar" />
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import Calendar</CardTitle>
            <CardDescription>
              Upload an .ics file to import upcoming events. Re-uploading the same file will update existing events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ICSUploader />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming events. Import a .ics calendar file to get started.
              </p>
            ) : (
              <ul className="space-y-3">
                {upcomingEvents.map((event) => (
                  <li key={event.id} className="flex flex-col gap-0.5 rounded-lg border px-3 py-2.5">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{formatEventDate(event.start_at)}</p>
                    {event.location && (
                      <p className="text-xs text-muted-foreground">{event.location}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
