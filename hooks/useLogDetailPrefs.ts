'use client'

import { useState } from 'react'
import type { LogEntryType } from '@/lib/types'

export type DetailLevel = 'compact' | 'detailed'
export type LogDetailPrefs = Record<LogEntryType, DetailLevel>

const STORAGE_KEY = 'log-detail-prefs'

const DEFAULTS: LogDetailPrefs = {
  meal: 'detailed',
  workout: 'detailed',
  bodyweight: 'detailed',
  mood: 'detailed',
  reflection: 'compact',
}

function readPrefs(): LogDetailPrefs {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function useLogDetailPrefs(): [LogDetailPrefs, (prefs: LogDetailPrefs) => void] {
  const [prefs, setPrefsState] = useState<LogDetailPrefs>(readPrefs)

  function setPrefs(next: LogDetailPrefs) {
    setPrefsState(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  return [prefs, setPrefs]
}
