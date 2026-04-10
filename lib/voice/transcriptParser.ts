import { mockParseTranscript } from './mockTranscriptParser'
import { llmParseTranscript } from './llmTranscriptParser'
import type { ParsedLogEntry } from '@/lib/types'

export async function parseTranscript(transcript: string): Promise<ParsedLogEntry> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await llmParseTranscript(transcript)
    } catch {
      // LLM failed — fall back to mock parser
    }
  }
  return mockParseTranscript(transcript)
}
