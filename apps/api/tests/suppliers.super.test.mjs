// Supertest in-process tests for Suppliers CRUD (memory mode)
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

  // List suppliers (should succeed even if empty)
  let r = await request(app)
    .get('/suppliers')
    .set('Authorization', `Bearer ${token}`)
    .expect(200)

  // Create supplier
  r = await request(app)
    .post('/suppliers')
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .send({ name: 'Fournisseur Test', email: 'f@test.local' })
    .expect(201)
  const created = r.body
  if (!created || !created.id) throw new Error('Supplier creation failed')

  // Update supplier
  await request(app)
    .put(`/suppliers/${encodeURIComponent(created.id)}`)
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .send({ phone: '+224000000' })
    .expect(200)

  // Delete supplier
  await request(app)
    .delete(`/suppliers/${encodeURIComponent(created.id)}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(204)

  console.log('\n[Supertest] Suppliers CRUD passed.\n')
}

run().catch((e) => { console.error(e); process.exit(1) })
