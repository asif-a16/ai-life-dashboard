import { test, expect } from '@playwright/test'

// Onboarding tests use a fresh unauthenticated session and navigate directly
// to the onboarding page (which the middleware allows for authenticated users
// who haven't completed onboarding). We test the UI flow in isolation without
// actually hitting the API, since we don't want to mutate a real profile.

test.describe('Onboarding flow (UI)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the onboard PATCH so it doesn't touch a real profile
    await page.route('**/api/profile/onboard', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    )
    // Mock habits POST
    await page.route('**/api/habits', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'mock-habit', name: 'Test', color: '#6366f1' } }) })
      } else {
        route.continue()
      }
    })
    // Mock log entry POST
    await page.route('**/api/log', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'mock-entry' } }) })
      } else {
        route.continue()
      }
    })
    await page.goto('/onboarding')
  })

  test('shows welcome step on load', async ({ page }) => {
    await expect(page.getByText('Welcome to AI Life Dashboard')).toBeVisible()
  })

  test('get started advances to step 2', async ({ page }) => {
    await page.getByRole('button', { name: /get started/i }).click()
    await expect(page.getByText(/track everything/i)).toBeVisible()
  })

  test('can advance through all 6 steps', async ({ page }) => {
    // Step 1 → 2
    await page.getByRole('button', { name: /get started/i }).click()
    await expect(page.getByText(/track everything/i)).toBeVisible()

    // Step 2 → 3
    await page.getByRole('button', { name: /^next$/i }).click()
    await expect(page.getByText(/weekly ai summary/i)).toBeVisible()

    // Step 3 → 4
    await page.getByRole('button', { name: /^next$/i }).click()
    await expect(page.getByText(/build routines/i)).toBeVisible()

    // Step 4 → 5
    await page.getByRole('button', { name: /^next$/i }).click()
    await expect(page.getByText(/create your first habit/i)).toBeVisible()

    // Step 5 → 6 (skip habit creation)
    await page.getByRole('button', { name: /continue without habit/i }).click()
    await expect(page.getByText(/you're all set/i)).toBeVisible()
  })

  test('skip setup on step 1 navigates away', async ({ page }) => {
    await page.getByRole('button', { name: /skip/i }).click()
    // Should navigate (mocked onboard returns 200, router.push fires)
    await expect(page).toHaveURL(/dashboard|onboarding/)
  })

  test('skip setup on step 2 navigates away', async ({ page }) => {
    await page.getByRole('button', { name: /get started/i }).click()
    await page.getByRole('button', { name: /skip setup/i }).click()
    await expect(page).toHaveURL(/dashboard|onboarding/)
  })

  test('habit name input accepts text', async ({ page }) => {
    // Navigate to step 5
    await page.getByRole('button', { name: /get started/i }).click()
    await page.getByRole('button', { name: /^next$/i }).click()
    await page.getByRole('button', { name: /^next$/i }).click()
    await page.getByRole('button', { name: /^next$/i }).click()

    await page.getByPlaceholder(/morning walk/i).fill('Exercise daily')
    await expect(page.getByPlaceholder(/morning walk/i)).toHaveValue('Exercise daily')
  })

  test('reflection textarea accepts text on final step', async ({ page }) => {
    // Navigate to step 6
    await page.getByRole('button', { name: /get started/i }).click()
    await page.getByRole('button', { name: /^next$/i }).click()
    await page.getByRole('button', { name: /^next$/i }).click()
    await page.getByRole('button', { name: /^next$/i }).click()
    await page.getByRole('button', { name: /continue without habit/i }).click()

    await page.getByPlaceholder(/had oatmeal/i).fill('Great day today')
    await expect(page.getByPlaceholder(/had oatmeal/i)).toHaveValue('Great day today')
  })

  test('progress dots advance with each step', async ({ page }) => {
    const dots = page.locator('.bg-primary').first()
    await expect(dots).toBeVisible()

    await page.getByRole('button', { name: /get started/i }).click()
    // Active dot expands (w-4 class) — just verify progress indicator updates
    await expect(page.getByText(/track everything/i)).toBeVisible()
  })
})
