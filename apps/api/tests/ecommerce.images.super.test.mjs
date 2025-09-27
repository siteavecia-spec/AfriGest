// Supertest in-process test for Ecommerce product images add/remove (handles memory mode vs DB)
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

  const sku = `SKU-IMG-${Date.now()}`
  const pic = 'https://example.com/pic.png'

  // Try to upsert a product first (may be 501 in memory mode)
  const up = await request(app)
    .post(`/api/tenants/${tenantId}/ecommerce/products`)
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .send({ sku, title: 'Produit IMG', price: 999, currency: 'GNF', images: [], isOnlineAvailable: true, onlineStockMode: 'shared' })

  if (up.status === 501) {
    console.log('[Supertest] Upsert returned 501 (memory mode); skipping images add/remove checks.')
    return
  }
  if (up.status !== 201 && up.status !== 200) throw new Error(`Unexpected upsert status: ${up.status}`)

  // Add image
  await request(app)
    .patch(`/api/tenants/${tenantId}/ecommerce/products/${encodeURIComponent(sku)}/images/add`)
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .send({ url: pic })
    .expect(200)

  // Remove image
  await request(app)
    .patch(`/api/tenants/${tenantId}/ecommerce/products/${encodeURIComponent(sku)}/images/remove`)
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .send({ url: pic })
    .expect(200)

  console.log('\n[Supertest] Ecommerce images add/remove passed.\n')
}

run().catch((e) => { console.error(e); process.exit(1) })
