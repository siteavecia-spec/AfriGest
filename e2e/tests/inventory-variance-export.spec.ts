import { test, expect } from '@playwright/test'

// Inventory: load summary -> compute variance -> export CSV

test('Inventory variance and CSV export', async ({ page }) => {
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

  await page.goto(base + '/inventory')
  // Load stock
  const loadBtn = page.getByRole('button', { name: /Charger le stock|Load stock/i })
  if (await loadBtn.isVisible().catch(() => false)) {
    await loadBtn.click()
  }
  // Compute variance
  const computeBtn = page.getByRole('button', { name: /Calculer variance|Compute variance/i })
  await computeBtn.click()
  // Expect results section
  await expect(page.getByText(/Résultats|Results|Inventory/i)).toBeVisible()
  // Export CSV button visible
  await expect(page.getByRole('button', { name: /Exporter CSV|Export CSV/i })).toBeVisible()
})
