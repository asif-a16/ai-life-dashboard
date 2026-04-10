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
      text,
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
