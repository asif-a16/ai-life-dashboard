'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Mic, MicOff, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LogTypeFields } from '@/components/logging/LogTypeFields'
import type { LogEntryType, ParsedLogEntry } from '@/lib/types'

type RecorderState = 'idle' | 'recording' | 'processing' | 'result'

interface VoiceRecorderProps {
  onClose?: () => void
}

const TYPE_LABELS: Record<LogEntryType, string> = {
  meal: 'Meal',
  workout: 'Workout',
  bodyweight: 'Bodyweight',
  mood: 'Mood',
  reflection: 'Reflection',
}

export function VoiceRecorder({ onClose }: VoiceRecorderProps) {
  const router = useRouter()
  const [state, setState] = useState<RecorderState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [parsedEntry, setParsedEntry] = useState<ParsedLogEntry | null>(null)
  const [transcript, setTranscript] = useState<string>('')
  const [editableData, setEditableData] = useState<Record<string, unknown>>({})
  const [notes, setNotes] = useState('')
  const [showTranscript, setShowTranscript] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      setState('recording')

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
    setState('processing')
  }

  async function processAudio(audioBlob: Blob) {
    setState('processing')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'audio.webm')

      const res = await fetch('/api/voice/stt', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json() as { parsedEntry?: ParsedLogEntry; transcript?: string; error?: string }

      if (!res.ok) {
        setError(json.error ?? 'Could not transcribe audio. Please try again.')
        setState('idle')
        return
      }

      setParsedEntry(json.parsedEntry!)
      setTranscript(json.transcript ?? '')
      setEditableData(json.parsedEntry!.data as Record<string, unknown>)
      setNotes(json.parsedEntry!.notes ?? '')
      setState('result')
    } catch {
      setError('Could not transcribe audio. Please try again.')
      setState('idle')
    }
  }

  async function handleSave() {
    if (!parsedEntry) return
    setIsSaving(true)

    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: parsedEntry.type,
          data: editableData,
          notes: notes || undefined,
          voice_transcript: transcript,
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

  function handleReset() {
    setState('idle')
    setError(null)
    setParsedEntry(null)
    setTranscript('')
    setEditableData({})
    setNotes('')
    setShowTranscript(false)
    mediaRecorderRef.current = null
    chunksRef.current = []
  }

  if (state === 'idle') {
    return (
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={handleStartRecording}
          className="rounded-full border-2 border-primary p-3 hover:bg-primary/10 transition-colors"
          aria-label="Start recording"
        >
          <Mic className="h-5 w-5 text-primary" />
        </button>
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
      </div>
    )
  }

  if (state === 'recording') {
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

  if (state === 'processing') {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-full border-2 border-muted p-3">
          <Mic className="h-5 w-5 text-muted-foreground animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground">Processing...</p>
      </div>
    )
  }

  // result state — confirmation card
  if (state === 'result' && parsedEntry) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{TYPE_LABELS[parsedEntry.type]}</Badge>
          <button
            onClick={handleReset}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Discard"
          >
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
