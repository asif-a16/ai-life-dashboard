'use client'

import { useState } from 'react'

export interface DashboardPrefs {
  showHabits: boolean
  showRecentLogs: boolean
  showInsight: boolean
  showWeightChart: boolean
  showMacroChart: boolean
}

const STORAGE_KEY = 'dashboard-prefs'

const DEFAULTS: DashboardPrefs = {
  showHabits: true,
  showRecentLogs: true,
  showInsight: true,
  showWeightChart: true,
  showMacroChart: true,
}

function readPrefs(): DashboardPrefs {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS
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
