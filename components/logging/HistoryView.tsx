'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { LogEntryRow, LogEntryType } from '@/lib/types'
import { useLogDetailPrefs } from '@/hooks/useLogDetailPrefs'
import type { DetailLevel } from '@/hooks/useLogDetailPrefs'

const TYPE_LABELS: Record<LogEntryType | 'all', string> = {
  all: 'All',
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

function summarize(entry: LogEntryRow, level: DetailLevel): string {
  const d = entry.data
  if (level === 'compact') {
    switch (entry.type) {
      case 'meal': return d.description as string
      case 'workout': return d.activity as string
      case 'bodyweight': return `${d.weight_kg} ${d.unit}`
      case 'mood': return `Mood ${d.score}/10`
      case 'reflection': {
        const c = d.content as string
        return c.length > 60 ? c.slice(0, 60) + '...' : c
      }
      default: return ''
    }
  }
  switch (entry.type) {
    case 'meal': {
      const desc = d.description as string
      const cal = d.calories as number | null
      return cal ? `${desc} — ${cal} cal` : desc
    }
    case 'workout': {
      const act = d.activity as string
      const min = d.duration_min as number
      return `${act} — ${min} min`
    }
    case 'bodyweight': {
      const w = d.weight_kg as number
      const unit = d.unit as string
      return `${w} ${unit}`
    }
    case 'mood': {
      const score = d.score as number
      const energy = d.energy_level as number
      return `Mood ${score}/10 · Energy ${energy}/10`
    }
    case 'reflection': {
      const content = d.content as string
      return content.length > 100 ? content.slice(0, 100) + '...' : content
    }
    default:
      return ''
  }
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDateHeader(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function DateGroup({ dateStr, entries, detailPrefs }: { dateStr: string; entries: LogEntryRow[]; detailPrefs: Record<LogEntryType, DetailLevel> }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left"
      >
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex-1">
          {formatDateHeader(dateStr)}
        </span>
        <Badge variant="secondary" className="text-xs">{entries.length}</Badge>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-150 ${open ? '' : '-rotate-90'}`}
        />
      </button>

      {open && (
        <ul className="space-y-1.5 pl-2">
          {entries.map((entry) => {
            const typeVar = LOG_TYPE_VAR[entry.type]
            return (
              <li
                key={entry.id}
                className="flex items-start gap-2.5 rounded-xl border border-l-2 px-3 py-2"
                style={{ borderLeftColor: typeVar }}
              >
                <span
                  className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: `color-mix(in oklch, ${typeVar} 12%, transparent)`,
                    color: typeVar,
                  }}
                >
                  {TYPE_LABELS[entry.type]}
                </span>
                <p className="text-sm flex-1">{summarize(entry, detailPrefs[entry.type])}</p>
                <span className="text-xs text-muted-foreground shrink-0">{formatTime(entry.logged_at)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

const ALL_TYPES: Array<LogEntryType | 'all'> = ['all', 'meal', 'workout', 'bodyweight', 'mood', 'reflection']

interface HistoryViewProps {
  entries: LogEntryRow[]
}

export function HistoryView({ entries }: HistoryViewProps) {
  const [detailPrefs] = useLogDetailPrefs()
  const [selectedType, setSelectedType] = useState<LogEntryType | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (selectedType !== 'all' && e.type !== selectedType) return false
      const dateStr = e.logged_at.split('T')[0]
      if (dateFrom && dateStr < dateFrom) return false
      if (dateTo && dateStr > dateTo) return false
      return true
    })
  }, [entries, selectedType, dateFrom, dateTo])

  const grouped = useMemo(() => {
    const map = new Map<string, LogEntryRow[]>()
    for (const entry of filtered) {
      const dateStr = entry.logged_at.split('T')[0]
      if (!map.has(dateStr)) map.set(dateStr, [])
      map.get(dateStr)!.push(entry)
    }
    return Array.from(map.entries())
  }, [filtered])

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {ALL_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                selectedType === t
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="From date"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="To date"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo('') }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center gap-2">
          <Clock className="h-9 w-9 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No entries match your filters</p>
          <p className="text-xs text-muted-foreground/60">Try adjusting the type or date range</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([dateStr, dayEntries]) => (
            <DateGroup key={dateStr} dateStr={dateStr} entries={dayEntries} detailPrefs={detailPrefs} />
          ))}
        </div>
      )}
    </div>
  )
}
