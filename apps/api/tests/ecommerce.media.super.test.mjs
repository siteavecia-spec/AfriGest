// E-commerce media signing route tests
// Verifies validation and configuration errors without requiring CloudFront setup
// Route: GET /api/tenants/:tenantId/ecommerce/media/signed-url?path=...

import request from 'supertest'

async function getApp() {
  // Use compiled app
  const appMod = await import('../../dist/app.js')
  const app = appMod.default || appMod
  return app
}

async function testInvalidQuery() {
  const app = await getApp()
  const r = await request(app)
    .get('/api/tenants/demo/ecommerce/media/signed-url')
    .expect(400)
  if (!r.body || !r.body.error) throw new Error('Expected error payload for invalid query')
}

async function testInvalidPathTraversal() {
  const app = await getApp()
  const r = await request(app)
    .get('/api/tenants/demo/ecommerce/media/signed-url?path=' + encodeURIComponent('tenants/demo/../../secret.txt'))
    .expect(400)
  if (!r.body || !r.body.error) throw new Error('Expected error payload for invalid path')
}

async function testWrongTenant403() {
  const app = await getApp()
  const r = await request(app)
    .get('/api/tenants/demo/ecommerce/media/signed-url?path=' + encodeURIComponent('tenants/other/media/p1.jpg'))
    .expect(403)
  if (!r.body || !r.body.error) throw new Error('Expected error payload for wrong tenant path')
}

async function testNotConfigured400() {
  const app = await getApp()
  const r = await request(app)
    .get('/api/tenants/demo/ecommerce/media/signed-url?path=' + encodeURIComponent('tenants/demo/media/p1.jpg'))
    .expect(400)
  if (!r.body || !r.body.error) throw new Error('Expected error payload for not configured')
}

async function run() {
  await testInvalidQuery()
  await testInvalidPathTraversal()
  await testWrongTenant403()
  await testNotConfigured400()
  console.log('\nE-commerce media route tests passed.\n')
}

run().catch((e) => { console.error(e); process.exit(1) })
