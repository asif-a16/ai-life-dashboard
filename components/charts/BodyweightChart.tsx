'use client'

import { useState, useMemo } from 'react'
import { WeightCsvControls } from '@/components/charts/WeightCsvControls'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

type Filter = '1W' | '1M' | '1Y'

interface BodyweightChartProps {
  entries: Array<{ data: Record<string, unknown>; logged_at: string }>
}

const FILTER_DAYS: Record<Filter, number> = { '1W': 7, '1M': 30, '1Y': 365 }

export function BodyweightChart({ entries }: BodyweightChartProps) {
  const [filter, setFilter] = useState<Filter>('1M')

  const points = useMemo(() => {
    const now = new Date()
    const cutoff = now.getTime() - FILTER_DAYS[filter] * 24 * 60 * 60 * 1000
    return entries
      .filter((e) => new Date(e.logged_at).getTime() >= cutoff)
      .map((e) => ({
        date: e.logged_at.split('T')[0],
        weight: Number(e.data.weight_kg),
      }))
  }, [entries, filter])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Weight Trend</h3>
        <div className="flex gap-1">
          {(['1W', '1M', '1Y'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No weight entries yet.</p>
      ) : points.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No weight entries in this period.</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => v.toFixed(1)}
            />
            <Tooltip
              formatter={(v) => [typeof v === 'number' ? v.toFixed(2) + ' kg' : v, 'Weight']}
              contentStyle={{ fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              strokeWidth={2}
              dot={points.length <= 14}
              activeDot={{ r: 4 }}
              className="stroke-primary"
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      <WeightCsvControls />
    </div>
  )
}
