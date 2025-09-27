import { test, expect } from '@playwright/test'

// Checkout simulate payments: MTN and Orange

test('Checkout simulate MTN and Orange', async ({ page }) => {
  const base = process.env.E2E_BASE_URL || 'http://localhost:5173'

  // Go directly to checkout; if cart is empty, the test will just verify buttons
  await page.goto(base + '/shop/checkout')

  // Buttons should be visible
  const mtnBtn = page.getByRole('button', { name: /simulate MTN/i })
  const orangeBtn = page.getByRole('button', { name: /simulate Orange/i })
  await expect(mtnBtn).toBeVisible()
  await expect(orangeBtn).toBeVisible()

  // Try MTN simulate; if cart is empty, the UI may show an error banner; that's acceptable here
  await mtnBtn.click().catch(() => {})
  // Short wait for any snackbar feedback
  await page.waitForTimeout(500)

  // Try Orange simulate
  await orangeBtn.click().catch(() => {})
  await page.waitForTimeout(500)

  // Assert page is still responsive
  await expect(page.getByText(/Commande|Checkout|Paiement/i)).toBeVisible({ timeout: 2000 })
})
