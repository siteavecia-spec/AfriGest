// Supertest in-process test for Ecommerce order creation (COD)
import request from 'supertest'

async function getApp() {
  const appMod = await import('../../dist/app.js')
  return appMod.default || appMod
}

async function run() {
  const app = await getApp()
  const tenantId = 'demo'

  // Create a simple COD order with one line
  const payload = {
    items: [{ sku: 'SKU-DEMO', quantity: 1, price: 1000, currency: 'GNF' }],
    payment: { provider: 'cod' },
    customer: { email: 'client@test.local' }
  }

  const r = await request(app)
    .post(`/api/tenants/${tenantId}/ecommerce/orders`)
    .set('Content-Type', 'application/json')
    .send(payload)
    .expect(res => {
      if (res.status !== 201 && res.status !== 200) throw new Error('Unexpected status for order creation')
    })

  console.log('\n[Supertest] Ecommerce order creation (COD) passed.\n')
}

run().catch((e) => { console.error(e); process.exit(1) })
