'use client'

import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
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

const TYPE_BORDER: Record<LogEntryType, string> = {
  meal: 'border-l-blue-400',
  workout: 'border-l-green-400',
  bodyweight: 'border-l-orange-400',
  mood: 'border-l-purple-400',
  reflection: 'border-l-slate-400',
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

  return (
    <div className={`border-l-4 ${TYPE_BORDER[type]} pl-3 space-y-1`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left py-1"
      >
        <span className="text-sm font-medium flex-1">{TYPE_LABELS[type]}</span>
        <Badge variant="secondary" className="text-xs">{entries.length}</Badge>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <ul className="space-y-1 pb-1">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-2">
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
  // Track loaded data as { date, entries } so we can derive loading state
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
        <CardTitle className="text-base">{displayDate}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries for this day.</p>
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
