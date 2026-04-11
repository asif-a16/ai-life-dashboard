'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Trash2, Pencil, X, Check, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LogTypeFields } from '@/components/logging/LogTypeFields'
import type { LogEntryRow, LogEntryType } from '@/lib/types'
import { useLogDetailPrefs } from '@/hooks/useLogDetailPrefs'
import type { DetailLevel } from '@/hooks/useLogDetailPrefs'

const LOG_TYPE_VAR: Record<LogEntryType, string> = {
  meal: 'var(--log-meal)',
  workout: 'var(--log-workout)',
  bodyweight: 'var(--log-bodyweight)',
  mood: 'var(--log-mood)',
  reflection: 'var(--log-reflection)',
}

const TYPE_LABELS: Record<LogEntryType, string> = {
  meal: 'Meal',
  workout: 'Workout',
  bodyweight: 'Weight',
  mood: 'Mood',
  reflection: 'Reflection',
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
        const content = d.content as string
        return content.length > 50 ? content.slice(0, 50) + '...' : content
      }
      default: return ''
    }
  }
  switch (entry.type) {
    case 'meal': {
      const desc = d.description as string
      const cal = d.calories as number | null
      const parts = [cal ? `${cal} cal` : null]
      const protein = d.protein_g as number | null
      if (protein) parts.push(`${protein}g protein`)
      const fat = d.fat_g as number | null
      if (fat) parts.push(`${fat}g fat`)
      const carbs = d.carbs_g as number | null
      if (carbs) parts.push(`${carbs}g carbs`)
      const extra = parts.filter(Boolean).join(' · ')
      return extra ? `${desc} — ${extra}` : desc
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
      return content.length > 80 ? content.slice(0, 80) + '...' : content
    }
    default:
      return ''
  }
}

function relativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diff = Math.floor((now - then) / 1000)

  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
  return `${Math.floor(diff / 86400)} days ago`
}

interface RecentLogListProps {
  entries: LogEntryRow[]
  showDelete?: boolean
}

export function RecentLogList({ entries, showDelete }: RecentLogListProps) {
  const router = useRouter()
  const [detailPrefs] = useLogDetailPrefs()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Record<string, unknown>>({})
  const [editNotes, setEditNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center gap-2">
        <ClipboardList className="h-9 w-9 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">No entries yet</p>
        <p className="text-xs text-muted-foreground/60">Log your first meal, workout, or mood above</p>
      </div>
    )
  }

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

  return (
    <ul className="space-y-2">
      {entries.map((entry) => {
        const typeVar = LOG_TYPE_VAR[entry.type]
        return (
          <li
            key={entry.id}
            className="rounded-xl border border-l-2 px-4 py-3"
            style={{ borderLeftColor: typeVar }}
          >
            {editingId === entry.id ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `color-mix(in oklch, ${typeVar} 12%, transparent)`,
                      color: typeVar,
                    }}
                  >
                    {TYPE_LABELS[entry.type]}
                  </span>
                  <button
                    onClick={handleEditCancel}
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
                    onClick={() => handleEditSave(entry)}
                    disabled={isSaving}
                  >
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleEditCancel}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: `color-mix(in oklch, ${typeVar} 12%, transparent)`,
                    color: typeVar,
                  }}
                >
                  {TYPE_LABELS[entry.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{summarize(entry, detailPrefs[entry.type])}</p>
                  <p className="text-xs text-muted-foreground">{relativeTime(entry.logged_at)}</p>
                </div>
                {showDelete && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => handleEditStart(entry)}
                      aria-label="Edit entry"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                      aria-label="Delete entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
