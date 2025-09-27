// Supertest in-process tests for Stock endpoints (memory mode)
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

  // Summary (needs boutiqueId)
  await request(app)
    .get('/stock/summary?boutiqueId=bq-1')
    .set('Authorization', `Bearer ${token}`)
    .expect(200)

  // Create entry (one line)
  // We need a productId. First, create a product.
  const p = await request(app)
    .post('/products')
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .send({ sku: `SKU-STOCK-${Date.now()}`, name: 'Produit Stock', price: 1000, cost: 700 })
    .expect(201)
  const productId = p.body?.id
  if (!productId) throw new Error('Missing productId for stock tests')

  await request(app)
    .post('/stock/entries')
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .send({ boutiqueId: 'bq-1', items: [{ productId, quantity: 1, unitCost: 700 }] })
    .expect(201)

  // Adjust stock
  await request(app)
    .post('/stock/adjust')
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .send({ boutiqueId: 'bq-1', productId, delta: -1, reason: 'test' })
    .expect(201)

  // Audit
  await request(app)
    .get(`/stock/audit?productId=${encodeURIComponent(productId)}&limit=5`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200)

  console.log('\n[Supertest] Stock endpoints passed.\n')
}

run().catch((e) => { console.error(e); process.exit(1) })
