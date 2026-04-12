import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'
import { setupApiMocks } from './helpers/mocks'

test.describe('Log Entry Form', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto('/log')
  })

  // ── Meal ─────────────────────────────────────────────────────────────────────

  test('user can create a meal log entry', async ({ page }) => {
    await page.getByRole('tab', { name: 'Meal' }).click()
    await page.getByLabel('Description').fill('Grilled chicken')
    await page.getByLabel('Calories').fill('500')
    await page.getByRole('button', { name: 'Save Entry' }).click()
    await expect(page.getByText('Entry saved')).toBeVisible()
  })

  test('meal form accepts all fields', async ({ page }) => {
    await page.getByRole('tab', { name: 'Meal' }).click()
    await page.getByLabel('Description').fill('Full macro meal')
    await page.getByLabel('Calories').fill('600')
    await page.getByLabel('Protein (g)').fill('40')
    await page.getByLabel('Fat (g)').fill('20')
    await page.getByLabel('Carbs (g)').fill('70')
    await page.getByRole('button', { name: 'Save Entry' }).click()
    await expect(page.getByText('Entry saved')).toBeVisible()
  })

  test('meal type selector changes value', async ({ page }) => {
    await page.getByRole('tab', { name: 'Meal' }).click()
    await page.getByRole('combobox', { name: /meal type/i }).click()
    await page.getByRole('option', { name: 'Breakfast' }).click()
    await expect(page.getByRole('combobox', { name: /meal type/i })).toContainText('Breakfast')
  })

  // ── Workout ──────────────────────────────────────────────────────────────────

  test('user can create a workout log entry', async ({ page }) => {
    await page.getByRole('tab', { name: 'Workout' }).click()
    await page.getByLabel('Activity').fill('Running')
    await page.getByLabel('Duration (min)').fill('30')
    await page.getByRole('button', { name: 'Save Entry' }).click()
    await expect(page.getByText('Entry saved')).toBeVisible()
  })

  test('workout intensity selector works', async ({ page }) => {
    await page.getByRole('tab', { name: 'Workout' }).click()
    await page.getByRole('combobox', { name: /intensity/i }).click()
    await page.getByRole('option', { name: 'Hard' }).click()
    await expect(page.getByRole('combobox', { name: /intensity/i })).toContainText('Hard')
  })

  test('workout with optional distance saves', async ({ page }) => {
    await page.getByRole('tab', { name: 'Workout' }).click()
    await page.getByLabel('Activity').fill('Cycling')
    await page.getByLabel('Duration (min)').fill('45')
    await page.getByLabel(/distance/i).fill('15')
    await page.getByRole('button', { name: 'Save Entry' }).click()
    await expect(page.getByText('Entry saved')).toBeVisible()
  })

  // ── Bodyweight ───────────────────────────────────────────────────────────────

  test('user can create a bodyweight log entry', async ({ page }) => {
    await page.getByRole('tab', { name: 'Weight' }).click()
    await page.getByRole('spinbutton', { name: 'Weight' }).fill('75.5')
    await page.getByRole('button', { name: 'Save Entry' }).click()
    await expect(page.getByText('Entry saved')).toBeVisible()
  })

  test('bodyweight unit selector works', async ({ page }) => {
    await page.getByRole('tab', { name: 'Weight' }).click()
    await page.getByRole('combobox', { name: /unit/i }).click()
    await page.getByRole('option', { name: 'lbs' }).click()
    await expect(page.getByRole('combobox', { name: /unit/i })).toContainText('lbs')
  })

  // ── Mood ─────────────────────────────────────────────────────────────────────

  test('user can create a mood log entry', async ({ page }) => {
    await page.getByRole('tab', { name: 'Mood' }).click()
    await page.getByLabel(/emotions/i).fill('happy, calm')
    await page.getByRole('button', { name: 'Save Entry' }).click()
    await expect(page.getByText('Entry saved')).toBeVisible()
  })

  test('mood sliders are interactive', async ({ page }) => {
    await page.getByRole('tab', { name: 'Mood' }).click()
    const slider = page.locator('input[type="range"]').first()
    await expect(slider).toBeVisible()
    await slider.fill('8')
    await expect(slider).toHaveValue('8')
  })

  // ── Reflection ───────────────────────────────────────────────────────────────

  test('user can create a reflection log entry', async ({ page }) => {
    await page.getByRole('tab', { name: 'Reflection' }).click()
    await page.getByRole('textbox', { name: 'Reflection' }).fill('Today was a great day.')
    await page.getByRole('button', { name: 'Save Entry' }).click()
    await expect(page.getByText('Entry saved')).toBeVisible()
  })

  // ── Voice ────────────────────────────────────────────────────────────────────

  test('voice assistant button is present on log page', async ({ page }) => {
    await expect(page.getByRole('button', { name: /voice assistant/i })).toBeVisible()
  })

  test('voice assistant opens and shows start conversation button', async ({ page }) => {
    await page.getByRole('button', { name: /voice assistant/i }).click()
    await expect(page.getByRole('button', { name: /start conversation/i })).toBeVisible()
  })

  test('voice mock returns parsed entry', async ({ page }) => {
    await setupApiMocks(page)
    const responsePromise = page.waitForResponse('**/api/voice/stt')
    await page.evaluate(async () => {
      const formData = new FormData()
      formData.append('audio', new Blob(['fake'], { type: 'audio/webm' }), 'test.webm')
      await fetch('/api/voice/stt', { method: 'POST', body: formData })
    })
    const response = await responsePromise
    expect(response.ok()).toBeTruthy()
    const body = await response.json() as { parsedEntry?: { type: string } }
    expect(body.parsedEntry).toBeDefined()
    expect(body.parsedEntry!.type).toBe('meal')
  })

  // ── Recent entries ────────────────────────────────────────────────────────────

  test('recent entries section is visible', async ({ page }) => {
    await expect(page.getByText(/recent entries/i)).toBeVisible()
  })

  test('newly saved entry appears in recent entries', async ({ page }) => {
    const description = `Recent entry test ${Date.now()}`
    await page.getByRole('tab', { name: 'Meal' }).click()
    await page.getByLabel('Description').fill(description)
    await page.getByRole('button', { name: 'Save Entry' }).click()
    await expect(page.getByText('Entry saved')).toBeVisible()
    await expect(page.getByText(description)).toBeVisible()
  })
})
