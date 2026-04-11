'use client'

import { useState } from 'react'
import { Settings2, X } from 'lucide-react'
import { useDashboardPrefs } from '@/hooks/useDashboardPrefs'
import { useLogDetailPrefs } from '@/hooks/useLogDetailPrefs'
import type { DashboardPrefs } from '@/hooks/useDashboardPrefs'
import type { LogEntryType } from '@/lib/types'

const WIDGET_OPTIONS: Array<{ key: keyof DashboardPrefs; label: string }> = [
  { key: 'showHabits', label: "Today's Habits" },
  { key: 'showRecentLogs', label: 'Recent Entries' },
  { key: 'showInsight', label: 'Weekly Insight' },
  { key: 'showWeightChart', label: 'Body Weight Chart' },
  { key: 'showMacroChart', label: 'Macronutrient Chart' },
]

const DETAIL_TYPES: Array<{ type: LogEntryType; label: string }> = [
  { type: 'meal', label: 'Meals' },
  { type: 'workout', label: 'Workouts' },
  { type: 'bodyweight', label: 'Weight' },
  { type: 'mood', label: 'Mood' },
  { type: 'reflection', label: 'Reflections' },
]

export function DashboardCustomizer() {
  const [open, setOpen] = useState(false)
  const [prefs, setPrefs] = useDashboardPrefs()
  const [detailPrefs, setDetailPrefs] = useLogDetailPrefs()

  function toggleWidget(key: keyof DashboardPrefs) {
    setPrefs({ ...prefs, [key]: !prefs[key] })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Customize dashboard"
      >
        <Settings2 className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-72 bg-background border-l shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-sm">Customize Dashboard</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Sections</p>
                {WIDGET_OPTIONS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 py-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs[key]}
                      onChange={() => toggleWidget(key)}
                      className="h-4 w-4 rounded border-muted accent-primary"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Entry Detail Level</p>
                {DETAIL_TYPES.map(({ type, label }) => (
                  <div key={type} className="flex items-center justify-between py-1.5">
                    <span className="text-sm">{label}</span>
                    <div className="flex rounded-md border overflow-hidden text-xs">
                      {(['compact', 'detailed'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => setDetailPrefs({ ...detailPrefs, [type]: level })}
                          className={`px-2.5 py-1 capitalize transition-colors ${
                            detailPrefs[type] === level
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
