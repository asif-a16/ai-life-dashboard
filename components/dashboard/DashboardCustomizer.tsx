'use client'

import { useState, useRef } from 'react'
import { Settings2, X, GripVertical } from 'lucide-react'
import type { DashboardPrefs, WidgetKey } from '@/hooks/useDashboardPrefs'
import type { LogDetailPrefs } from '@/hooks/useLogDetailPrefs'
import type { LogEntryType } from '@/lib/types'

const WIDGET_CONFIG: Record<WidgetKey, { prefKey: keyof DashboardPrefs; label: string }> = {
  habits: { prefKey: 'showHabits', label: "Today's Habits" },
  recentLogs: { prefKey: 'showRecentLogs', label: 'Recent Entries' },
  insight: { prefKey: 'showInsight', label: 'Weekly Insight' },
  weightChart: { prefKey: 'showWeightChart', label: 'Body Weight Chart' },
  macroChart: { prefKey: 'showMacroChart', label: 'Macronutrient Chart' },
}

const DETAIL_TYPES: Array<{ type: LogEntryType; label: string }> = [
  { type: 'meal', label: 'Meals' },
  { type: 'workout', label: 'Workouts' },
  { type: 'bodyweight', label: 'Weight' },
  { type: 'mood', label: 'Mood' },
  { type: 'reflection', label: 'Reflections' },
]

interface DashboardCustomizerProps {
  prefs: DashboardPrefs
  setPrefs: (prefs: DashboardPrefs) => void
  detailPrefs: LogDetailPrefs
  setDetailPrefs: (prefs: LogDetailPrefs) => void
}

export function DashboardCustomizer({ prefs, setPrefs, detailPrefs, setDetailPrefs }: DashboardCustomizerProps) {
  const [open, setOpen] = useState(false)
  const draggedKey = useRef<WidgetKey | null>(null)

  function toggleWidget(prefKey: keyof DashboardPrefs) {
    setPrefs({ ...prefs, [prefKey]: !prefs[prefKey] })
  }

  function handleDragStart(key: WidgetKey) {
    draggedKey.current = key
  }

  function handleDragOver(e: React.DragEvent, key: WidgetKey) {
    e.preventDefault()
    if (draggedKey.current === null || draggedKey.current === key) return
    const order = [...prefs.widgetOrder]
    const fromIndex = order.indexOf(draggedKey.current)
    const toIndex = order.indexOf(key)
    if (fromIndex === -1 || toIndex === -1) return
    order.splice(toIndex, 0, order.splice(fromIndex, 1)[0])
    setPrefs({ ...prefs, widgetOrder: order })
  }

  function handleDragEnd() {
    draggedKey.current = null
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Sections — drag to reorder
                </p>
                {prefs.widgetOrder.map((key) => {
                  const { prefKey, label } = WIDGET_CONFIG[key]
                  return (
                    <div
                      key={key}
                      draggable
                      onDragStart={() => handleDragStart(key)}
                      onDragOver={(e) => handleDragOver(e, key)}
                      onDragEnd={handleDragEnd}
                      className="flex items-center gap-2 py-1.5 cursor-grab active:cursor-grabbing rounded hover:bg-muted px-1 -mx-1"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <label className="flex items-center gap-2 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={prefs[prefKey] as boolean}
                          onChange={() => toggleWidget(prefKey)}
                          className="h-4 w-4 rounded border-muted accent-primary"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    </div>
                  )
                })}
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
