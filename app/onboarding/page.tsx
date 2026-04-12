'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Mic, Bot, Sparkles, CheckSquare, Utensils, ChefHat,
  Calendar, Volume2, ClipboardList, MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Step = 1 | 2 | 3 | 4 | 5 | 6

const TOTAL_STEPS = 6
const PRESET_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

async function markOnboarded() {
  await fetch('/api/profile/onboard', { method: 'PATCH' })
}

function ProgressDots({ step }: { step: Step }) {
  return (
    <div className="flex gap-2 justify-center mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
        <div
          key={s}
          className={`h-2 rounded-full transition-all duration-300 ${
            s === step ? 'bg-primary w-4' : s < step ? 'bg-primary/40 w-2' : 'bg-muted w-2'
          }`}
        />
      ))}
    </div>
  )
}

interface FeatureItemProps {
  icon: React.ReactNode
  title: string
  description: string
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 h-8 w-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
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

  function next() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS) as Step)
  }

  async function handleStep5Submit(e: React.FormEvent) {
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
    next()
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

        {/* ── Step 1: Welcome ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Welcome to AI Life Dashboard</h1>
              <p className="text-muted-foreground">
                Track your meals, workouts, mood, and habits. Get AI-powered weekly insights delivered as spoken audio.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={next} className="w-full">
                Get started
              </Button>
              <Button variant="ghost" onClick={handleSkip} disabled={isLoading} className="w-full text-muted-foreground">
                Skip and go to dashboard
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Logging ─────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Track everything, your way</h2>
              <p className="text-muted-foreground text-sm">
                Log entries by typing or speaking — whatever is fastest for you.
              </p>
            </div>
            <div className="space-y-4">
              <FeatureItem
                icon={<ClipboardList className="h-4 w-4" />}
                title="5 entry types"
                description="Log meals, workouts, bodyweight, mood, and reflections — each with structured fields and optional notes."
              />
              <FeatureItem
                icon={<Mic className="h-4 w-4" />}
                title="Voice recording"
                description="Tap the mic on the Log page, say what you did, and the app transcribes and auto-fills the form for you."
              />
              <FeatureItem
                icon={<MessageSquare className="h-4 w-4" />}
                title="Conversational AI assistant"
                description="Open the assistant and speak naturally — it can log entries, answer questions about your data, and look up your saved foods."
              />
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <Button onClick={next} className="w-full">Next</Button>
              <Button variant="ghost" onClick={handleSkip} disabled={isLoading} className="w-full text-muted-foreground text-sm">
                Skip setup
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: AI Insights ─────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Your weekly AI summary</h2>
              <p className="text-muted-foreground text-sm">
                The dashboard generates a personalized insight from everything you&apos;ve logged.
              </p>
            </div>
            <div className="space-y-4">
              <FeatureItem
                icon={<Sparkles className="h-4 w-4" />}
                title="AI-written narrative"
                description="Claude reads your week's data and writes a warm, actionable summary — mood trends, workout consistency, nutrition, and more."
              />
              <FeatureItem
                icon={<Volume2 className="h-4 w-4" />}
                title="Spoken aloud"
                description="The insight is read back to you as audio via ElevenLabs — like a health coach checking in each week."
              />
              <FeatureItem
                icon={<Calendar className="h-4 w-4" />}
                title="Calendar-aware"
                description="Import a .ics calendar file and the AI will factor in your upcoming events when generating advice."
              />
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <Button onClick={next} className="w-full">Next</Button>
              <Button variant="ghost" onClick={handleSkip} disabled={isLoading} className="w-full text-muted-foreground text-sm">
                Skip setup
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Habits, Foods & Recipes ─────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Build routines that stick</h2>
              <p className="text-muted-foreground text-sm">
                A few tools to make tracking faster and more consistent over time.
              </p>
            </div>
            <div className="space-y-4">
              <FeatureItem
                icon={<CheckSquare className="h-4 w-4" />}
                title="Daily habits & streaks"
                description="Add habits to check off each day. Streaks build automatically and feed into your weekly AI insight."
              />
              <FeatureItem
                icon={<Utensils className="h-4 w-4" />}
                title="Custom food library"
                description="Save foods with their nutritional values per 100 g. When logging a meal, search your library and enter a weight — macros fill in automatically."
              />
              <FeatureItem
                icon={<Bot className="h-4 w-4" />}
                title="Recipes"
                description="Combine saved foods into recipes with a total yield weight. The app calculates per-100 g nutrition so you can log any portion accurately."
              />
              <FeatureItem
                icon={<ChefHat className="h-4 w-4" />}
                title="Sub-recipes"
                description="Recipes can include other recipes as ingredients — useful for complex dishes like sauces or meal-preps you reuse."
              />
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <Button onClick={next} className="w-full">Next</Button>
              <Button variant="ghost" onClick={handleSkip} disabled={isLoading} className="w-full text-muted-foreground text-sm">
                Skip setup
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 5: Create first habit ───────────────────────────── */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Create your first habit</h2>
              <p className="text-muted-foreground text-sm">
                Habits you check off daily build streaks and appear in your AI insight.
              </p>
            </div>
            <form onSubmit={handleStep5Submit} className="space-y-4">
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
                <Button type="button" variant="ghost" onClick={handleSkip} disabled={isLoading} className="w-full text-muted-foreground text-sm">
                  Skip setup
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── Step 6: All set ──────────────────────────────────────── */}
        {step === 6 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">You&apos;re all set</h2>
              <p className="text-muted-foreground text-sm">
                Optionally, describe something from today to make your first log entry.
              </p>
            </div>
            {entryLogged ? (
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">Logged ✓</p>
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
