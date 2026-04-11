'use client'

import { useState } from 'react'
import { DeterministicStats } from './DeterministicStats'
import { InsightPlayer } from '@/components/voice/InsightPlayer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { DashboardStats, InsightCache } from '@/lib/types'

interface InsightCardProps {
  stats: DashboardStats
  initialInsight: InsightCache | null
  isStale: boolean
}

export function InsightCard({ stats, initialInsight, isStale: initialIsStale }: InsightCardProps) {
  const [insight, setInsight] = useState<InsightCache | null>(initialInsight)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isStale, setIsStale] = useState(initialIsStale)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/insights', { method: 'POST' })
      const json = await res.json() as { data?: { insight: InsightCache }; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Failed to generate insight')
      setInsight(json.data!.insight)
      setIsStale(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      <DeterministicStats stats={stats} />

      {isStale && (
        <p className="text-xs text-amber-500">
          New data available — regenerate for an updated insight.
        </p>
      )}

      {!insight && !isGenerating && (
        <Button onClick={handleGenerate} className="h-10 px-6">
          Generate Insight
        </Button>
      )}

      {isGenerating && (
        <p className="text-sm text-muted-foreground animate-pulse">
          Generating your weekly summary...
        </p>
      )}

      {insight && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {insight.insight_mode === 'llm' ? 'AI Insight' : 'Smart Summary'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="h-auto py-0 px-1 text-xs text-muted-foreground"
            >
              Regenerate
            </Button>
          </div>
          <div className="border-l-2 border-primary/30 pl-4">
            <p className="text-sm leading-relaxed text-foreground/90">{insight.narrative}</p>
          </div>
          <InsightPlayer audioUrl={insight.audio_url} />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
