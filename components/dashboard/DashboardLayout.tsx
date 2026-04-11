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
import { useLogDetailPrefs } from '@/hooks/useLogDetailPrefs'
import type { WidgetKey } from '@/hooks/useDashboardPrefs'
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
  const [prefs, setPrefs] = useDashboardPrefs()
  const [detailPrefs, setDetailPrefs] = useLogDetailPrefs()

  function renderWidget(key: WidgetKey) {
    switch (key) {
      case 'habits':
        if (!prefs.showHabits) return null
        return (
          <Card key="habits" className="hover:shadow-card-hover transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Today&apos;s Habits</CardTitle>
              <Link href="/habits" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Manage habits →
              </Link>
            </CardHeader>
            <CardContent>
              <TodayHabitChecklist habits={habitsWithLog} showAddForm={false} />
            </CardContent>
          </Card>
        )
      case 'recentLogs':
        if (!prefs.showRecentLogs) return null
        return (
          <Card key="recentLogs" className="hover:shadow-card-hover transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Recent Entries</CardTitle>
              <Link href="/log" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                View all →
              </Link>
            </CardHeader>
            <CardContent>
              <RecentLogList entries={entries} showDelete={false} />
            </CardContent>
          </Card>
        )
      case 'insight':
        if (!prefs.showInsight) return null
        return (
          <Card key="insight" className="hover:shadow-card-hover transition-shadow duration-200">
            <CardHeader>
              <CardTitle>Weekly Insight</CardTitle>
            </CardHeader>
            <CardContent>
              <InsightCard stats={stats} initialInsight={cachedInsight} isStale={isStale} />
            </CardContent>
          </Card>
        )
      case 'weightChart':
        if (!prefs.showWeightChart) return null
        return (
          <Card key="weightChart" className="hover:shadow-card-hover transition-shadow duration-200">
            <CardHeader>
              <CardTitle>Body Weight</CardTitle>
            </CardHeader>
            <CardContent>
              <BodyweightChart entries={bwEntries} />
            </CardContent>
          </Card>
        )
      case 'macroChart':
        if (!prefs.showMacroChart) return null
        return (
          <Card key="macroChart" className="hover:shadow-card-hover transition-shadow duration-200">
            <CardHeader>
              <CardTitle>Macronutrients</CardTitle>
            </CardHeader>
            <CardContent>
              <MacroPieChart entries={mealEntries} />
            </CardContent>
          </Card>
        )
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Welcome back, {displayName}</h2>
          <p className="text-sm text-muted-foreground mt-1">Here&apos;s your health overview</p>
        </div>
        <div className="flex items-center gap-2">
          {showSeedButton}
          <DashboardCustomizer
            prefs={prefs}
            setPrefs={setPrefs}
            detailPrefs={detailPrefs}
            setDetailPrefs={setDetailPrefs}
          />
        </div>
      </div>

      {prefs.widgetOrder.map((key) => renderWidget(key))}
    </div>
  )
}
