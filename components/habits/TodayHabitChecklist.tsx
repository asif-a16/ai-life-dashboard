'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HabitCard } from './HabitCard'
import type { HabitWithLog } from '@/lib/types'

const PRESET_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444']

interface TodayHabitChecklistProps {
  habits: HabitWithLog[]
  showAddForm?: boolean
}

export function TodayHabitChecklist({ habits, showAddForm = true }: TodayHabitChecklistProps) {
  const router = useRouter()
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setIsAdding(true)
    setError(null)
    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'Failed to add habit')
        return
      }
      setNewName('')
      router.refresh()
    } catch {
      setError('Failed to add habit. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="space-y-2">
      {habits.length === 0 && !showAddForm && (
        <div className="flex flex-col items-center py-8 text-center gap-2">
          <CheckSquare className="h-9 w-9 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No habits tracked</p>
          <p className="text-xs text-muted-foreground/60">Add habits on the Habits page</p>
        </div>
      )}

      {habits.length === 0 && showAddForm && (
        <div className="flex flex-col items-center py-6 text-center gap-1 mb-2">
          <CheckSquare className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No habits yet</p>
          <p className="text-xs text-muted-foreground/60">Habits are daily goals you check off. Build a streak by completing them every day.</p>
        </div>
      )}

      {habits.map((habit) => (
        <HabitCard key={habit.id} habit={habit} />
      ))}

      {showAddForm && (
        <form onSubmit={handleAdd} className="mt-4 rounded-xl border bg-muted/30 p-4 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Habit name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isAdding || !newName.trim()} size="sm">
              {isAdding ? 'Adding...' : 'Add'}
            </Button>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted-foreground">Color:</span>
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setNewColor(color)}
                className="h-5 w-5 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: color,
                  borderColor: newColor === color ? 'white' : 'transparent',
                  outline: newColor === color ? `2px solid ${color}` : 'none',
                  outlineOffset: '1px',
                }}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      )}
    </div>
  )
}
