import { mockParseTranscript } from './mockTranscriptParser'
import type { ParsedLogEntry } from '@/lib/types'

export async function parseTranscript(transcript: string): Promise<ParsedLogEntry> {
  // ElevenLabs STT + LLM branch added in Phase 3
  return mockParseTranscript(transcript)
}
