import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'

test.describe('History', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
  })

  test('history page loads', async ({ page }) => {
    await page.goto('/history')
    await expect(page.getByRole('heading', { name: /history/i })).toBeVisible()
  })

  test('logged entry appears in history', async ({ page }) => {
    // Log a meal first
    const description = `History test meal ${Date.now()}`
    await page.goto('/log')
    await page.getByRole('tab', { name: 'Meal' }).click()
    await page.getByLabel('Description').fill(description)
    await page.getByRole('button', { name: 'Save Entry' }).click()
    await expect(page.getByText('Entry saved')).toBeVisible()

    // Verify it appears in history
    await page.goto('/history')
    await expect(page.getByText(description)).toBeVisible()
  })

  test('user can delete an entry from history', async ({ page }) => {
    // Log an entry to delete
    const description = `Delete test ${Date.now()}`
    await page.goto('/log')
    await page.getByRole('tab', { name: 'Meal' }).click()
    await page.getByLabel('Description').fill(description)
    await page.getByRole('button', { name: 'Save Entry' }).click()
    await expect(page.getByText('Entry saved')).toBeVisible()

    await page.goto('/history')
    await expect(page.getByText(description)).toBeVisible()

    // Delete it
    const entryRow = page.locator('li, [data-entry]').filter({ hasText: description }).first()
    await entryRow.getByRole('button', { name: /delete/i }).click()
    await expect(page.getByText(description)).not.toBeVisible()
  })
})
