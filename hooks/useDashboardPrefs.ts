'use client'

import { useState } from 'react'

export type WidgetKey = 'habits' | 'recentLogs' | 'insight' | 'weightChart' | 'macroChart'

export interface DashboardPrefs {
  showHabits: boolean
  showRecentLogs: boolean
  showInsight: boolean
  showWeightChart: boolean
  showMacroChart: boolean
  widgetOrder: WidgetKey[]
}

const STORAGE_KEY = 'dashboard-prefs'

const DEFAULT_ORDER: WidgetKey[] = ['macroChart', 'weightChart', 'recentLogs', 'habits', 'insight']

const DEFAULTS: DashboardPrefs = {
  showHabits: true,
  showRecentLogs: true,
  showInsight: false,
  showWeightChart: true,
  showMacroChart: true,
  widgetOrder: DEFAULT_ORDER,
}

function readPrefs(): DashboardPrefs {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULTS
    const parsed = JSON.parse(stored)
    return {
      ...DEFAULTS,
      ...parsed,
      widgetOrder: Array.isArray(parsed.widgetOrder) ? parsed.widgetOrder : DEFAULT_ORDER,
    }
  } catch {
    return DEFAULTS
  }
}

export function useDashboardPrefs(): [DashboardPrefs, (prefs: DashboardPrefs) => void] {
  const [prefs, setPrefsState] = useState<DashboardPrefs>(readPrefs)

  function setPrefs(next: DashboardPrefs) {
    setPrefsState(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  return [prefs, setPrefs]
}
