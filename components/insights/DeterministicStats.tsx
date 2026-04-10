import type { DashboardStats } from '@/lib/types'

interface DeterministicStatsProps {
  stats: DashboardStats
}

export function DeterministicStats({ stats }: DeterministicStatsProps) {
  const chips = [
    { label: 'Meals', value: String(stats.logCounts.meal) },
    {
      label: 'Workouts',
      value: `${stats.workout.count} (${stats.workout.totalMinutes} min)`,
    },
    {
      label: 'Avg Mood',
      value: stats.mood.avg !== null
        ? `${Math.round(stats.mood.avg * 10) / 10}/10`
        : '—',
    },
    { label: 'Active Habits', value: String(stats.habits.length) },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(chip => (
        <div
          key={chip.label}
          className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm"
        >
          <span className="text-muted-foreground">{chip.label}</span>
          <span className="font-medium">{chip.value}</span>
        </div>
      ))}
    </div>
  )
}
