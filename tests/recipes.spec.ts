import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'

test.describe('Recipes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto('/recipes')
  })

  test('recipes page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /recipes/i })).toBeVisible()
  })

  test('user can create a recipe', async ({ page }) => {
    const name = `Test Recipe ${Date.now()}`
    await page.getByRole('button', { name: /new recipe/i }).click()
    await page.getByLabel('Name').fill(name)
    await page.getByLabel(/total yield/i).fill('400')
    await page.getByRole('button', { name: /create recipe/i }).click()
    await expect(page.getByText(name)).toBeVisible()
  })

  test('user can edit a recipe name', async ({ page }) => {
    const name = `Editable Recipe ${Date.now()}`
    const updatedName = `Updated Recipe ${Date.now()}`

    await page.getByRole('button', { name: /new recipe/i }).click()
    await page.getByLabel('Name').fill(name)
    await page.getByLabel(/total yield/i).fill('300')
    await page.getByRole('button', { name: /create recipe/i }).click()
    await expect(page.getByText(name)).toBeVisible()

    const recipeRow = page.locator('li').filter({ hasText: name })
    await recipeRow.getByRole('button', { name: /edit recipe/i }).click()
    await page.locator('input[id^="recipe-name-"]').fill(updatedName)
    await page.getByRole('button', { name: /^save$/i }).click()
    await expect(page.getByText(updatedName)).toBeVisible()
  })

  test('user can delete a recipe', async ({ page }) => {
    const name = `Deletable Recipe ${Date.now()}`

    await page.getByRole('button', { name: /new recipe/i }).click()
    await page.getByLabel('Name').fill(name)
    await page.getByLabel(/total yield/i).fill('200')
    await page.getByRole('button', { name: /create recipe/i }).click()
    await expect(page.getByText(name)).toBeVisible()

    const recipeRow = page.locator('li').filter({ hasText: name })
    await recipeRow.getByRole('button', { name: /delete/i }).click()
    await expect(page.getByText(name)).not.toBeVisible()
  })

  test('user can expand a recipe to see ingredients', async ({ page }) => {
    const name = `Expandable Recipe ${Date.now()}`

    await page.getByRole('button', { name: /new recipe/i }).click()
    await page.getByLabel('Name').fill(name)
    await page.getByLabel(/total yield/i).fill('500')
    await page.getByRole('button', { name: /create recipe/i }).click()

    const recipeRow = page.locator('li').filter({ hasText: name })
    await recipeRow.getByText(name).click()
    // Expanded section should show add ingredient button
    await expect(page.getByRole('button', { name: /add ingredient/i })).toBeVisible()
  })

  test('recipe appears in meal log food search', async ({ page }) => {
    const name = `Searchable Recipe ${Date.now()}`

    await page.getByRole('button', { name: /new recipe/i }).click()
    await page.getByLabel('Name').fill(name)
    await page.getByLabel(/total yield/i).fill('300')
    await page.getByRole('button', { name: /create recipe/i }).click()
    await expect(page.getByText(name)).toBeVisible()

    await page.goto('/log')
    await page.getByRole('tab', { name: 'Meal' }).click()
    await page.getByPlaceholder(/search foods/i).click()
    await page.getByPlaceholder(/search foods/i).fill(name.split(' ')[0])
    await expect(page.getByText(name)).toBeVisible()
    // Should be labelled as a recipe
    await expect(page.getByText('Recipe').first()).toBeVisible()
  })
})
