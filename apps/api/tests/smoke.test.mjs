// In-process smoke test using Supertest
// Verifies /health and basic headers without starting the HTTP server

import request from 'supertest'

async function run() {
  // Import compiled app (built by tsc)
  const appMod = await import('../../dist/app.js')
  const app = appMod.default || appMod

  const r = await request(app)
    .get('/health')
    .set('Accept', 'application/json')
    .expect('Content-Type', /json/)
    .expect(200)

  const body = r.body
  if (!body || body.status !== 'ok') {
    throw new Error(`Unexpected health payload: ${JSON.stringify(body)}`)
  }

  // Check presence of headers set by middleware
  const reqId = r.headers['x-request-id']
  if (!reqId) {
    throw new Error('Missing X-Request-Id header')
  }
  const rateLimit = r.headers['x-ratelimit-limit']
  const remaining = r.headers['x-ratelimit-remaining']
  if (!rateLimit || remaining == null) {
    throw new Error('Missing X-RateLimit-* headers')
  }

  console.log('\nSmoke test passed: /health reachable with expected headers.\n')
}

run().catch((e) => { console.error(e); process.exit(1) })
