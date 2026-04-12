'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Conversation } from '@elevenlabs/client'
import type { VoiceConversation, TextConversation, Status, Mode } from '@elevenlabs/client'
import { Mic, Check, PhoneOff, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LogTypeFields } from '@/components/logging/LogTypeFields'
import {
  MealDataSchema,
  WorkoutDataSchema,
  BodyweightDataSchema,
  MoodDataSchema,
  ReflectionDataSchema,
} from '@/lib/types'
import type { AssistantDraft, LogEntryType } from '@/lib/types'

type AnyConversation = VoiceConversation | TextConversation

const TYPE_LABELS: Record<LogEntryType, string> = {
  meal: 'Meal',
  workout: 'Workout',
  bodyweight: 'Bodyweight',
  mood: 'Mood',
  reflection: 'Reflection',
}

interface AssistantConversationProps {
  onClose: () => void
}

export function AssistantConversation({ onClose }: AssistantConversationProps) {
  const router = useRouter()
  const [connStatus, setConnStatus] = useState<Status>('disconnected')
  const [agentMode, setAgentMode] = useState<Mode | null>(null)
  const [pendingDraft, setPendingDraft] = useState<AssistantDraft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [draftData, setDraftData] = useState<Record<string, unknown>>({})
  const [draftNotes, setDraftNotes] = useState('')

  const conversationRef = useRef<AnyConversation | null>(null)
  const wasConnectedRef = useRef(false)

  async function callReadTool(toolName: string): Promise<string> {
    try {
      const res = await fetch('/api/assistant/tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName, parameters: {} }),
      })
      const json = await res.json() as { data?: { result: Record<string, unknown> }; error?: string }
      if (!res.ok) return JSON.stringify({ error: json.error ?? 'Tool call failed' })
      return JSON.stringify(json.data!.result)
    } catch (e) {
      return JSON.stringify({ error: e instanceof Error ? e.message : 'Tool call failed' })
    }
  }

  function openDraft(type: LogEntryType, data: Record<string, unknown>): Promise<string> {
    setDraftData(data)
    setDraftNotes('')
    return new Promise<string>((promiseResolve) => {
      const draft: AssistantDraft = {
        entry: { type, data },
        resolve: ({ status, message }) =>
          promiseResolve(JSON.stringify({ status, ...(message ? { message } : {}) })),
      }
      setPendingDraft(draft)
    })
  }

  async function handleStartConversation() {
    setError(null)

    try {
      const res = await fetch('/api/voice/session', { method: 'POST' })
      const json = await res.json() as { data?: { signedUrl: string }; error?: string }
      if (!res.ok) {
        setError(json.error ?? 'Failed to start session')
        return
      }

      const conversation = await Conversation.startSession({
        signedUrl: json.data!.signedUrl,
        onStatusChange: ({ status }) => {
          setConnStatus(status)
          if (status === 'connected') wasConnectedRef.current = true
          if (status === 'disconnected') {
            setAgentMode(null)
            conversationRef.current = null
          }
        },
        onError: (message) => {
          setError(typeof message === 'string' ? message : 'Connection error')
        },
        onModeChange: ({ mode }) => setAgentMode(mode),
        clientTools: {
          query_all_summary: () => callReadTool('query_all_summary'),
          query_mood_summary: () => callReadTool('query_mood_summary'),
          query_weight_trend: () => callReadTool('query_weight_trend'),
          query_workout_consistency: () => callReadTool('query_workout_consistency'),
          query_habits_summary: () => callReadTool('query_habits_summary'),
          query_recent_meals: () => callReadTool('query_recent_meals'),

          create_meal_log_draft: (params: Record<string, unknown>) => {
            const result = MealDataSchema.safeParse({
              description: params.description,
              meal_type: params.meal_type,
              calories: params.calories ?? null,
              protein_g: params.protein_g ?? null,
              fat_g: params.fat_g ?? null,
              carbs_g: params.carbs_g ?? null,
            })
            if (!result.success) return JSON.stringify({ status: 'error', message: result.error.message })
            return openDraft('meal', result.data as Record<string, unknown>)
          },

          create_workout_log_draft: (params: Record<string, unknown>) => {
            const result = WorkoutDataSchema.safeParse({
              activity: params.activity,
              duration_min: params.duration_min,
              intensity: params.intensity,
              distance_km: params.distance_km ?? null,
            })
            if (!result.success) return JSON.stringify({ status: 'error', message: result.error.message })
            return openDraft('workout', result.data as Record<string, unknown>)
          },

          create_bodyweight_log_draft: (params: Record<string, unknown>) => {
            const result = BodyweightDataSchema.safeParse({
              weight_kg: params.weight_kg,
              unit: params.unit,
            })
            if (!result.success) return JSON.stringify({ status: 'error', message: result.error.message })
            return openDraft('bodyweight', result.data as Record<string, unknown>)
          },

          create_mood_log_draft: (params: Record<string, unknown>) => {
            const emotions =
              typeof params.emotions === 'string'
                ? params.emotions.split(',').map((s: string) => s.trim()).filter(Boolean)
                : Array.isArray(params.emotions)
                  ? (params.emotions as string[])
                  : []
            const result = MoodDataSchema.safeParse({
              score: params.score,
              energy_level: params.energy_level,
              emotions,
            })
            if (!result.success) return JSON.stringify({ status: 'error', message: result.error.message })
            return openDraft('mood', result.data as Record<string, unknown>)
          },

          create_reflection_log_draft: (params: Record<string, unknown>) => {
            const result = ReflectionDataSchema.safeParse({ content: params.content })
            if (!result.success) return JSON.stringify({ status: 'error', message: result.error.message })
            return openDraft('reflection', result.data as Record<string, unknown>)
          },
        },
      })

      conversationRef.current = conversation as AnyConversation
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect')
      setConnStatus('disconnected')
    }
  }

  // End session on unmount
  useEffect(() => {
    return () => {
      conversationRef.current?.endSession()
    }
  }, [])

  async function handleEndConversation() {
    if (conversationRef.current) {
      await conversationRef.current.endSession()
    }
  }

  async function handleSaveDraft() {
    if (!pendingDraft) return
    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: pendingDraft.entry.type,
          data: draftData,
          notes: draftNotes || undefined,
        }),
      })
      const json = await res.json() as { error?: string }

      if (!res.ok) {
        const msg = json.error ?? 'Failed to save entry'
        setError(msg)
        pendingDraft.resolve({ status: 'error', message: msg })
        setPendingDraft(null)
        return
      }

      toast('Entry saved')
      router.refresh()
      pendingDraft.resolve({ status: 'saved' })
      setPendingDraft(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save'
      setError(msg)
      pendingDraft.resolve({ status: 'error', message: msg })
      setPendingDraft(null)
    } finally {
      setIsSaving(false)
    }
  }

  function handleDiscardDraft() {
    if (!pendingDraft) return
    pendingDraft.resolve({ status: 'discarded' })
    setPendingDraft(null)
  }

  // ─── Connecting / Disconnecting ───────────────────────────────────────────

  if (connStatus === 'connecting' || connStatus === 'disconnecting') {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {connStatus === 'connecting' ? 'Connecting...' : 'Ending session...'}
        </p>
      </div>
    )
  }

  // ─── Disconnected ─────────────────────────────────────────────────────────

  if (connStatus === 'disconnected') {
    // Session just ended
    if (wasConnectedRef.current) {
      return (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <p className="text-sm font-medium">Session ended</p>
          <p className="text-sm text-muted-foreground">Check Recent Entries to see what was logged.</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={onClose} size="sm" variant="outline">
            Close
          </Button>
        </div>
      )
    }

    // Initial state or error before connecting
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          Ask questions about your health data or log entries by voice.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={handleStartConversation} className="w-full">
          <Mic className="h-4 w-4 mr-2" />
          Start Conversation
        </Button>
      </div>
    )
  }

  // ─── Connected ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Animated mic indicator */}
      <div className="relative flex items-center justify-center h-36 w-36">
        {agentMode === 'speaking' && (
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        )}
        <div
          className={`absolute inset-4 rounded-full transition-colors duration-300 ${
            agentMode === 'speaking' ? 'animate-pulse bg-primary/30' : 'animate-pulse bg-muted'
          }`}
        />
        <div
          className={`relative flex h-16 w-16 items-center justify-center rounded-full transition-colors duration-300 ${
            agentMode === 'speaking' ? 'bg-primary' : 'bg-muted-foreground/20'
          }`}
        >
          <Mic
            className={`h-7 w-7 transition-colors duration-300 ${
              agentMode === 'speaking' ? 'text-primary-foreground' : 'text-muted-foreground'
            }`}
          />
        </div>
      </div>

      <p className="text-sm font-medium text-muted-foreground">
        {agentMode === 'speaking' ? 'Speaking...' : 'Listening...'}
      </p>

      <Button
        onClick={handleEndConversation}
        variant="outline"
        size="sm"
        className="text-destructive border-destructive/40 hover:bg-destructive/10"
      >
        <PhoneOff className="h-4 w-4 mr-1.5" />
        End Session
      </Button>

      {pendingDraft && (
        <div className="w-full rounded-lg border p-4 space-y-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{TYPE_LABELS[pendingDraft.entry.type]}</Badge>
            <button
              onClick={handleDiscardDraft}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Discard"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <LogTypeFields
            type={pendingDraft.entry.type}
            value={draftData}
            onChange={setDraftData}
          />

          <div className="space-y-1.5">
            <Label htmlFor="draft-notes">Notes (optional)</Label>
            <Textarea
              id="draft-notes"
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              placeholder="Any additional context..."
              className="resize-none"
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button onClick={handleSaveDraft} disabled={isSaving} size="sm" className="flex-1">
              <Check className="h-4 w-4 mr-1.5" />
              {isSaving ? 'Saving...' : 'Save Entry'}
            </Button>
            <Button onClick={handleDiscardDraft} variant="outline" size="sm">
              Discard
            </Button>
          </div>
        </div>
      )}

      {error && !pendingDraft && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  )
}
