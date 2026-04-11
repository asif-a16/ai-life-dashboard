import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { computeDashboardStats } from '@/lib/ai/computeStats'
import { generateNarrative } from '@/lib/ai/insightEngine'
import { synthesizeWithElevenLabs } from '@/lib/voice/elevenLabsTTS'
import type { RecentEntriesContext } from '@/lib/types'
import { z } from 'zod'

const BodySchema = z.object({ transcript: z.string().min(1) })

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id

    const body = await request.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Missing transcript' }, { status: 400 })

    const [stats, { data: recentMoodEntries }, { data: recentWorkoutEntries }] = await Promise.all([
      computeDashboardStats(userId, supabase),
      supabase
        .from('log_entries')
        .select('data, logged_at')
        .eq('user_id', userId)
        .eq('type', 'mood')
        .order('logged_at', { ascending: false })
        .limit(5),
      supabase
        .from('log_entries')
        .select('data, logged_at')
        .eq('user_id', userId)
        .eq('type', 'workout')
        .order('logged_at', { ascending: false })
        .limit(3),
    ])

    const recentEntries: RecentEntriesContext = {
      recentMoods: (recentMoodEntries ?? []).map((e) => ({
        score: Number(e.data?.score ?? 0),
        energy_level: Number(e.data?.energy_level ?? 0),
        logged_at: e.logged_at as string,
        emotions: Array.isArray(e.data?.emotions) ? (e.data.emotions as string[]) : [],
      })),
      recentWorkouts: (recentWorkoutEntries ?? []).map((e) => ({
        activity: String(e.data?.activity ?? ''),
        duration_min: Number(e.data?.duration_min ?? 0),
        intensity: String(e.data?.intensity ?? 'moderate'),
        logged_at: e.logged_at as string,
      })),
    }

    const text = await generateNarrative(stats, recentEntries)

    // TTS + upload are best-effort — never fail the whole request
    let audioUrl: string | null = null
    try {
      const audioBuffer = await synthesizeWithElevenLabs(text)
      const storagePath = `${userId}/ask-${Date.now()}.mp3`
      const serviceClient = createServiceClient()
      const { error: uploadError } = await serviceClient.storage
        .from('insight-audio')
        .upload(storagePath, audioBuffer, { contentType: 'audio/mpeg', upsert: true })

      if (uploadError) {
        console.error('[ask] Audio upload failed:', uploadError.message)
      } else {
        const { data: { publicUrl } } = serviceClient.storage
          .from('insight-audio')
          .getPublicUrl(storagePath)
        audioUrl = publicUrl
      }
    } catch (audioErr) {
      console.error('[ask] TTS/audio error (non-fatal):', audioErr instanceof Error ? audioErr.message : audioErr)
    }

    return NextResponse.json({ data: { text, audioUrl } })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
