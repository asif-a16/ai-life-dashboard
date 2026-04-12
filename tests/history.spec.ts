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

    const createEntryResponse = page.waitForResponse(
      (response) => response.url().includes('/api/log') && response.request().method() === 'POST' && response.ok()
    )
    await page.getByRole('button', { name: 'Save Entry' }).click()
    await createEntryResponse
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

    const createEntryResponse = page.waitForResponse(
      (response) => response.url().includes('/api/log') && response.request().method() === 'POST' && response.ok()
    )
    await page.getByRole('button', { name: 'Save Entry' }).click()
    await createEntryResponse
    await expect(page.getByText('Entry saved')).toBeVisible()

    await page.goto('/history')
    const entryRows = page.locator('li').filter({ hasText: description })
    await expect(entryRows).toHaveCount(1)

    // Delete it
    const deleteEntryResponse = page.waitForResponse(
      (response) => response.url().includes('/api/log?id=') && response.request().method() === 'DELETE' && response.ok()
    )
    const entryRow = entryRows.first()
    await entryRow.getByRole('button', { name: /delete/i }).click()
    await deleteEntryResponse
    await expect(entryRows).toHaveCount(0, { timeout: 15_000 })
  })
})
