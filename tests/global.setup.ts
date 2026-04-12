import { chromium, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load both env files — .env.test.local for test credentials,
// .env.local for Supabase keys needed to create the test user.
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env.test.local', override: true })

const STORAGE_STATE = 'tests/.auth/user.json'

async function ensureTestUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const email = process.env.TEST_USER_EMAIL!
  const password = process.env.TEST_USER_PASSWORD!

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Check if user already exists
  const { data: { users } } = await admin.auth.admin.listUsers()
  let userId = users.find((u) => u.email === email)?.id

  if (!userId) {
    // Create the test user with email already confirmed
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) throw new Error(`Failed to create test user: ${error.message}`)
    userId = created.user.id
    console.log(`Created test user: ${email}`)
  }

  // Ensure the profile exists and is marked onboarded
  await admin.from('profiles').upsert({
    id: userId,
    display_name: 'Test User',
    timezone: 'UTC',
    onboarded_at: new Date().toISOString(),
  }, { onConflict: 'id' })
}

export default async function globalSetup() {
  await ensureTestUser()

  // Log in via the browser UI and save the session cookie state
  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto('http://localhost:3000/login')
  await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL!)
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Wait for navigation to dashboard or onboarding
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 })

  // If at onboarding, patch and navigate to dashboard
  if (page.url().includes('/onboarding')) {
    await page.request.patch('http://localhost:3000/api/profile/onboard')
    await page.goto('http://localhost:3000/dashboard')
    await page.waitForURL('**/dashboard', { timeout: 10_000 })
  }

  await expect(page).toHaveURL(/\/dashboard/)

  // Save the authenticated browser context state for all tests to reuse
  await page.context().storageState({ path: STORAGE_STATE })
  await browser.close()
}
