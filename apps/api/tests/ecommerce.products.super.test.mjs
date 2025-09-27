// Supertest in-process test for Ecommerce products listing (auth required)
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

  await request(app)
    .get(`/api/tenants/${tenantId}/ecommerce/products`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200)

  console.log('\n[Supertest] Ecommerce products listing passed.\n')
}

run().catch((e) => { console.error(e); process.exit(1) })
