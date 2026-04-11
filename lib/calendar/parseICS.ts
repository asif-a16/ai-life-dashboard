import ICAL from 'ical.js'
import type { CalendarEvent } from '@/lib/types'

type ParsedCalendarEvent = Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>

export function parseICS(icsString: string): ParsedCalendarEvent[] {
  try {
    const parsed = ICAL.parse(icsString)
    const comp = new ICAL.Component(parsed)
    const vevents = comp.getAllSubcomponents('vevent')

    const now = new Date()
    const ninetyDaysOut = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
    const results: ParsedCalendarEvent[] = []

    for (const vevent of vevents) {
      // Skip recurring events
      if (vevent.hasProperty('rrule')) continue

      const dtstartProp = vevent.getFirstPropertyValue('dtstart')
      if (!dtstartProp) continue

      const startAt = (dtstartProp as ICAL.Time).toJSDate()
      if (startAt <= now || startAt > ninetyDaysOut) continue

      const dtendProp = vevent.getFirstPropertyValue('dtend')
      const uid = vevent.getFirstPropertyValue('uid') as string | null
      const summary = vevent.getFirstPropertyValue('summary') as string | null
      const description = vevent.getFirstPropertyValue('description') as string | null
      const location = vevent.getFirstPropertyValue('location') as string | null

      results.push({
        title: summary ?? 'Untitled',
        start_at: startAt.toISOString(),
        end_at: dtendProp ? (dtendProp as ICAL.Time).toJSDate().toISOString() : null,
        ics_uid: uid ?? null,
        description: description ?? null,
        location: location ?? null,
      })
    }

    return results
  } catch {
    return []
  }
}
