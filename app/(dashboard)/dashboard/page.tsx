import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TopNav } from '@/components/layout/TopNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TodayHabitChecklist } from '@/components/habits/TodayHabitChecklist'
import { RecentLogList } from '@/components/logging/RecentLogList'
import { InsightCard } from '@/components/insights/InsightCard'
import { SeedButton } from '@/components/dashboard/SeedButton'
import { computeDashboardStats } from '@/lib/ai/computeStats'
import type { Habit, HabitLog, HabitWithLog, InsightCache, LogEntryRow } from '@/lib/types'

function computeStreak(habitId: string, logs: HabitLog[]): number {
  const habitLogs = logs
    .filter((l) => l.habit_id === habitId)
    .map((l) => l.completed_on)
    .sort()
    .reverse()

  if (habitLogs.length === 0) return 0

  const streak = { count: 0 }
  const cursor = new Date()

  for (const dateStr of habitLogs) {
    const cursorStr = cursor.toISOString().split('T')[0]
    if (dateStr === cursorStr) {
      streak.count++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }

  return streak.count
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
  ])

  // Check if insight is stale (new entries added after last generation)
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

  return (
    <>
      <TopNav title="Dashboard" />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Welcome back, {displayName}</h2>
            <p className="text-muted-foreground mt-1">Here&apos;s your health overview</p>
          </div>
          {(process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NODE_ENV === 'development') && (
            <SeedButton />
          )}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Today&apos;s Habits</CardTitle>
            <Link href="/habits" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Manage habits →
            </Link>
          </CardHeader>
          <CardContent>
            <TodayHabitChecklist habits={habitsWithLog} showAddForm={false} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Entries</CardTitle>
            <Link href="/log" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            <RecentLogList entries={(entries ?? []) as LogEntryRow[]} showDelete={false} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Insight</CardTitle>
          </CardHeader>
          <CardContent>
            <InsightCard
              stats={stats}
              initialInsight={cachedInsight as InsightCache | null}
              isStale={isStale}
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
