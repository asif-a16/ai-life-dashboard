import type { Page } from '@playwright/test'

// Tests share the authenticated session state saved by global.setup.ts.
// This helper simply ensures the page is on the dashboard before each test.
export async function loginAsTestUser(page: Page) {
  await page.goto('/dashboard')
  // If the session cookie is valid, the layout lets us through.
  // If for any reason we end up at login or onboarding, handle it.
  const url = page.url()
  if (url.includes('/login')) {
    throw new Error('Test user session is not authenticated. Run global setup first.')
  }
  if (url.includes('/onboarding')) {
    await page.request.patch('/api/profile/onboard')
    await page.goto('/dashboard')
  }
}
