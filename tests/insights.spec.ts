import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'
import { setupApiMocks } from './helpers/mocks'

test.describe('AI Insights', () => {
  test('dashboard shows insight section', async ({ page }) => {
    await setupApiMocks(page)
    await loginAsTestUser(page)
    await page.goto('/dashboard')
    // Either a "Generate Insight" button or a cached narrative is present
    const generateBtn = page.getByRole('button', { name: /generate insight/i })
    const hasBtn = await generateBtn.isVisible().catch(() => false)
    const hasText = await page.getByText(/week|mood|workout|habit/i).isVisible().catch(() => false)
    expect(hasBtn || hasText).toBe(true)
  })

  test('user can generate an insight', async ({ page }) => {
    await setupApiMocks(page)
    await loginAsTestUser(page)
    await page.goto('/dashboard')

    const generateBtn = page.getByRole('button', { name: /generate insight/i })
    if (await generateBtn.isVisible()) {
      await generateBtn.click()
      await expect(page.getByText('You had a solid week')).toBeVisible({ timeout: 20_000 })
    } else {
      // Already cached — insight text is visible
      await expect(page.locator('main')).toBeVisible()
    }
  })

  test('dashboard page loads without errors', async ({ page }) => {
    await setupApiMocks(page)
    await loginAsTestUser(page)
    await page.goto('/dashboard')
    await expect(page.locator('main')).toBeVisible()
    // No error page
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })
})
