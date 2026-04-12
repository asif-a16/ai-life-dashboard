'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { LogTypeFields } from './LogTypeFields'
import type { LogEntryType, ParsedLogEntry } from '@/lib/types'

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function tomorrowMax(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(23, 59, 0, 0)
  return toDatetimeLocal(d)
}

const DEFAULT_DATA: Record<LogEntryType, Record<string, unknown>> = {
  meal: { description: '', meal_type: 'lunch', calories: null, protein_g: null },
  workout: { activity: '', duration_min: '', intensity: 'moderate', distance_km: null },
  bodyweight: { weight_kg: '', unit: 'kg' },
  mood: { score: 6, energy_level: 5, emotions: [] },
  reflection: { content: '' },
}

interface LogEntryFormProps {
  prefill?: ParsedLogEntry
}

export function LogEntryForm({ prefill }: LogEntryFormProps) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<LogEntryType>(prefill?.type ?? 'meal')
  const [formData, setFormData] = useState<Record<LogEntryType, Record<string, unknown>>>({
    meal: prefill?.type === 'meal' ? (prefill.data as Record<string, unknown>) : { ...DEFAULT_DATA.meal },
    workout: prefill?.type === 'workout' ? (prefill.data as Record<string, unknown>) : { ...DEFAULT_DATA.workout },
    bodyweight: prefill?.type === 'bodyweight' ? (prefill.data as Record<string, unknown>) : { ...DEFAULT_DATA.bodyweight },
    mood: prefill?.type === 'mood' ? (prefill.data as Record<string, unknown>) : { ...DEFAULT_DATA.mood },
    reflection: prefill?.type === 'reflection' ? (prefill.data as Record<string, unknown>) : { ...DEFAULT_DATA.reflection },
  })
  const [notes, setNotes] = useState(prefill?.notes ?? '')
  const [showNotes, setShowNotes] = useState(false)
  const [loggedAt, setLoggedAt] = useState(() => toDatetimeLocal(new Date()))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDatetime, setShowDatetime] = useState(false)

  function handleDataChange(data: Record<string, unknown>) {
    setFormData((prev) => ({ ...prev, [selectedType]: data }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          data: formData[selectedType],
          notes: notes || undefined,
          logged_at: new Date(loggedAt).toISOString(),
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to save entry')
        return
      }

      toast('Entry saved')
      setFormData({
        meal: { ...DEFAULT_DATA.meal },
        workout: { ...DEFAULT_DATA.workout },
        bodyweight: { ...DEFAULT_DATA.bodyweight },
        mood: { ...DEFAULT_DATA.mood },
        reflection: { ...DEFAULT_DATA.reflection },
      })
      setNotes('')
      setShowNotes(false)
      setLoggedAt(toDatetimeLocal(new Date()))
      router.refresh()
    } catch {
      setError('Failed to save entry. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        {!showDatetime ? (
          <button
            type="button"
            onClick={() => setShowDatetime(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Logged just now · <span className="underline underline-offset-2">Change time</span>
          </button>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="logged-at">When</Label>
            <Input
              id="logged-at"
              type="datetime-local"
              value={loggedAt}
              max={tomorrowMax()}
              onChange={(e) => setLoggedAt(e.target.value)}
            />
          </div>
        )}
      </div>

      <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as LogEntryType)}>
        <TabsList className="grid grid-cols-3 sm:grid-cols-5 w-full">
          <TabsTrigger value="meal">Meal</TabsTrigger>
          <TabsTrigger value="workout">Workout</TabsTrigger>
          <TabsTrigger value="bodyweight">Weight</TabsTrigger>
          <TabsTrigger value="mood">Mood</TabsTrigger>
          <TabsTrigger value="reflection">Reflection</TabsTrigger>
        </TabsList>

        {(['meal', 'workout', 'bodyweight', 'mood', 'reflection'] as LogEntryType[]).map((type) => (
          <TabsContent key={type} value={type} className="mt-4">
            <LogTypeFields
              type={type}
              value={formData[type]}
              onChange={handleDataChange}
            />
          </TabsContent>
        ))}
      </Tabs>

      <div className="space-y-2">
        {!showNotes ? (
          <button
            type="button"
            onClick={() => setShowNotes(true)}
            className="text-sm text-primary/80 hover:text-primary underline-offset-2 hover:underline transition-colors"
          >
            + Add notes
          </button>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional context..."
              className="resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full h-11">
        {isSubmitting ? 'Saving...' : 'Save Entry'}
      </Button>
    </form>
  )
}
