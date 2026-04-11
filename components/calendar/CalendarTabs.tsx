'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ICSUploader } from './ICSUploader'
import { PSTUploader } from './PSTUploader'
import { MonthGrid } from './MonthGrid'
import { DayLogView } from './DayLogView'
import type { CalendarEvent } from '@/lib/types'

interface CalendarTabsProps {
  events: CalendarEvent[]
  logDates: string[]
  userId: string
}

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

export function CalendarTabs({ events, logDates, userId }: CalendarTabsProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  return (
    <Tabs defaultValue="events">
      <TabsList className="w-full">
        <TabsTrigger value="events" className="flex-1">Events</TabsTrigger>
        <TabsTrigger value="logs" className="flex-1">My Logs</TabsTrigger>
      </TabsList>

      <TabsContent value="events" className="space-y-6 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import Calendar</CardTitle>
            <CardDescription>
              Upload an .ics file to import upcoming events. Re-uploading the same file will update existing events.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Import .ics file</p>
              <ICSUploader />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Import from Outlook</p>
              <PSTUploader />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming events. Import a .ics calendar file to get started.
              </p>
            ) : (
              <ul className="space-y-3">
                {events.map((event) => (
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
      </TabsContent>

      <TabsContent value="logs" className="space-y-6 mt-4">
        <Card>
          <CardContent className="pt-6">
            <MonthGrid
              markedDates={logDates}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </CardContent>
        </Card>

        {selectedDate ? (
          <DayLogView selectedDate={selectedDate} userId={userId} />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Select a day to view entries
          </p>
        )}
      </TabsContent>
    </Tabs>
  )
}
