'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MonthGridProps {
  markedDates: string[]
  selectedDate: string | null
  onSelectDate: (date: string) => void
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatYearMonth(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function MonthGrid({ markedDates, selectedDate, onSelectDate }: MonthGridProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const markedSet = useMemo(() => new Set(markedDates.map((d) => d.split('T')[0])), [markedDates])

  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const result: Array<{ day: number; dateStr: string } | null> = []
    for (let i = 0; i < firstDay; i++) result.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const pad = (n: number) => String(n).padStart(2, '0')
      const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`
      result.push({ day: d, dateStr })
    }
    return result
  }, [viewYear, viewMonth])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-muted transition-colors" aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">{formatYearMonth(viewYear, viewMonth)}</span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-muted transition-colors" aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="text-xs text-muted-foreground py-1">{d}</div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} />
          const isToday = cell.dateStr === todayStr
          const isSelected = cell.dateStr === selectedDate
          const hasEntries = markedSet.has(cell.dateStr)
          return (
            <button
              key={cell.dateStr}
              onClick={() => onSelectDate(cell.dateStr)}
              className={`relative flex flex-col items-center justify-center rounded-md py-1.5 text-sm transition-colors ${
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : isToday
                  ? 'ring-1 ring-primary text-primary hover:bg-primary/10'
                  : 'hover:bg-muted'
              }`}
            >
              {cell.day}
              {hasEntries && (
                <span
                  className={`absolute bottom-0.5 h-1 w-1 rounded-full ${
                    isSelected ? 'bg-primary-foreground' : 'bg-primary'
                  }`}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
