// Supertest in-process test for Ecommerce product upsert (handles memory mode vs DB)
import request from 'supertest'
import { createServer } from 'http'

async function getApp() {
  const appMod = await import('../dist/app.js')
  const app = appMod.default || appMod
  return createServer(app)
}

async function getToken(role = 'pdg') {
  const tokens = await import('../dist/services/tokens.js')
  return tokens.signAccessToken('test-user', role)
}

async function run() {
  const app = await getApp()
  const token = await getToken('pdg')
  const tenantId = 'demo'

  const sku = `SKU-UP-${Date.now()}`
  const payload = {
    sku,
    title: 'Produit Test Upsert',
    price: 1234,
    currency: 'GNF',
    images: ['https://example.com/img.png'],
    isOnlineAvailable: true,
    onlineStockMode: 'shared'
  }

  const res = await request(app)
    .post(`/api/tenants/${tenantId}/ecommerce/products`)
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .send(payload)

  if (res.status === 501) {
    console.log('[Supertest] Upsert returned 501 (memory mode) — acceptable in this env.')
  } else if (res.status === 201 || res.status === 200) {
    console.log('[Supertest] Upsert product persisted (DB mode).')
    const list = await request(app)
      .get(`/api/tenants/${tenantId}/ecommerce/products`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    const items = (list.body && list.body.items) || []
    const found = items.find((p) => p.sku === sku)
    if (!found) throw new Error('Upserted product not found in listing')
  } else {
    throw new Error(`Unexpected status for upsert: ${res.status}`)
  }

  console.log('\n[Supertest] Ecommerce product upsert/list test passed.\n')
}

run().catch((e) => { console.error(e); process.exit(1) })
