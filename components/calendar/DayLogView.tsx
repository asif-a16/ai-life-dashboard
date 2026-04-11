'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, CalendarDays } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import type { LogEntryRow, LogEntryType } from '@/lib/types'

const TYPE_LABELS: Record<LogEntryType, string> = {
  meal: 'Meals',
  workout: 'Workouts',
  bodyweight: 'Weight',
  mood: 'Mood',
  reflection: 'Reflections',
}

const LOG_TYPE_VAR: Record<LogEntryType, string> = {
  meal: 'var(--log-meal)',
  workout: 'var(--log-workout)',
  bodyweight: 'var(--log-bodyweight)',
  mood: 'var(--log-mood)',
  reflection: 'var(--log-reflection)',
}

const ENTRY_TYPES: LogEntryType[] = ['meal', 'workout', 'bodyweight', 'mood', 'reflection']

function summarize(entry: LogEntryRow): string {
  const d = entry.data
  switch (entry.type) {
    case 'meal': {
      const desc = d.description as string
      const cal = d.calories as number | null
      return cal ? `${desc} — ${cal} cal` : desc
    }
    case 'workout':
      return `${d.activity as string} — ${d.duration_min as number} min`
    case 'bodyweight':
      return `${d.weight_kg as number} ${d.unit as string}`
    case 'mood':
      return `Mood ${d.score as number}/10`
    case 'reflection': {
      const content = d.content as string
      return content.length > 80 ? content.slice(0, 80) + '...' : content
    }
    default:
      return ''
  }
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function CollapsibleGroup({ type, entries }: { type: LogEntryType; entries: LogEntryRow[] }) {
  const [open, setOpen] = useState(true)
  const typeVar = LOG_TYPE_VAR[type]

  return (
    <div className="border-l-2 pl-3 space-y-1" style={{ borderLeftColor: typeVar }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left py-1"
      >
        <span className="text-sm font-medium flex-1">{TYPE_LABELS[type]}</span>
        <Badge variant="secondary" className="text-xs">{entries.length}</Badge>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-150 ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <ul className="space-y-1 pb-1">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50">
              <p className="text-sm text-muted-foreground">{summarize(entry)}</p>
              <span className="text-xs text-muted-foreground shrink-0">{formatTime(entry.logged_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface DayLogViewProps {
  selectedDate: string
  userId: string
}

export function DayLogView({ selectedDate, userId }: DayLogViewProps) {
  const [loaded, setLoaded] = useState<{ date: string; entries: LogEntryRow[] } | null>(null)

  const isLoading = loaded?.date !== selectedDate

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase
      .from('log_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', `${selectedDate}T00:00:00`)
      .lte('logged_at', `${selectedDate}T23:59:59`)
      .order('logged_at', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setLoaded({ date: selectedDate, entries: (data ?? []) as LogEntryRow[] })
      })
    return () => { cancelled = true }
  }, [selectedDate, userId])

  const entries = loaded?.date === selectedDate ? loaded.entries : []

  const grouped = ENTRY_TYPES.reduce<Record<LogEntryType, LogEntryRow[]>>(
    (acc, t) => ({ ...acc, [t]: entries.filter((e) => e.type === t) }),
    {} as Record<LogEntryType, LogEntryRow[]>,
  )

  const displayDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">{displayDate}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center gap-2">
            <CalendarDays className="h-9 w-9 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No entries for this day</p>
            <p className="text-xs text-muted-foreground/60">Log entries will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ENTRY_TYPES.filter((t) => grouped[t].length > 0).map((t) => (
              <CollapsibleGroup key={t} type={t} entries={grouped[t]} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
