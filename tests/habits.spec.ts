import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'

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
    await page.getByPlaceholder(/habit name/i).fill(name)
    await page.getByRole('button', { name: /^add$/i }).click()
    await expect(page.getByText(name)).toBeVisible()
  })

  test('user can check off a habit', async ({ page }) => {
    // Create a habit first
    const name = `Checkable habit ${Date.now()}`
    await page.getByPlaceholder(/habit name/i).fill(name)
    await page.getByRole('button', { name: /^add$/i }).click()
    await expect(page.getByText(name)).toBeVisible()

    // Check it off
    const habitRow = page.locator('div.rounded-xl.border').filter({ hasText: name }).first()
    const checkbox = habitRow.getByRole('checkbox').first()
    await checkbox.click()
    await expect(checkbox).toHaveAttribute('aria-checked', 'true')
  })

  test('user can delete a habit', async ({ page }) => {
    const name = `Deletable habit ${Date.now()}`
    await page.getByPlaceholder(/habit name/i).fill(name)
    await page.getByRole('button', { name: /^add$/i }).click()
    await expect(page.getByText(name)).toBeVisible()

    await page.getByRole('button', { name: /delete habit/i }).last().click()
    await expect(page.getByText(name)).not.toBeVisible()
  })
})
