// Supertest in-process tests for Sales endpoints (memory mode)
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

  // Create product to sell
  const p = await request(app)
    .post('/products')
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .send({ sku: `SKU-SALES-${Date.now()}`, name: 'Produit Vente', price: 1200, cost: 800 })
    .expect(201)
  const productId = p.body?.id
  if (!productId) throw new Error('Missing productId for sales tests')

  // Create sale
  const saleRes = await request(app)
    .post('/sales')
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .send({ boutiqueId: 'bq-1', items: [{ productId, quantity: 1, unitPrice: 1200 }], paymentMethod: 'cash', currency: 'GNF' })
    .expect(201)
  if (!saleRes.body || !saleRes.body.id) throw new Error('Sale creation failed')

  // Summary
  await request(app)
    .get('/sales/summary')
    .set('Authorization', `Bearer ${token}`)
    .expect(200)

  console.log('\n[Supertest] Sales create/summary passed.\n')
}

run().catch((e) => { console.error(e); process.exit(1) })
