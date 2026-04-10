import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'

test('unauthenticated user is redirected to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})

test('user can log in and access dashboard', async ({ page }) => {
  await loginAsTestUser(page)
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('navigation')).toBeVisible()
})

test('user can log out', async ({ page }) => {
  await loginAsTestUser(page)
  await page.getByRole('button', { name: /sign out/i }).click()
  await expect(page).toHaveURL(/\/login/)
})
