import type { SupabaseClient } from '@supabase/supabase-js'
import type { DashboardStats, LogEntryType } from '@/lib/types'

export async function computeDashboardStats(
  userId: string,
  supabase: SupabaseClient
): Promise<DashboardStats> {
  const now = new Date()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const cutoff = sevenDaysAgo.toISOString().split('T')[0]

  const [
    { data: entries },
    { data: habits },
    { data: habitLogs },
    { data: upcomingEvents },
  ] = await Promise.all([
    supabase
      .from('log_entries')
      .select('type, data, logged_at')
      .eq('user_id', userId)
      .gte('logged_at', sevenDaysAgo.toISOString())
      .order('logged_at', { ascending: true }),
    supabase
      .from('habits')
      .select('id, name, color')
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase
      .from('habit_logs')
      .select('habit_id, completed_on')
      .eq('user_id', userId)
      .gte('completed_on', cutoff)
      .order('completed_on', { ascending: false }),
    supabase
      .from('calendar_events')
      .select('title, start_at, location')
      .eq('user_id', userId)
      .gt('start_at', now.toISOString())
      .order('start_at', { ascending: true })
      .limit(3),
  ])

  type RawEntry = { type: string; data: Record<string, unknown>; logged_at: string }
  type RawHabit = { id: string; name: string; color: string }
  type RawHabitLog = { habit_id: string; completed_on: string }

  const allEntries = (entries ?? []) as RawEntry[]
  const allHabits = (habits ?? []) as RawHabit[]
  const allHabitLogs = (habitLogs ?? []) as RawHabitLog[]

  // Log counts per type
  const logCounts: Record<LogEntryType, number> = {
    meal: 0, workout: 0, bodyweight: 0, mood: 0, reflection: 0,
  }
  for (const entry of allEntries) {
    const type = entry.type as LogEntryType
    if (type in logCounts) logCounts[type]++
  }

  // Mood stats
  const moodEntries = allEntries.filter(e => e.type === 'mood')
  const moodAvg = moodEntries.length > 0
    ? moodEntries.reduce((sum, e) => sum + Number(e.data?.score ?? 0), 0) / moodEntries.length
    : null
  const energyAvg = moodEntries.length > 0
    ? moodEntries.reduce((sum, e) => sum + Number(e.data?.energy_level ?? 0), 0) / moodEntries.length
    : null

  // Workout stats
  const workoutEntries = allEntries.filter(e => e.type === 'workout')
  const workoutTotalMinutes = workoutEntries.reduce(
    (sum, e) => sum + Number(e.data?.duration_min ?? 0), 0
  )

  // Bodyweight stats (entries sorted chronologically)
  const bwEntries = allEntries.filter(e => e.type === 'bodyweight')
  const bwFirst = bwEntries.length > 0 ? Number(bwEntries[0].data?.weight_kg) : null
  const bwLast = bwEntries.length > 0 ? Number(bwEntries[bwEntries.length - 1].data?.weight_kg) : null
  const bwDelta = bwFirst !== null && bwLast !== null && bwEntries.length > 1 ? bwLast - bwFirst : null

  // Calories and protein
  const mealEntries = allEntries.filter(e => e.type === 'meal')
  const totalCalories = mealEntries.reduce(
    (sum, e) => sum + Number(e.data?.calories ?? 0), 0
  )
  const totalProtein = mealEntries.reduce(
    (sum, e) => sum + Number(e.data?.protein_g ?? 0), 0
  )
  const hasProteinData = mealEntries.some(e => e.data?.protein_g != null)
  const avgProteinPerDay = hasProteinData ? totalProtein / 7 : null

  // Habit stats with streak computation
  const habitStats = allHabits.map(habit => {
    const thisHabitLogs = allHabitLogs
      .filter(l => l.habit_id === habit.id)
      .map(l => l.completed_on)
      .sort()
      .reverse()

    const completedThisWeek = thisHabitLogs.filter(d => d >= cutoff).length

    let streak = 0
    const cursor = new Date(now)
    for (const dateStr of thisHabitLogs) {
      const cursorStr = cursor.toISOString().split('T')[0]
      if (dateStr === cursorStr) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
      } else {
        break
      }
    }

    return { id: habit.id, name: habit.name, color: habit.color, completedThisWeek, currentStreak: streak }
  })

  return {
    periodDays: 7,
    logCounts,
    mood: { avg: moodAvg, energyAvg },
    workout: { count: workoutEntries.length, totalMinutes: workoutTotalMinutes },
    bodyweight: { first: bwFirst, last: bwLast, delta: bwDelta },
    calories: { totalLogged: totalCalories, avgProteinPerDay },
    habits: habitStats,
    reflectionCount: logCounts.reflection,
    upcomingEvents: (upcomingEvents ?? []).map(e => ({
      title: e.title as string,
      start_at: e.start_at as string,
      location: e.location as string | null,
    })),
  }
}
