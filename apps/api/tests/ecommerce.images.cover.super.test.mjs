// Supertest in-process test for Ecommerce product images cover (handles memory mode vs DB)
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

  const sku = `SKU-COVER-${Date.now()}`
  const pic1 = 'https://example.com/pic1.png'
  const pic2 = 'https://example.com/pic2.png'

  // Upsert product first (may be 501 in memory mode)
  const up = await request(app)
    .post(`/api/tenants/${tenantId}/ecommerce/products`)
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .send({ sku, title: 'Produit COVER', price: 111, currency: 'GNF', images: [pic1, pic2], isOnlineAvailable: true, onlineStockMode: 'shared' })

  if (up.status === 501) {
    console.log('[Supertest] Upsert returned 501 (memory mode); skipping cover check.')
    return
  }
  if (up.status !== 201 && up.status !== 200) throw new Error(`Unexpected upsert status: ${up.status}`)

  // Set cover to pic2
  await request(app)
    .patch(`/api/tenants/${tenantId}/ecommerce/products/${encodeURIComponent(sku)}/images/cover`)
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .send({ url: pic2 })
    .expect(200)

  // Verify order via listing
  const list = await request(app)
    .get(`/api/tenants/${tenantId}/ecommerce/products`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200)
  const items = (list.body && list.body.items) || []
  const found = items.find((p) => p.sku === sku)
  if (!found) throw new Error('Product not found after cover set')
  if (!Array.isArray(found.images) || found.images[0] !== pic2) throw new Error('Cover not set as first image')

  console.log('\n[Supertest] Ecommerce images cover passed.\n')
}

run().catch((e) => { console.error(e); process.exit(1) })
