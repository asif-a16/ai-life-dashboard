import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  queryMoodSummary,
  queryWeightTrend,
  queryWorkoutConsistency,
  queryHabitsSummary,
  queryRecentMeals,
  queryAllSummary,
} from '@/lib/assistant/tools'

const READ_TOOLS = new Set([
  'query_mood_summary',
  'query_weight_trend',
  'query_workout_consistency',
  'query_habits_summary',
  'query_recent_meals',
  'query_all_summary',
])

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as { toolName: string; parameters: Record<string, unknown> }
    const { toolName } = body

    if (!READ_TOOLS.has(toolName)) {
      return NextResponse.json({ error: `Unknown tool: ${toolName}` }, { status: 400 })
    }

    const userId = session.user.id
    let result: Record<string, unknown>

    switch (toolName) {
      case 'query_mood_summary':
        result = await queryMoodSummary(userId, supabase)
        break
      case 'query_weight_trend':
        result = await queryWeightTrend(userId, supabase)
        break
      case 'query_workout_consistency':
        result = await queryWorkoutConsistency(userId, supabase)
        break
      case 'query_habits_summary':
        result = await queryHabitsSummary(userId, supabase)
        break
      case 'query_recent_meals':
        result = await queryRecentMeals(userId, supabase)
        break
      case 'query_all_summary':
        result = await queryAllSummary(userId, supabase)
        break
      default:
        return NextResponse.json({ error: `Unknown tool: ${toolName}` }, { status: 400 })
    }

    return NextResponse.json({ data: { result } })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
