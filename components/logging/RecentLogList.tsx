'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Trash2, Pencil, X, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LogTypeFields } from '@/components/logging/LogTypeFields'
import type { LogEntryRow, LogEntryType } from '@/lib/types'

const TYPE_COLORS: Record<LogEntryType, string> = {
  meal: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  workout: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  bodyweight: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  mood: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  reflection: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

function summarize(entry: LogEntryRow): string {
  const d = entry.data
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
      return `Mood ${score}/10`
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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Record<string, unknown>>({})
  const [editNotes, setEditNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No entries yet.</p>
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
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="rounded-lg border px-3 py-2.5"
        >
          {editingId === entry.id ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[entry.type]}`}>
                  {entry.type}
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
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[entry.type]}`}>
                {entry.type}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{summarize(entry)}</p>
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
      ))}
    </ul>
  )
}

// Re-export Badge so it's used and tree-shaken correctly
export { Badge }
