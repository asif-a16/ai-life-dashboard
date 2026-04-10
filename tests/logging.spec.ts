import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'

test('user can create a meal log entry', async ({ page }) => {
  await loginAsTestUser(page)
  await page.goto('/log')
  await page.getByRole('tab', { name: 'Meal' }).click()
  await page.getByLabel('Description').fill('Grilled chicken')
  await page.getByLabel('Calories').fill('500')
  await page.getByRole('button', { name: 'Save Entry' }).click()
  await expect(page.getByText('Entry saved')).toBeVisible()
})
