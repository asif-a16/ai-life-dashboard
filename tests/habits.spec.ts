import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'

function habitRowByName(page: Page, name: string) {
  return page
    .locator('div.flex.items-center.gap-3.rounded-xl.border')
    .filter({ has: page.locator('span.text-sm.font-medium', { hasText: name }) })
    .first()
}

test.describe('Habits', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto('/habits')
  })

  test('habits page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /habits/i })).toBeVisible()
  })

  test('user can create a habit', async ({ page }) => {
    const name = `Test habit ${Date.now()}`
    const createHabitResponse = page.waitForResponse(
      (response) => response.url().includes('/api/habits') && response.request().method() === 'POST' && response.ok()
    )

    await page.getByPlaceholder(/habit name/i).fill(name)
    await page.getByRole('button', { name: /^add$/i }).click()
    await createHabitResponse

    const habitRow = habitRowByName(page, name)
    await expect(habitRow).toBeVisible({ timeout: 15_000 })
  })

  test('user can check off a habit', async ({ page }) => {
    // Create a habit first
    const name = `Checkable habit ${Date.now()}`
    const createHabitResponse = page.waitForResponse(
      (response) => response.url().includes('/api/habits') && response.request().method() === 'POST' && response.ok()
    )

    await page.getByPlaceholder(/habit name/i).fill(name)
    await page.getByRole('button', { name: /^add$/i }).click()
    await createHabitResponse

    // Check it off
    const habitRow = habitRowByName(page, name)
    await expect(habitRow).toBeVisible({ timeout: 15_000 })
    const checkbox = habitRow.getByRole('checkbox').first()
    await checkbox.click()
    await expect(checkbox).toHaveAttribute('aria-checked', 'true')
  })

  test('user can delete a habit', async ({ page }) => {
    const name = `Deletable habit ${Date.now()}`
    const createHabitResponse = page.waitForResponse(
      (response) => response.url().includes('/api/habits') && response.request().method() === 'POST' && response.ok()
    )

    await page.getByPlaceholder(/habit name/i).fill(name)
    await page.getByRole('button', { name: /^add$/i }).click()
    await createHabitResponse

    const habitRow = habitRowByName(page, name)
    await expect(habitRow).toBeVisible({ timeout: 15_000 })

    const deleteHabitResponse = page.waitForResponse(
      (response) => response.url().includes('/api/habits?id=') && response.request().method() === 'DELETE' && response.ok()
    )
    await habitRow.getByRole('button', { name: /delete habit/i }).click()
    await deleteHabitResponse

    await expect(page.locator('div.flex.items-center.gap-3.rounded-xl.border').filter({ hasText: name })).toHaveCount(0, { timeout: 15_000 })
  })
})
