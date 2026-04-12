import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'

test.describe('Food Library', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto('/foods')
  })

  test('foods page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /food library/i })).toBeVisible()
  })

  test('user can add a custom food', async ({ page }) => {
    const name = `Test Food ${Date.now()}`
    await page.getByRole('button', { name: /add food/i }).click()
    await page.getByLabel('Name').fill(name)
    await page.getByLabel(/calories/i).fill('200')
    await page.getByLabel(/protein/i).fill('25')
    await page.getByRole('button', { name: /add food/i }).last().click()
    await expect(page.getByText(name)).toBeVisible()
  })

  test('user can edit a custom food', async ({ page }) => {
    const name = `Editable Food ${Date.now()}`
    const updatedName = `Updated Food ${Date.now()}`

    // Create
    await page.getByRole('button', { name: /add food/i }).click()
    await page.getByLabel('Name').fill(name)
    await page.getByLabel(/calories/i).fill('100')
    await page.getByRole('button', { name: /add food/i }).last().click()
    await expect(page.getByText(name)).toBeVisible()

    // Edit
    const foodRow = page.locator('li').filter({ hasText: name })
    await foodRow.getByRole('button', { name: /edit food/i }).click()
    await page.locator('input#food-name').fill(updatedName)
    await page.getByRole('button', { name: /^save$/i }).click()
    await expect(page.getByText(updatedName)).toBeVisible()
  })

  test('user can delete a custom food', async ({ page }) => {
    const name = `Deletable Food ${Date.now()}`

    await page.getByRole('button', { name: /add food/i }).click()
    await page.getByLabel('Name').fill(name)
    await page.getByLabel(/calories/i).fill('150')
    await page.getByRole('button', { name: /add food/i }).last().click()
    await expect(page.getByText(name)).toBeVisible()

    const foodRow = page.locator('li').filter({ hasText: name })
    await foodRow.getByRole('button', { name: /delete/i }).click()
    await expect(page.getByText(name)).not.toBeVisible()
  })

  test('custom food appears in meal log food search', async ({ page }) => {
    const name = `Searchable Food ${Date.now()}`

    // Add food
    await page.getByRole('button', { name: /add food/i }).click()
    await page.getByLabel('Name').fill(name)
    await page.getByLabel(/calories/i).fill('300')
    await page.getByRole('button', { name: /add food/i }).last().click()
    await expect(page.getByText(name)).toBeVisible()

    // Go to log page and search for it
    await page.goto('/log')
    await page.getByRole('tab', { name: 'Meal' }).click()
    await page.getByPlaceholder(/search foods/i).click()
    await page.getByPlaceholder(/search foods/i).fill(name.split(' ')[0])
    await expect(page.getByText(name)).toBeVisible()
  })

  test('selecting a food auto-fills calories when weight is set', async ({ page }) => {
    const name = `AutoFill Food ${Date.now()}`

    // Add food with known calories
    await page.getByRole('button', { name: /add food/i }).click()
    await page.getByLabel('Name').fill(name)
    await page.getByLabel(/calories/i).fill('200') // 200 kcal/100g
    await page.getByRole('button', { name: /add food/i }).last().click()
    await expect(page.getByText(name)).toBeVisible()

    // Select food on log page
    await page.goto('/log')
    await page.getByRole('tab', { name: 'Meal' }).click()
    await page.getByPlaceholder(/search foods/i).click()
    await page.getByPlaceholder(/search foods/i).fill(name.split(' ')[0])
    await page.getByText(name).click()

    // Change weight to 150g — calories should become 300
    await page.getByRole('spinbutton', { name: /weight \(g\)/i }).fill('150')
    await expect(page.getByLabel(/calories/i)).toHaveValue('300')
  })
})
