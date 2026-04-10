import { mockGenerateNarrative } from './mockNarrativeGenerator'
import type { DashboardStats, RecentEntriesContext } from '@/lib/types'

export async function generateNarrative(
  stats: DashboardStats,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _recentEntries: RecentEntriesContext
): Promise<string> {
  // LLM branch added in Phase 4
  return mockGenerateNarrative(stats)
}
