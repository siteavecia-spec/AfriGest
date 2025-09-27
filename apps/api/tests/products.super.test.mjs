// Supertest in-process tests for Products (memory mode)
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

  // List products
  await request(app)
    .get('/products')
    .set('Authorization', `Bearer ${token}`)
    .expect(200)

  // Create product
  const sku = `TEST-SKU-${Date.now()}`
  const r = await request(app)
    .post('/products')
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .send({ sku, name: 'Produit Test', price: 1000, cost: 700 })
    .expect(201)
  if (!r.body || !r.body.id) throw new Error('Product creation failed')

  console.log('\n[Supertest] Products list/create passed.\n')
}

run().catch((e) => { console.error(e); process.exit(1) })
