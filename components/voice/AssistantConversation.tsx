'use client'

import { useState, useRef } from 'react'
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
import type { AssistantMessage, AssistantDraft, LogEntryType } from '@/lib/types'

type AnyConversation = VoiceConversation | TextConversation

const TYPE_LABELS: Record<LogEntryType, string> = {
  meal: 'Meal',
  workout: 'Workout',
  bodyweight: 'Bodyweight',
  mood: 'Mood',
  reflection: 'Reflection',
}

export function AssistantConversation() {
  const router = useRouter()
  const [connStatus, setConnStatus] = useState<Status>('disconnected')
  const [agentMode, setAgentMode] = useState<Mode | null>(null)
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [pendingDraft, setPendingDraft] = useState<AssistantDraft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [draftData, setDraftData] = useState<Record<string, unknown>>({})
  const [draftNotes, setDraftNotes] = useState('')

  const conversationRef = useRef<AnyConversation | null>(null)

  function addMessage(role: 'user' | 'agent', text: string) {
    setMessages(prev => [...prev, { source: role, text }])
  }

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
          if (status === 'disconnected') {
            setAgentMode(null)
            conversationRef.current = null
          }
        },
        onError: (message) => {
          setError(typeof message === 'string' ? message : 'Connection error')
        },
        onMessage: ({ message, role }) => {
          if (message.trim()) addMessage(role, message)
        },
        onModeChange: ({ mode }) => setAgentMode(mode),
        clientTools: {
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

  // ─── Render ───────────────────────────────────────────────────────────────

  if (connStatus === 'disconnected') {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <p className="text-sm text-muted-foreground text-center">
          Chat with your health assistant. Ask questions or log entries by voice.
        </p>
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
        <Button onClick={handleStartConversation} className="w-full">
          <Mic className="h-4 w-4 mr-2" />
          Start Conversation
        </Button>
      </div>
    )
  }

  if (connStatus === 'connecting') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Connecting...</p>
      </div>
    )
  }

  if (connStatus === 'disconnecting') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Ending session...</p>
      </div>
    )
  }

  // connected
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant={agentMode === 'speaking' ? 'default' : 'secondary'}>
          {agentMode === 'speaking' ? 'Speaking' : 'Listening'}
        </Badge>
        <Button
          onClick={handleEndConversation}
          variant="outline"
          size="sm"
          className="text-destructive border-destructive/40 hover:bg-destructive/10"
        >
          <PhoneOff className="h-4 w-4 mr-1.5" />
          End
        </Button>
      </div>

      {messages.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border p-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`text-sm ${msg.source === 'agent' ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              <span className="text-xs font-medium uppercase tracking-wide mr-2">
                {msg.source === 'agent' ? 'Assistant' : 'You'}
              </span>
              {msg.text}
            </div>
          ))}
        </div>
      )}

      {pendingDraft && (
        <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
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
