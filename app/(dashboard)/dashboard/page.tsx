import { createClient } from '@/lib/supabase/server'
import { TopNav } from '@/components/layout/TopNav'
import { SeedButton } from '@/components/dashboard/SeedButton'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { computeDashboardStats } from '@/lib/ai/computeStats'
import type { Habit, HabitLog, HabitWithLog, InsightCache, LogEntryRow } from '@/lib/types'

function computeStreak(habitId: string, logs: HabitLog[]): number {
  const habitLogs = logs
    .filter((l) => l.habit_id === habitId)
    .map((l) => l.completed_on)
    .sort()
    .reverse()

  if (habitLogs.length === 0) return 0

  let count = 0
  const cursor = new Date()
  for (const dateStr of habitLogs) {
    const cursorStr = cursor.toISOString().split('T')[0]
    if (dateStr === cursorStr) {
      count++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return count
}

function countThisWeek(habitId: string, logs: HabitLog[]): number {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const cutoff = sevenDaysAgo.toISOString().split('T')[0]
  return logs.filter((l) => l.habit_id === habitId && l.completed_on >= cutoff).length
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const cutoff = sevenDaysAgo.toISOString().split('T')[0]
  const twentyFourHoursAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: profile },
    { data: entries },
    { data: habits },
    { data: logs },
    { data: todayLogs },
    stats,
    { data: cachedInsight },
    { data: bwEntries },
    { data: mealEntries },
  ] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user!.id).single(),
    supabase
      .from('log_entries')
      .select('*')
      .eq('user_id', user!.id)
      .order('logged_at', { ascending: false })
      .limit(5),
    supabase
      .from('habits')
      .select('*')
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', user!.id)
      .gte('completed_on', cutoff)
      .order('completed_on', { ascending: false }),
    supabase
      .from('habit_logs')
      .select('habit_id')
      .eq('user_id', user!.id)
      .eq('completed_on', today),
    computeDashboardStats(user!.id, supabase),
    supabase
      .from('insights_cache')
      .select('*')
      .eq('user_id', user!.id)
      .eq('period_end', today)
      .gte('created_at', twentyFourHoursAgo)
      .single(),
    supabase
      .from('log_entries')
      .select('data, logged_at')
      .eq('user_id', user!.id)
      .eq('type', 'bodyweight')
      .order('logged_at', { ascending: true }),
    supabase
      .from('log_entries')
      .select('data, logged_at')
      .eq('user_id', user!.id)
      .eq('type', 'meal')
      .order('logged_at', { ascending: false }),
  ])

  let isStale = false
  if (cachedInsight) {
    const { data: newerEntries } = await supabase
      .from('log_entries')
      .select('id')
      .eq('user_id', user!.id)
      .gt('created_at', cachedInsight.created_at)
      .limit(1)
    isStale = (newerEntries?.length ?? 0) > 0
  }

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'there'
  const completedTodayIds = new Set((todayLogs ?? []).map((l: { habit_id: string }) => l.habit_id))
  const allLogs = (logs ?? []) as HabitLog[]

  const habitsWithLog: HabitWithLog[] = (habits ?? []).map((h: Habit) => ({
    ...h,
    completedToday: completedTodayIds.has(h.id),
    currentStreak: computeStreak(h.id, allLogs),
    completedThisWeek: countThisWeek(h.id, allLogs),
  }))

  const showSeedButton =
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NODE_ENV === 'development'
      ? <SeedButton />
      : undefined

  return (
    <>
      <TopNav title="Dashboard" />
      <DashboardLayout
        displayName={displayName}
        habitsWithLog={habitsWithLog}
        entries={(entries ?? []) as LogEntryRow[]}
        stats={stats}
        cachedInsight={cachedInsight as InsightCache | null}
        isStale={isStale}
        bwEntries={bwEntries ?? []}
        mealEntries={mealEntries ?? []}
        showSeedButton={showSeedButton}
      />
    </>
  )
}
