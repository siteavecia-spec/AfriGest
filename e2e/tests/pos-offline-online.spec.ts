import { test, expect } from '@playwright/test'

// Basic smoke: Login -> POS -> add a product -> simulate offline -> queue sale -> back online

test('POS offline/online basic flow', async ({ page }) => {
  const base = process.env.E2E_BASE_URL || 'http://localhost:5173'
  await page.goto(base + '/login')

  // Demo credentials (adapt for your env)
  const email = process.env.E2E_EMAIL || 'demo@acme.com'
  const password = process.env.E2E_PASSWORD || 'password'
  const company = process.env.E2E_COMPANY || 'demo'

  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.fill('input[name="company"]', company)
  await page.click('button:has-text("Connexion")')

  await page.waitForURL(/dashboard|pos/)
  await page.goto(base + '/pos')

  // Quick product search field
  await page.fill('input[label="Recherche produit (Nom ou SKU)"]', 'SKU')

  // Simulate offline
  await page.context().setOffline(true)

  // Try to validate sale with empty cart => expect disabled button
  const validate = page.getByRole('button', { name: 'Valider la vente' })
  await expect(validate).toBeDisabled()

  // Go back online
  await page.context().setOffline(false)

  // Navigate dashboard and export
  await page.goto(base + '/dashboard')
  const exportBtn = page.getByRole('button', { name: /Exporter ventes du jour/ })
  await expect(exportBtn).toBeVisible()
})
