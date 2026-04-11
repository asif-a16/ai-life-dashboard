/**
 * Convert text to a speech-friendly format before sending to ElevenLabs.
 * Only targets patterns that sound unnatural when spoken literally.
 * Does NOT modify text stored in the DB or shown in the UI.
 */
export function formatTextForSpeech(text: string): string {
  return text
    // "6.5/10" or "7/10" → "6.5 out of 10" / "7 out of 10"
    // Note: "6.5" is naturally spoken as "six point five" by TTS engines without modification
    .replace(/(\d+(?:\.\d+)?)\/(\d+)/g, '$1 out of $2')
    // Remove commas followed by a space (avoids spoken "comma" pause artifacts)
    .replace(/,(\s)/g, '$1')
    .replace(/,$/, '')
    .trim()
}

export async function synthesizeWithElevenLabs(text: string): Promise<Buffer> {
  const voiceId = process.env.ELEVENLABS_VOICE_ID
  if (!voiceId) throw new Error('ELEVENLABS_VOICE_ID is not configured')
  if (!process.env.ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY is not configured')

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: formatTextForSpeech(text),
      model_id: 'eleven_turbo_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ElevenLabs TTS failed: ${response.status} ${errorText}`)
  }

  return Buffer.from(await response.arrayBuffer())
}
