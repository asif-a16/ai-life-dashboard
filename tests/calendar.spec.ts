import { test, expect, type Page } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const SAMPLE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-event-${Date.now()}@test
DTSTART:${futureIcsDate(7)}
DTEND:${futureIcsDate(7, 1)}
SUMMARY:Test Doctor Appointment
LOCATION:City Hospital
END:VEVENT
END:VCALENDAR`

function futureIcsDate(daysFromNow: number, addHours = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(d.getHours() + addHours)
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

async function uploadIcs(page: Page, content: string) {
  const tmpPath = path.join(os.tmpdir(), `test-${Date.now()}.ics`)
  fs.writeFileSync(tmpPath, content)
  const input = page.locator('input[type="file"]')
  await input.setInputFiles(tmpPath)
  await page.getByRole('button', { name: /import calendar/i }).click()
  try {
    fs.unlinkSync(tmpPath)
  } catch {
    // Windows can hold a transient lock on file inputs; cleanup is best-effort.
  }
}

test.describe('Calendar', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto('/calendar')
  })

  test('calendar page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /calendar/i })).toBeVisible()
  })

  test('user can import an ICS file', async ({ page }) => {
    await uploadIcs(page, SAMPLE_ICS)
    await expect(page.getByText('Test Doctor Appointment')).toBeVisible({ timeout: 10_000 })
  })

  test('imported event shows location', async ({ page }) => {
    await uploadIcs(page, SAMPLE_ICS)
    await expect(page.getByText('City Hospital')).toBeVisible({ timeout: 10_000 })
  })
})
