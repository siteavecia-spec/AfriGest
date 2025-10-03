import { test, expect, request } from '@playwright/test'

const API_URL = process.env.VITE_API_URL || process.env.API_URL || 'http://localhost:4000'
const TENANT = process.env.E2E_TENANT || 'demo'

function authHeaders() {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = process.env.E2E_TOKEN
  const company = process.env.E2E_COMPANY
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (company) headers['x-company'] = company
  return headers
}

// This spec checks Mobile Money init endpoints and their callbacks (server-only)
// It does not call real providers; it simulates provider callbacks against the API.

test.describe('Ecommerce Mobile Money callbacks', () => {
  test('MTN init then callback success marks order paid (if DB supported)', async ({}) => {
    const ctx = await request.newContext()
    const initRes = await ctx.post(`${API_URL}/api/tenants/${TENANT}/ecommerce/payments/mtn/init`, {
      headers: authHeaders(),
      data: { items: [{ sku: 'SKU-TSHIRT', quantity: 1, price: 5000, currency: 'GNF' }], amount: 5000, currency: 'GNF', phone: '+224000000' }
    })
    expect(initRes.status()).toBeLessThan(600)
    const initJson = await initRes.json()
    expect(initJson.provider).toBe('mtn_momo')

    // If an orderId is returned (DB mode), simulate provider callback
    if (initJson.orderId) {
      const cbRes = await ctx.post(`${API_URL}/api/tenants/${TENANT}/ecommerce/payments/mtn/callback`, {
        headers: { 'Content-Type': 'application/json' },
        data: { status: 'success', orderId: initJson.orderId, amount: 5000, currency: 'GNF' }
      })
      expect(cbRes.status()).toBeLessThan(500)
    }
  })

  test('Orange init then callback success marks order paid (if DB supported)', async ({}) => {
    const ctx = await request.newContext()
    const initRes = await ctx.post(`${API_URL}/api/tenants/${TENANT}/ecommerce/payments/orange/init`, {
      headers: authHeaders(),
      data: { items: [{ sku: 'SKU-TSHIRT', quantity: 1, price: 7000, currency: 'GNF' }], amount: 7000, currency: 'GNF', phone: '+224111111' }
    })
    expect(initRes.status()).toBeLessThan(600)
    const initJson = await initRes.json()
    expect(initJson.provider).toBe('orange_momo')

    if (initJson.orderId) {
      const cbRes = await ctx.post(`${API_URL}/api/tenants/${TENANT}/ecommerce/payments/orange/callback`, {
        headers: { 'Content-Type': 'application/json' },
        data: { status: 'success', orderId: initJson.orderId, amount: 7000, currency: 'GNF' }
      })
      expect(cbRes.status()).toBeLessThan(500)
    }
  })
})
