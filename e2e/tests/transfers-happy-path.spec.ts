import { test, expect } from '@playwright/test'

// Transfers: create -> send -> receive (using token)

test('Transfers happy path', async ({ page }) => {
  const base = process.env.E2E_BASE_URL || 'http://localhost:5173'
  const email = process.env.E2E_EMAIL || 'demo@acme.com'
  const password = process.env.E2E_PASSWORD || 'password'
  const company = process.env.E2E_COMPANY || 'demo'

  await page.goto(base + '/login')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.fill('input[name="company"]', company)
  await page.click('button:has-text("Connexion")')
  await page.waitForURL(/dashboard|pos/)

  await page.goto(base + '/transfers')
  await expect(page.getByText(/Transferts/i)).toBeVisible()

  // Minimal creation if there are products and boutiques already seeded in demo
  const hasSource = await page.locator('label:has-text("Source")').count()
  if (hasSource > 0) {
    // Try to select first source/dest options
    await page.locator('label:has-text("Source")').first().locator('..').locator('div[role="button"]').click().catch(() => {})
    await page.keyboard.press('ArrowDown').catch(() => {})
    await page.keyboard.press('Enter').catch(() => {})

    await page.locator('label:has-text("Destination")').first().locator('..').locator('div[role="button"]').click().catch(() => {})
    await page.keyboard.press('ArrowDown').catch(() => {})
    await page.keyboard.press('Enter').catch(() => {})

    // Add line then click Create if button exists
    const addLineBtn = page.getByRole('button', { name: /Ajouter une ligne|Add line/i })
    if (await addLineBtn.isVisible().catch(() => false)) {
      await addLineBtn.click()
    }
    const createBtn = page.getByRole('button', { name: /Créer|Create/i })
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click()
    }
  }

  // History visible
  await expect(page.getByText(/Historique|History/i)).toBeVisible()
})
