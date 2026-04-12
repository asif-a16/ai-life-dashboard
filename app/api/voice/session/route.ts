import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const agentId = process.env.ELEVENLABS_AGENT_ID
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!agentId || !apiKey) {
      return NextResponse.json({ error: 'Voice assistant not configured' }, { status: 503 })
    }

    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      { headers: { 'xi-api-key': apiKey } }
    )

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `ElevenLabs error: ${text}` }, { status: 502 })
    }

    const { signed_url } = await res.json() as { signed_url: string }
    return NextResponse.json({ data: { signedUrl: signed_url } })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
