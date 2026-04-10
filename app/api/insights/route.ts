import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeDashboardStats } from '@/lib/ai/computeStats'
import { generateNarrative } from '@/lib/ai/insightEngine'
import type { RecentEntriesContext } from '@/lib/types'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id

    const today = new Date().toISOString().split('T')[0]
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: insight } = await supabase
      .from('insights_cache')
      .select('*')
      .eq('user_id', userId)
      .eq('period_end', today)
      .gte('created_at', twentyFourHoursAgo)
      .single()

    let isStale = false
    if (insight) {
      const { data: newerEntries } = await supabase
        .from('log_entries')
        .select('id')
        .eq('user_id', userId)
        .gt('created_at', insight.created_at)
        .limit(1)
      isStale = (newerEntries?.length ?? 0) > 0
    }

    return NextResponse.json({ data: { insight: insight ?? null, isStale } })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id

    const today = new Date().toISOString().split('T')[0]

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
      recentMoods: (recentMoodEntries ?? []).map(e => ({
        score: Number(e.data?.score ?? 0),
        energy_level: Number(e.data?.energy_level ?? 0),
        logged_at: e.logged_at as string,
        emotions: Array.isArray(e.data?.emotions) ? (e.data.emotions as string[]) : [],
      })),
      recentWorkouts: (recentWorkoutEntries ?? []).map(e => ({
        activity: String(e.data?.activity ?? ''),
        duration_min: Number(e.data?.duration_min ?? 0),
        intensity: String(e.data?.intensity ?? 'moderate'),
        logged_at: e.logged_at as string,
      })),
    }

    const narrative = await generateNarrative(stats, recentEntries)
    const insightMode = process.env.ANTHROPIC_API_KEY ? 'llm' : 'mock'

    const { data: upserted, error } = await supabase
      .from('insights_cache')
      .upsert(
        {
          user_id: userId,
          period_end: today,
          stats_json: stats,
          narrative,
          audio_url: null,
          insight_mode: insightMode,
        },
        { onConflict: 'user_id,period_end' }
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: { insight: upserted, isStale: false } })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
