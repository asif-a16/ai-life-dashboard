'use client'

import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

type Period = 'today' | '7d' | '30d'

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  '7d': '7 Days',
  '30d': '30 Days',
}

const MACRO_COLORS = {
  protein: '#10b981',
  carbs: '#3b82f6',
  fat: '#f59e0b',
}

interface MacroPieChartProps {
  entries: Array<{ data: Record<string, unknown>; logged_at: string }>
}

export function MacroPieChart({ entries }: MacroPieChartProps) {
  const [period, setPeriod] = useState<Period>('7d')

  const { protein, carbs, fat } = useMemo(() => {
    const now = new Date()
    const cutoffs: Record<Period, number> = {
      today: new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(),
      '7d': now.getTime() - 7 * 24 * 60 * 60 * 1000,
      '30d': now.getTime() - 30 * 24 * 60 * 60 * 1000,
    }
    const cutoff = cutoffs[period]

    let p = 0; let c = 0; let f = 0
    for (const e of entries) {
      if (new Date(e.logged_at).getTime() < cutoff) continue
      p += (e.data.protein_g as number | null) ?? 0
      c += (e.data.carbs_g as number | null) ?? 0
      f += (e.data.fat_g as number | null) ?? 0
    }
    return { protein: Math.round(p), carbs: Math.round(c), fat: Math.round(f) }
  }, [entries, period])

  const total = protein + carbs + fat

  const pieData = [
    { name: 'Protein', value: protein, color: MACRO_COLORS.protein },
    { name: 'Carbs', value: carbs, color: MACRO_COLORS.carbs },
    { name: 'Fat', value: fat, color: MACRO_COLORS.fat },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Macros</h3>
        <div className="flex gap-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No macro data logged yet. Add fat, carbs, or protein to your meals.
        </p>
      ) : (
        <div className="flex items-center gap-6">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                strokeWidth={2}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [typeof value === 'number' ? `${value}g` : value, name]}
                contentStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-2 flex-1">
            {[
              { label: 'Protein', grams: protein, color: MACRO_COLORS.protein },
              { label: 'Carbs', grams: carbs, color: MACRO_COLORS.carbs },
              { label: 'Fat', grams: fat, color: MACRO_COLORS.fat },
            ].map(({ label, grams, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-sm text-muted-foreground flex-1">{label}</span>
                <span className="text-sm font-medium">{grams}g</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
