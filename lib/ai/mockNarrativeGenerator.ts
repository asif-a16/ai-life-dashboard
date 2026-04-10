import type { DashboardStats } from '@/lib/types'

export function mockGenerateNarrative(stats: DashboardStats): string {
  const parts: string[] = []

  // Opening sentence
  const meals = stats.logCounts.meal
  const workouts = stats.workout.count
  const minutes = stats.workout.totalMinutes
  parts.push(
    `This week you logged ${meals} meal${meals !== 1 ? 's' : ''} and completed ${workouts} workout${workouts !== 1 ? 's' : ''} totalling ${minutes} minutes of exercise.`
  )

  // Mood sentence
  if (stats.mood.avg !== null) {
    const avg = Math.round(stats.mood.avg * 10) / 10
    if (avg >= 7) {
      parts.push(`Your mood averaged a strong ${avg}/10 — you had a solid week mentally.`)
    } else if (avg >= 5) {
      parts.push(`Mood was steady at ${avg}/10, keeping a consistent baseline.`)
    } else {
      parts.push(`It was a tough week emotionally, with mood averaging ${avg}/10.`)
    }
  }

  // Habit sentence — top habit by completedThisWeek
  if (stats.habits.length > 0) {
    const topHabit = stats.habits.reduce((best, h) =>
      h.completedThisWeek > best.completedThisWeek ? h : best
    )
    if (topHabit.completedThisWeek > 0) {
      parts.push(
        `Your most consistent habit was "${topHabit.name}" with a ${topHabit.currentStreak}-day streak.`
      )
    }
  }

  // Weight sentence
  if (stats.bodyweight.delta !== null) {
    const delta = Math.abs(Math.round(stats.bodyweight.delta * 10) / 10)
    if (stats.bodyweight.delta < 0) {
      parts.push(`You're trending down ${delta}kg this week.`)
    } else if (stats.bodyweight.delta > 0) {
      parts.push(`Bodyweight was up ${delta}kg this week.`)
    }
  }

  // Suggestion — deterministic rotation by day of year
  const suggestions = [
    'Try to add one more workout next week.',
    'Consider logging your mood daily for better trend visibility.',
    'Consistency beats intensity — keep showing up.',
    'A quick reflection before bed can improve next week\'s insights.',
    'Track your protein for a few days to see if it aligns with your goals.',
  ]
  const dayIndex = Math.floor(Date.now() / 86400000) % 5
  parts.push(suggestions[dayIndex])

  return parts.join(' ')
}
