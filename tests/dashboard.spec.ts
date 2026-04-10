import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'

test('saved log entry appears in recent logs on dashboard', async ({ page }) => {
  await loginAsTestUser(page)

  await page.goto('/log')
  await page.getByRole('tab', { name: 'Meal' }).click()
  const uniqueDescription = `Test meal ${Date.now()}`
  await page.getByLabel('Description').fill(uniqueDescription)
  await page.getByRole('button', { name: 'Save Entry' }).click()
  await expect(page.getByText('Entry saved')).toBeVisible()

  await page.goto('/dashboard')
  await expect(page.getByText(uniqueDescription)).toBeVisible()
})
