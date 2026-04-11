export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.webm')
  formData.append('model_id', 'scribe_v1')
  // Force English — without this, scribe_v1 auto-detects and can return Korean
  // or other languages when audio quality is ambiguous.
  formData.append('language_code', 'en')

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
    },
    body: formData,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`ElevenLabs STT failed: ${response.status} ${text}`)
  }

  const json = await response.json() as { text?: string }
  if (!json.text) throw new Error('ElevenLabs STT returned no transcript')

  console.log('[stt] raw transcript:', json.text)
  return json.text
}
