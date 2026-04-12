import { test, expect } from '@playwright/test'

// These tests run without saved session state (auth project in playwright.config.ts).

test('unauthenticated user is redirected to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})

test('user can log in and access dashboard', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL!)
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 })

  // Handle onboarding redirect if needed
  if (page.url().includes('/onboarding')) {
    await page.request.patch('/api/profile/onboard')
    await page.goto('/dashboard')
  }

  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('navigation')).toBeVisible()
})

test('user can log out', async ({ page }) => {
  // Log in first
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL!)
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 })
  if (page.url().includes('/onboarding')) {
    await page.request.patch('/api/profile/onboard')
  }
  await page.goto('/log')
  await page.locator('html[data-topnav-hydrated="true"]').waitFor({ timeout: 10_000 })
  const signOutRequest = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().includes('/api/auth/signout'),
    { timeout: 10_000 }
  )
  const signOutResponse = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/api/auth/signout'),
    { timeout: 10_000 }
  )
  await page.getByTestId('topnav-signout').click()
  await signOutRequest
  const response = await signOutResponse
  expect(response.ok()).toBeTruthy()

  await expect
    .poll(async () => {
      const cookies = await page.context().cookies()
      return cookies.filter((cookie) => cookie.name.startsWith('sb-')).length
    }, { timeout: 10_000 })
    .toBe(0)

  const protectedRes = await page.request.get('/api/habits')
  expect(protectedRes.status()).toBe(401)
})
