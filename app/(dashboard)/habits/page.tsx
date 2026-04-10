import { createClient } from '@/lib/supabase/server'
import { TopNav } from '@/components/layout/TopNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TodayHabitChecklist } from '@/components/habits/TodayHabitChecklist'
import type { Habit, HabitLog, HabitWithLog } from '@/lib/types'

function computeStreak(habitId: string, logs: HabitLog[]): number {
  const habitLogs = logs
    .filter((l) => l.habit_id === habitId)
    .map((l) => l.completed_on)
    .sort()
    .reverse()

  if (habitLogs.length === 0) return 0

  const today = new Date()
  let streak = 0
  const cursor = new Date(today)

  for (const dateStr of habitLogs) {
    const cursorStr = cursor.toISOString().split('T')[0]
    if (dateStr === cursorStr) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}

function countThisWeek(habitId: string, logs: HabitLog[]): number {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const cutoff = sevenDaysAgo.toISOString().split('T')[0]
  return logs.filter((l) => l.habit_id === habitId && l.completed_on >= cutoff).length
}

export default async function HabitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const cutoff = sevenDaysAgo.toISOString().split('T')[0]

  const [{ data: habits }, { data: logs }, { data: todayLogs }] = await Promise.all([
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
  ])

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
      <TopNav title="Habits" />
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Habits</CardTitle>
          </CardHeader>
          <CardContent>
            <TodayHabitChecklist habits={habitsWithLog} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
