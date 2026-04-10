import { mockGenerateNarrative } from './mockNarrativeGenerator'
import { llmGenerateNarrative } from './llmNarrativeGenerator'
import type { DashboardStats, RecentEntriesContext } from '@/lib/types'

export async function generateNarrative(
  stats: DashboardStats,
  recentEntries: RecentEntriesContext
): Promise<string> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await llmGenerateNarrative(stats, recentEntries)
    } catch {
      // LLM failed — fall back to mock narrative
    }
  }
  return mockGenerateNarrative(stats)
}
