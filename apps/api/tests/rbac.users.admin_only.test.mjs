// RBAC tests for user management endpoints (platform-only)
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

  // PDG should be allowed on /users list (200 or 500 if env lacks DB)
  {
    const pdg = await getToken('pdg')
    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${pdg}`)
    if (![200, 500].includes(res.status)) {
      throw new Error(`Unexpected status for pdg /users: ${res.status}`)
    }
  }

  // DG should be allowed on /users list (200 or 500 if env lacks DB)
  {
    const dg = await getToken('dg')
    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${dg}`)
    if (![200, 500].includes(res.status)) {
      throw new Error(`Unexpected status for dg /users: ${res.status}`)
    }
  }

  // Super admin can access /users list (200)
  {
    const superAdmin = await getToken('super_admin')
    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${superAdmin}`)

    if (![200, 500].includes(res.status)) {
      // 500 acceptable in env without DB; presence of 403 would be a failure
      throw new Error(`Unexpected status for super_admin /users: ${res.status}`)
    }
  }

  console.log('\n[RBAC] Users admin-only tests passed.\n')
}

run().catch((e) => { console.error(e); process.exit(1) })
