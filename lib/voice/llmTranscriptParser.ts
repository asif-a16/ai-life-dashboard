import Anthropic from '@anthropic-ai/sdk'
import { ParsedLogEntrySchema } from '@/lib/types'
import type { ParsedLogEntry } from '@/lib/types'

const EXTRACTION_SYSTEM_PROMPT = `You are a health log parser. Extract a structured entry from this voice transcript.
Return ONLY valid JSON with this exact shape:
{
  "type": "meal" | "workout" | "bodyweight" | "mood" | "reflection",
  "notes": string (optional extra context, can be empty string),
  "logged_at": ISO8601 string or null (if user mentions a time),
  "data": { ...type-specific fields }
}

Type-specific data fields:
- meal: { "description": string, "calories": number|null, "protein_g": number|null, "meal_type": "breakfast"|"lunch"|"dinner"|"snack" }
- workout: { "activity": string, "duration_min": number, "intensity": "light"|"moderate"|"hard", "distance_km": number|null }
- bodyweight: { "weight_kg": number, "unit": "kg"|"lbs" }
- mood: { "score": number 1-10, "emotions": string[], "energy_level": number 1-10 }
- reflection: { "content": string }

If type is ambiguous or cannot be determined, use "reflection" with the full transcript as content.
Never include extra fields. Never wrap in markdown code blocks.`

export async function llmParseTranscript(transcript: string): Promise<ParsedLogEntry> {
  const client = new Anthropic()

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: transcript }],
  })

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
  const parsed: unknown = JSON.parse(rawText)
  const result = ParsedLogEntrySchema.safeParse(parsed)

  if (!result.success) {
    return {
      type: 'reflection',
      notes: '',
      logged_at: null,
      data: { content: transcript },
    }
  }

  return result.data
}
