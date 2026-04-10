import type { DashboardStats, RecentEntriesContext } from '@/lib/types'

export function buildInsightPrompt(
  stats: DashboardStats,
  recentEntries: RecentEntriesContext
): { system: string; user: string } {
  const system = `You are a personal wellness coach AI. Write 2-3 warm, specific paragraphs based on a user's 7-day health data. Reference patterns and correlations you observe. Give one actionable suggestion at the end. Speak directly to the user in second person. Stay under 250 words. Do not simply repeat raw numbers — interpret what they mean.`

  const moodStr =
    recentEntries.recentMoods.length > 0
      ? recentEntries.recentMoods
          .map(
            (m) =>
              `- Score: ${m.score}/10, Energy: ${m.energy_level}/10, Emotions: ${m.emotions.join(', ') || 'none listed'} (${new Date(m.logged_at).toLocaleDateString()})`
          )
          .join('\n')
      : 'No mood entries this week.'

  const workoutStr =
    recentEntries.recentWorkouts.length > 0
      ? recentEntries.recentWorkouts
          .map(
            (w) =>
              `- ${w.activity}, ${w.duration_min} min, ${w.intensity} intensity (${new Date(w.logged_at).toLocaleDateString()})`
          )
          .join('\n')
      : 'No workout entries this week.'

  const eventsStr =
    stats.upcomingEvents.length > 0
      ? stats.upcomingEvents
          .map(
            (e) =>
              `- ${e.title}${e.location ? ` at ${e.location}` : ''} (${new Date(e.start_at).toLocaleDateString()})`
          )
          .join('\n')
      : 'No upcoming calendar events.'

  const user = `Here is my 7-day health summary:

STATS:
- Meals logged: ${stats.logCounts.meal}
- Workouts: ${stats.workout.count} (${stats.workout.totalMinutes} total minutes)
- Avg mood: ${stats.mood.avg !== null ? stats.mood.avg.toFixed(1) + '/10' : 'no data'}
- Avg energy: ${stats.mood.energyAvg !== null ? stats.mood.energyAvg.toFixed(1) + '/10' : 'no data'}
- Calories logged: ${stats.calories.totalLogged}
- Avg daily protein: ${stats.calories.avgProteinPerDay !== null ? stats.calories.avgProteinPerDay.toFixed(1) + 'g' : 'no data'}
- Bodyweight delta: ${stats.bodyweight.delta !== null ? (stats.bodyweight.delta > 0 ? '+' : '') + stats.bodyweight.delta.toFixed(1) + 'kg' : 'no data'}
- Reflections: ${stats.reflectionCount}
- Active habits: ${stats.habits.length}

RECENT MOOD ENTRIES:
${moodStr}

RECENT WORKOUTS:
${workoutStr}

UPCOMING EVENTS:
${eventsStr}`

  return { system, user }
}
