import type { VoiceIntent } from '@/lib/types'

const QUESTION_PATTERNS = [
  /^(how|what|tell me|show me|am i|are my|give me|what's|whats)\b/i,
  /\b(trend|consistent|doing this week|been doing|my mood|my workout|my habit|summary|overview|how many|how much|how often|how well|what did i|what have i)\b/i,
]

function classifyByRegex(transcript: string): VoiceIntent {
  const lower = transcript.toLowerCase().trim()
  for (const pattern of QUESTION_PATTERNS) {
    if (pattern.test(lower)) return 'question'
  }
  return 'log'
}

export async function classifyIntent(transcript: string): Promise<VoiceIntent> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic()
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 5,
        system: 'Classify this health app voice input as either "log" (the user is recording a health entry like a meal, workout, weight, or mood) or "question" (the user is asking about their data or trends). Reply with only the single word "log" or "question".',
        messages: [{ role: 'user', content: transcript }],
      })
      const text = response.content.find((b) => b.type === 'text')?.text?.trim().toLowerCase()
      if (text === 'log' || text === 'question') return text
    } catch (e) {
      console.error('[intent] LLM classification failed, falling back to regex:', e instanceof Error ? e.message : e)
    }
  }

  const result = classifyByRegex(transcript)
  console.log('[intent] classified as', result, 'via regex for:', transcript)
  return result
}
