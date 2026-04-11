import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { transcribeAudio } from '@/lib/voice/elevenLabsSTT'
import { parseTranscript } from '@/lib/voice/transcriptParser'
import { classifyIntent } from '@/lib/voice/intentClassifier'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const audioFile = formData.get('audio')

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    const transcript = await transcribeAudio(audioFile)
    const intent = await classifyIntent(transcript)

    if (intent === 'question') {
      return NextResponse.json({ intent, transcript })
    }

    // Log intent — parse and return structured entry for confirmation
    const parsedEntry = await parseTranscript(transcript)
    return NextResponse.json({ intent, parsedEntry, transcript })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
