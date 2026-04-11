'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Mic, MicOff, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LogTypeFields } from '@/components/logging/LogTypeFields'
import { InsightPlayer } from '@/components/voice/InsightPlayer'
import type { LogEntryType, ParsedLogEntry, VoiceQuestionResult } from '@/lib/types'

// ─── State machine ────────────────────────────────────────────────────────────

type RecorderState =
  | { status: 'idle' }
  | { status: 'recording' }
  | { status: 'processing' }
  | { status: 'result-log'; parsedEntry: ParsedLogEntry; transcript: string }
  | { status: 'result-question'; answer: VoiceQuestionResult }

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<LogEntryType, string> = {
  meal: 'Meal',
  workout: 'Workout',
  bodyweight: 'Bodyweight',
  mood: 'Mood',
  reflection: 'Reflection',
}

interface VoiceRecorderProps {
  onClose?: () => void
}

// ─── Auto-play hook ───────────────────────────────────────────────────────────

function useAutoPlay(audioUrl: string | null) {
  useEffect(() => {
    if (!audioUrl) return
    const audio = new Audio(audioUrl)
    audio.play().catch(() => {
      // Browser may block autoplay — play button remains as fallback
    })
    return () => { audio.pause() }
  }, [audioUrl])
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QuestionResultCard({
  answer,
  onDone,
}: {
  answer: VoiceQuestionResult
  onDone: () => void
}) {
  useAutoPlay(answer.audioUrl)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">Voice Answer</Badge>
        <button onClick={onDone} className="text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-sm leading-relaxed">{answer.text}</p>

      {answer.audioUrl && <InsightPlayer audioUrl={answer.audioUrl} />}

      <Button onClick={onDone} variant="outline" size="sm" className="w-full">
        Done
      </Button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VoiceRecorder({ onClose }: VoiceRecorderProps) {
  const router = useRouter()
  const [recorderState, setRecorderState] = useState<RecorderState>({ status: 'idle' })
  const [error, setError] = useState<string | null>(null)

  // Log-result editable fields
  const [editableData, setEditableData] = useState<Record<string, unknown>>({})
  const [notes, setNotes] = useState('')
  const [showTranscript, setShowTranscript] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleReset() {
    setRecorderState({ status: 'idle' })
    setError(null)
    setEditableData({})
    setNotes('')
    setShowTranscript(false)
    mediaRecorderRef.current = null
    chunksRef.current = []
  }

  async function handleStartRecording() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const audioBlob = new Blob(chunksRef.current, { type: mimeType })
        await processAudio(audioBlob)
      }

      recorder.start(250)
      setRecorderState({ status: 'recording' })

      autoStopTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      }, 60000)
    } catch {
      setError('Microphone access required')
    }
  }

  function handleStopRecording() {
    if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current)
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setRecorderState({ status: 'processing' })
  }

  async function processAudio(audioBlob: Blob) {
    setRecorderState({ status: 'processing' })
    setError(null)

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'audio.webm')

      const sttRes = await fetch('/api/voice/stt', { method: 'POST', body: formData })
      const sttJson = await sttRes.json() as {
        intent?: 'log' | 'question'
        parsedEntry?: ParsedLogEntry
        transcript?: string
        error?: string
      }

      if (!sttRes.ok) {
        setError(sttJson.error ?? 'Could not transcribe audio. Please try again.')
        setRecorderState({ status: 'idle' })
        return
      }

      if (sttJson.intent === 'question') {
        // Fetch answer from /api/voice/ask
        const askRes = await fetch('/api/voice/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: sttJson.transcript }),
        })
        const askJson = await askRes.json() as { data?: { text: string; audioUrl: string | null }; error?: string }

        if (!askRes.ok) {
          setError(askJson.error ?? 'Could not generate answer. Please try again.')
          setRecorderState({ status: 'idle' })
          return
        }

        setRecorderState({
          status: 'result-question',
          answer: {
            text: askJson.data!.text,
            audioUrl: askJson.data!.audioUrl,
            transcript: sttJson.transcript ?? '',
          },
        })
      } else {
        // Log intent — show confirmation card
        const entry = sttJson.parsedEntry!
        setEditableData(entry.data as Record<string, unknown>)
        setNotes(entry.notes ?? '')
        setRecorderState({
          status: 'result-log',
          parsedEntry: entry,
          transcript: sttJson.transcript ?? '',
        })
      }
    } catch {
      setError('Could not transcribe audio. Please try again.')
      setRecorderState({ status: 'idle' })
    }
  }

  async function handleSave() {
    if (recorderState.status !== 'result-log') return
    setIsSaving(true)

    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: recorderState.parsedEntry.type,
          data: editableData,
          notes: notes || undefined,
          voice_transcript: recorderState.transcript,
        }),
      })

      const json = await res.json() as { error?: string }
      if (!res.ok) {
        setError(json.error ?? 'Failed to save entry')
        return
      }

      toast('Entry saved')
      router.refresh()
      handleReset()
      onClose?.()
    } catch {
      setError('Failed to save entry. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (recorderState.status === 'idle') {
    return (
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={handleStartRecording}
          className="rounded-full border-2 border-primary p-3 hover:bg-primary/10 transition-colors"
          aria-label="Start recording"
        >
          <Mic className="h-5 w-5 text-primary" />
        </button>
        <p className="text-xs text-muted-foreground text-center">
          Say a log entry or ask a question about your data
        </p>
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
      </div>
    )
  }

  if (recorderState.status === 'recording') {
    return (
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={handleStopRecording}
          className="rounded-full bg-red-500 p-3 hover:bg-red-600 transition-colors animate-pulse"
          aria-label="Stop recording"
        >
          <MicOff className="h-5 w-5 text-white" />
        </button>
        <p className="text-sm text-muted-foreground">Recording... (tap to stop)</p>
      </div>
    )
  }

  if (recorderState.status === 'processing') {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-full border-2 border-muted p-3">
          <Mic className="h-5 w-5 text-muted-foreground animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground">Thinking...</p>
      </div>
    )
  }

  if (recorderState.status === 'result-question') {
    return (
      <QuestionResultCard
        answer={recorderState.answer}
        onDone={() => { handleReset(); onClose?.() }}
      />
    )
  }

  // result-log — confirmation card
  if (recorderState.status === 'result-log') {
    const { parsedEntry, transcript } = recorderState
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{TYPE_LABELS[parsedEntry.type]}</Badge>
          <button onClick={handleReset} className="text-muted-foreground hover:text-foreground" aria-label="Discard">
            <X className="h-4 w-4" />
          </button>
        </div>

        <LogTypeFields
          type={parsedEntry.type}
          value={editableData}
          onChange={setEditableData}
        />

        <div className="space-y-1.5">
          <Label htmlFor="voice-notes">Notes</Label>
          <Textarea
            id="voice-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional context..."
            className="resize-none"
            rows={2}
          />
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showTranscript ? 'Hide' : 'Show'} transcript
          </button>
          {showTranscript && (
            <p className="mt-1 text-xs text-muted-foreground italic">&ldquo;{transcript}&rdquo;</p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving} size="sm" className="flex-1">
            <Check className="h-4 w-4 mr-1.5" />
            {isSaving ? 'Saving...' : 'Save Entry'}
          </Button>
          <Button onClick={handleReset} variant="outline" size="sm">
            Discard
          </Button>
        </div>
      </div>
    )
  }

  return null
}
