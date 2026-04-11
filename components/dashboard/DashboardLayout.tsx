'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TodayHabitChecklist } from '@/components/habits/TodayHabitChecklist'
import { RecentLogList } from '@/components/logging/RecentLogList'
import { InsightCard } from '@/components/insights/InsightCard'
import { BodyweightChart } from '@/components/charts/BodyweightChart'
import { MacroPieChart } from '@/components/charts/MacroPieChart'
import { DashboardCustomizer } from './DashboardCustomizer'
import { useDashboardPrefs } from '@/hooks/useDashboardPrefs'
import type { HabitWithLog, LogEntryRow, InsightCache, DashboardStats } from '@/lib/types'

interface DashboardLayoutProps {
  displayName: string
  habitsWithLog: HabitWithLog[]
  entries: LogEntryRow[]
  stats: DashboardStats
  cachedInsight: InsightCache | null
  isStale: boolean
  bwEntries: Array<{ data: Record<string, unknown>; logged_at: string }>
  mealEntries: Array<{ data: Record<string, unknown>; logged_at: string }>
  showSeedButton?: React.ReactNode
}

export function DashboardLayout({
  displayName,
  habitsWithLog,
  entries,
  stats,
  cachedInsight,
  isStale,
  bwEntries,
  mealEntries,
  showSeedButton,
}: DashboardLayoutProps) {
  const [prefs] = useDashboardPrefs()

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Welcome back, {displayName}</h2>
          <p className="text-muted-foreground mt-1">Here&apos;s your health overview</p>
        </div>
        <div className="flex items-center gap-2">
          {showSeedButton}
          <DashboardCustomizer />
        </div>
      </div>

      {prefs.showHabits && (
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
      )}

      {prefs.showRecentLogs && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Entries</CardTitle>
            <Link href="/log" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            <RecentLogList entries={entries} showDelete={false} />
          </CardContent>
        </Card>
      )}

      {prefs.showInsight && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Insight</CardTitle>
          </CardHeader>
          <CardContent>
            <InsightCard stats={stats} initialInsight={cachedInsight} isStale={isStale} />
          </CardContent>
        </Card>
      )}

      {prefs.showWeightChart && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Body Weight</CardTitle>
          </CardHeader>
          <CardContent>
            <BodyweightChart entries={bwEntries} />
          </CardContent>
        </Card>
      )}

      {prefs.showMacroChart && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Macronutrients</CardTitle>
          </CardHeader>
          <CardContent>
            <MacroPieChart entries={mealEntries} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
