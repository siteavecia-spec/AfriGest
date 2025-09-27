// Supertest in-process test for Ecommerce product PATCH update (handles memory mode vs DB)
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

  const sku = `SKU-PATCH-${Date.now()}`

  // Try to upsert a product (may be 501 in memory mode)
  const up = await request(app)
    .post(`/api/tenants/${tenantId}/ecommerce/products`)
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .send({ sku, title: 'Produit PATCH', price: 456, currency: 'GNF', images: [], isOnlineAvailable: true, onlineStockMode: 'shared' })

  if (up.status === 501) {
    console.log('[Supertest] Upsert returned 501 (memory mode); skipping PATCH test.')
    return
  }
  if (up.status !== 201 && up.status !== 200) throw new Error(`Unexpected upsert status: ${up.status}`)

  // PATCH update
  const newTitle = 'Produit PATCH (maj)'
  const patch = await request(app)
    .patch(`/api/tenants/${tenantId}/ecommerce/products/${encodeURIComponent(sku)}`)
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .send({ title: newTitle, price: 789 })
    .expect(200)

  if (!patch.body || patch.body.title !== newTitle) throw new Error('PATCH did not update title')

  console.log('\n[Supertest] Ecommerce product PATCH update passed.\n')
}

run().catch((e) => { console.error(e); process.exit(1) })
