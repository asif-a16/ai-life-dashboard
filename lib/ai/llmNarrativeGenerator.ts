import Anthropic from '@anthropic-ai/sdk'
import { buildInsightPrompt } from './buildInsightPrompt'
import type { DashboardStats, RecentEntriesContext } from '@/lib/types'

const client = new Anthropic()

export async function llmGenerateNarrative(
  stats: DashboardStats,
  recentEntries: RecentEntriesContext
): Promise<string> {
  const { system, user } = buildInsightPrompt(stats, recentEntries)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system,
    messages: [{ role: 'user', content: user }],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text content in LLM response')
  }
  return textBlock.text
}
