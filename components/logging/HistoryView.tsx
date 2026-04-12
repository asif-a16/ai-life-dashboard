'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Clock, Pencil, Trash2, X, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LogTypeFields } from '@/components/logging/LogTypeFields'
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

interface EditState {
  editingId: string | null
  deletingId: string | null
  editData: Record<string, unknown>
  editNotes: string
  isSaving: boolean
  editError: string | null
  setEditData: (data: Record<string, unknown>) => void
  setEditNotes: (notes: string) => void
  onEditStart: (entry: LogEntryRow) => void
  onEditCancel: () => void
  onEditSave: (entry: LogEntryRow) => void
  onDelete: (id: string) => void
}

function DateGroup({
  dateStr,
  entries,
  detailPrefs,
  edit,
}: {
  dateStr: string
  entries: LogEntryRow[]
  detailPrefs: Record<LogEntryType, DetailLevel>
  edit: EditState
}) {
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
                className="rounded-xl border border-l-2 px-3 py-2"
                style={{ borderLeftColor: typeVar }}
              >
                {edit.editingId === entry.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `color-mix(in oklch, ${typeVar} 12%, transparent)`,
                          color: typeVar,
                        }}
                      >
                        {TYPE_LABELS_SINGULAR[entry.type]}
                      </span>
                      <button
                        onClick={edit.onEditCancel}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Cancel edit"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <LogTypeFields
                      type={entry.type}
                      value={edit.editData}
                      onChange={edit.setEditData}
                    />

                    <div className="space-y-1.5">
                      <Label htmlFor={`notes-${entry.id}`}>Notes</Label>
                      <Textarea
                        id={`notes-${entry.id}`}
                        value={edit.editNotes}
                        onChange={(e) => edit.setEditNotes(e.target.value)}
                        placeholder="Any additional context..."
                        className="resize-none"
                        rows={2}
                      />
                    </div>

                    {edit.editError && <p className="text-sm text-destructive">{edit.editError}</p>}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => edit.onEditSave(entry)}
                        disabled={edit.isSaving}
                      >
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        {edit.isSaving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={edit.onEditCancel}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5">
                    <span
                      className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `color-mix(in oklch, ${typeVar} 12%, transparent)`,
                        color: typeVar,
                      }}
                    >
                      {TYPE_LABELS_SINGULAR[entry.type]}
                    </span>
                    <p className="text-sm flex-1">{summarize(entry, detailPrefs[entry.type])}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{formatTime(entry.logged_at)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-6 w-6 text-muted-foreground hover:text-foreground -mt-0.5"
                      onClick={() => edit.onEditStart(entry)}
                      aria-label="Edit entry"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-6 w-6 text-muted-foreground hover:text-destructive -mt-0.5"
                      onClick={() => edit.onDelete(entry.id)}
                      disabled={edit.deletingId === entry.id}
                      aria-label="Delete entry"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
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
  const router = useRouter()
  const [detailPrefs] = useLogDetailPrefs()
  const [selectedType, setSelectedType] = useState<LogEntryType | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Record<string, unknown>>({})
  const [editNotes, setEditNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/log?id=${id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

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
      router.refresh()
    } catch {
      setEditError('Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const edit: EditState = {
    editingId,
    deletingId,
    editData,
    editNotes,
    isSaving,
    editError,
    setEditData,
    setEditNotes,
    onEditStart: handleEditStart,
    onEditCancel: handleEditCancel,
    onEditSave: handleEditSave,
    onDelete: handleDelete,
  }

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
            <DateGroup key={dateStr} dateStr={dateStr} entries={dayEntries} detailPrefs={detailPrefs} edit={edit} />
          ))}
        </div>
      )}
    </div>
  )
}
