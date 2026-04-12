import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'
import { setupApiMocks } from './helpers/mocks'

async function ensureInsightWidgetVisible(page: Page) {
  const insightCard = page
    .locator('div.rounded-xl.border')
    .filter({ has: page.getByText('Weekly Insight', { exact: true }) })
    .first()

  if (await insightCard.isVisible().catch(() => false)) return

  await page.getByRole('button', { name: /customize dashboard/i }).click()
  const insightToggle = page.getByRole('checkbox', { name: /weekly insight/i })
  await expect(insightToggle).toBeVisible()

  if (!(await insightToggle.isChecked())) {
    await insightToggle.click()
  }

  await page.getByRole('button', { name: /close/i }).click()
  await expect(insightCard).toBeVisible({ timeout: 10_000 })
}

test.describe('AI Insights', () => {
  test('dashboard shows insight section', async ({ page }) => {
    await setupApiMocks(page)
    await loginAsTestUser(page)
    await page.goto('/dashboard')

    await ensureInsightWidgetVisible(page)
    await expect(page.getByText('Weekly Insight', { exact: true })).toBeVisible()

    const generateBtn = page.getByRole('button', { name: /generate insight/i })
    const hasGenerateButton = await generateBtn.isVisible().catch(() => false)
    if (!hasGenerateButton) {
      await expect(page.getByText(/week|mood|workout|habit/i)).toBeVisible()
    }
  })

  test('user can generate an insight', async ({ page }) => {
    await setupApiMocks(page)
    await loginAsTestUser(page)
    await page.goto('/dashboard')

    await ensureInsightWidgetVisible(page)
    await expect(page.getByText('Weekly Insight', { exact: true })).toBeVisible()

    const generateOrRegenerateBtn = page.getByRole('button', { name: /generate insight|regenerate/i }).first()
    await expect(generateOrRegenerateBtn).toBeVisible()
    await generateOrRegenerateBtn.click()
    await expect(page.getByText('You had a solid week')).toBeVisible({ timeout: 20_000 })
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
