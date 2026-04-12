'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, CalendarDays, Pencil, X, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LogTypeFields } from '@/components/logging/LogTypeFields'
import { createClient } from '@/lib/supabase/client'
import type { LogEntryRow, LogEntryType } from '@/lib/types'

const TYPE_LABELS: Record<LogEntryType, string> = {
  meal: 'Meals',
  workout: 'Workouts',
  bodyweight: 'Weight',
  mood: 'Mood',
  reflection: 'Reflections',
}

const TYPE_LABELS_SINGULAR: Record<LogEntryType, string> = {
  meal: 'Meal',
  workout: 'Workout',
  bodyweight: 'Weight',
  mood: 'Mood',
  reflection: 'Reflection',
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

interface CollapsibleGroupProps {
  type: LogEntryType
  entries: LogEntryRow[]
  editingId: string | null
  editData: Record<string, unknown>
  editNotes: string
  isSaving: boolean
  editError: string | null
  setEditData: (data: Record<string, unknown>) => void
  setEditNotes: (notes: string) => void
  onEditStart: (entry: LogEntryRow) => void
  onEditCancel: () => void
  onEditSave: (entry: LogEntryRow) => void
}

function CollapsibleGroup({
  type,
  entries,
  editingId,
  editData,
  editNotes,
  isSaving,
  editError,
  setEditData,
  setEditNotes,
  onEditStart,
  onEditCancel,
  onEditSave,
}: CollapsibleGroupProps) {
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
            <li key={entry.id} className="rounded-lg">
              {editingId === entry.id ? (
                <div className="space-y-3 px-2 py-2 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `color-mix(in oklch, ${typeVar} 12%, transparent)`,
                        color: typeVar,
                      }}
                    >
                      {TYPE_LABELS_SINGULAR[type]}
                    </span>
                    <button
                      onClick={onEditCancel}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Cancel edit"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <LogTypeFields
                    type={entry.type}
                    value={editData}
                    onChange={setEditData}
                  />

                  <div className="space-y-1.5">
                    <Label htmlFor={`notes-${entry.id}`}>Notes</Label>
                    <Textarea
                      id={`notes-${entry.id}`}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Any additional context..."
                      className="resize-none"
                      rows={2}
                    />
                  </div>

                  {editError && <p className="text-sm text-destructive">{editError}</p>}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => onEditSave(entry)}
                      disabled={isSaving}
                    >
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={onEditCancel}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50">
                  <p className="text-sm text-muted-foreground flex-1">{summarize(entry)}</p>
                  <span className="text-xs text-muted-foreground shrink-0">{formatTime(entry.logged_at)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => onEditStart(entry)}
                    aria-label="Edit entry"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              )}
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

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Record<string, unknown>>({})
  const [editNotes, setEditNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const fetchEntries = useCallback((date: string) => {
    let cancelled = false
    const supabase = createClient()
    supabase
      .from('log_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', `${date}T00:00:00`)
      .lte('logged_at', `${date}T23:59:59`)
      .order('logged_at', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setLoaded({ date, entries: (data ?? []) as LogEntryRow[] })
      })
    return () => { cancelled = true }
  }, [userId])

  useEffect(() => {
    return fetchEntries(selectedDate)
  }, [selectedDate, fetchEntries])

  // Reset edit state when date changes
  useEffect(() => {
    setEditingId(null)
    setEditData({})
    setEditNotes('')
    setEditError(null)
  }, [selectedDate])

  function handleEditStart(entry: LogEntryRow) {
    setEditingId(entry.id)
    setEditData(entry.data as Record<string, unknown>)
    setEditNotes(entry.notes ?? '')
    setEditError(null)
  }

  function handleEditCancel() {
    setEditingId(null)
    setEditData({})
    setEditNotes('')
    setEditError(null)
  }

  async function handleEditSave(entry: LogEntryRow) {
    setIsSaving(true)
    setEditError(null)
    try {
      const res = await fetch('/api/log', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id, data: editData, notes: editNotes }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) {
        setEditError(json.error ?? 'Failed to save')
        return
      }
      setEditingId(null)
      fetchEntries(selectedDate)
    } catch {
      setEditError('Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const isLoading = loaded?.date !== selectedDate
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
              <CollapsibleGroup
                key={t}
                type={t}
                entries={grouped[t]}
                editingId={editingId}
                editData={editData}
                editNotes={editNotes}
                isSaving={isSaving}
                editError={editError}
                setEditData={setEditData}
                setEditNotes={setEditNotes}
                onEditStart={handleEditStart}
                onEditCancel={handleEditCancel}
                onEditSave={handleEditSave}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
