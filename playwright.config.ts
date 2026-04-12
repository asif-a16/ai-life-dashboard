import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.test.local' })

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 0,
  globalSetup: './tests/global.setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      // Auth flow tests run without a pre-saved session
      name: 'auth',
      testMatch: '**/auth.spec.ts',
      retries: 1,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // All other tests use the saved authenticated session
      name: 'authenticated',
      testIgnore: '**/auth.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/user.json',
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
