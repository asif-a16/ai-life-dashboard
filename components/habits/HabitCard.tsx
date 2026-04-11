'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { HabitWithLog } from '@/lib/types'

interface HabitCardProps {
  habit: HabitWithLog
}

export function HabitCard({ habit }: HabitCardProps) {
  const router = useRouter()
  const [checked, setChecked] = useState(habit.completedToday)
  const [isToggling, setIsToggling] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  async function handleToggle() {
    if (isToggling) return
    const next = !checked
    setChecked(next)
    setIsToggling(true)
    try {
      await fetch('/api/habits/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habit_id: habit.id,
          completed_on: today,
          action: next ? 'complete' : 'undo',
        }),
      })
      router.refresh()
    } catch {
      setChecked(!next)
    } finally {
      setIsToggling(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await fetch(`/api/habits?id=${habit.id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${checked ? 'bg-muted/40' : ''}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={handleToggle}
        disabled={isToggling}
        className="flex items-center gap-3 flex-1 text-left"
      >
        <span
          className="shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors"
          style={{
            backgroundColor: checked ? habit.color : 'transparent',
            borderColor: habit.color,
          }}
        >
          {checked && (
            <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span
          className="shrink-0 h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: habit.color }}
        />
        <span className={`flex-1 text-sm font-medium ${checked ? 'line-through text-muted-foreground' : ''}`}>
          {habit.name}
        </span>
        {habit.currentStreak > 0 && (
          <span className="text-xs text-muted-foreground shrink-0">
            {habit.currentStreak}-day streak
          </span>
        )}
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label="Delete habit"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
