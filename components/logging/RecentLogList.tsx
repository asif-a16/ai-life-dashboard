'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
        >
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[entry.type]}`}
          >
            {entry.type}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{summarize(entry)}</p>
            <p className="text-xs text-muted-foreground">{relativeTime(entry.logged_at)}</p>
          </div>
          {showDelete && (
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
          )}
        </li>
      ))}
    </ul>
  )
}

// Re-export Badge so it's used and tree-shaken correctly
export { Badge }
