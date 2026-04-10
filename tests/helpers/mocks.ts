import type { Page } from '@playwright/test'

export async function setupApiMocks(page: Page) {
  // Mock ElevenLabs STT + Claude transcript parsing at the route handler level
  await page.route('**/api/voice/stt', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        parsedEntry: {
          type: 'meal',
          notes: '',
          logged_at: null,
          data: {
            description: 'Test chicken salad',
            calories: 400,
            protein_g: 35,
            meal_type: 'lunch',
          },
        },
        transcript: 'I had a chicken salad for lunch',
      }),
    })
  )

  // Mock ElevenLabs TTS + Anthropic at the insights generation level
  await page.route('**/api/insights', async (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          insight: {
            stats_json: {},
            narrative: 'You had a solid week. Keep it up.',
            audio_url: null,
            insight_mode: 'mock',
          },
          isStale: false,
        }),
      })
    } else {
      route.continue()
    }
  })
}
