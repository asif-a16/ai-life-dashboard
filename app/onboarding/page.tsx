'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Step = 1 | 2 | 3

const PRESET_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

async function markOnboarded() {
  await fetch('/api/profile/onboard', { method: 'PATCH' })
}

function ProgressDots({ step }: { step: Step }) {
  return (
    <div className="flex gap-2 justify-center mb-8">
      {([1, 2, 3] as Step[]).map((s) => (
        <div
          key={s}
          className={`h-2 w-2 rounded-full transition-colors ${
            s === step ? 'bg-primary' : s < step ? 'bg-primary/40' : 'bg-muted'
          }`}
        />
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [habitName, setHabitName] = useState('')
  const [habitColor, setHabitColor] = useState(PRESET_COLORS[0])
  const [isLoading, setIsLoading] = useState(false)
  const [firstEntry, setFirstEntry] = useState('')
  const [entryLogged, setEntryLogged] = useState(false)
  const [isLoggingEntry, setIsLoggingEntry] = useState(false)

  async function handleSkip() {
    setIsLoading(true)
    await markOnboarded()
    router.push('/dashboard')
  }

  async function handleStep2Submit(e: React.FormEvent) {
    e.preventDefault()
    if (habitName.trim()) {
      setIsLoading(true)
      try {
        await fetch('/api/habits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: habitName.trim(), color: habitColor }),
        })
        toast('Habit created')
      } catch {
        // non-fatal — proceed to next step
      } finally {
        setIsLoading(false)
      }
    }
    setStep(3)
  }

  async function handleLogEntry() {
    if (!firstEntry.trim()) return
    setIsLoggingEntry(true)
    try {
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'reflection', data: { content: firstEntry.trim() } }),
      })
      setEntryLogged(true)
      toast('Entry logged')
    } catch {
      // non-fatal
    } finally {
      setIsLoggingEntry(false)
    }
  }

  async function handleFinish() {
    setIsLoading(true)
    await markOnboarded()
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-6">
        <ProgressDots step={step} />

        {step === 1 && (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Welcome to AI Life Dashboard</h1>
              <p className="text-muted-foreground">
                Track your meals, workouts, mood, and habits. Get AI-powered weekly insights delivered as spoken audio.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={() => setStep(2)} className="w-full">
                Get started
              </Button>
              <Button variant="ghost" onClick={handleSkip} disabled={isLoading} className="w-full">
                Skip setup
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Create your first habit</h2>
              <p className="text-muted-foreground text-sm">
                Habits you track daily build streaks and appear in your AI insight.
              </p>
            </div>
            <form onSubmit={handleStep2Submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="habit-name">Habit name</Label>
                <Input
                  id="habit-name"
                  placeholder="e.g. Morning walk, Drink water, Meditate"
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Colour</Label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setHabitColor(c)}
                      className={`h-7 w-7 rounded-full border-2 transition-all ${
                        habitColor === c ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Select colour ${c}`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Creating...' : habitName.trim() ? 'Create habit & continue' : 'Continue without habit'}
                </Button>
                <Button type="button" variant="ghost" onClick={handleSkip} disabled={isLoading} className="w-full">
                  Skip setup
                </Button>
              </div>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">You&apos;re all set</h2>
              <p className="text-muted-foreground text-sm">
                Optionally, describe something from today to make your first log entry.
              </p>
            </div>
            {entryLogged ? (
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">Logged! ✓</p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="first-entry">Describe something from today (optional)</Label>
                <Textarea
                  id="first-entry"
                  placeholder="e.g. Had oatmeal for breakfast, went for a 30-min walk, feeling good today..."
                  value={firstEntry}
                  onChange={(e) => setFirstEntry(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLogEntry}
                  disabled={isLoggingEntry || !firstEntry.trim()}
                >
                  {isLoggingEntry ? 'Logging...' : 'Log it'}
                </Button>
              </div>
            )}
            <Button onClick={handleFinish} disabled={isLoading} className="w-full">
              {isLoading ? 'Loading...' : 'Go to dashboard'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
