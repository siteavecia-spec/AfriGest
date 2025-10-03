// RBAC tests for Ecommerce endpoints
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
  const tenantId = 'demo'

  // 1) PDG can READ products but cannot CREATE
  {
    const pdg = await getToken('pdg')
    await request(app)
      .get(`/api/tenants/${tenantId}/ecommerce/products`)
      .set('Authorization', `Bearer ${pdg}`)
      .expect(200)

    await request(app)
      .post(`/api/tenants/${tenantId}/ecommerce/products`)
      .set('Authorization', `Bearer ${pdg}`)
      .set('Content-Type', 'application/json')
      .send({ sku: 'PDG-BLOCKED', title: 'x', price: 1 })
      .expect(403)
  }

  // 2) ECOM MANAGER can CREATE/UPDATE products
  {
    const ecomManager = await getToken('ecom_manager')
    const sku = `SKU-RBAC-${Date.now()}`
    const createRes = await request(app)
      .post(`/api/tenants/${tenantId}/ecommerce/products`)
      .set('Authorization', `Bearer ${ecomManager}`)
      .set('Content-Type', 'application/json')
      .send({ sku, title: 'Produit RBAC', price: 1234 })

    // Accept DB (201/200) or memory mode (501)
    if (![200, 201, 501].includes(createRes.status)) {
      throw new Error(`Unexpected status for ecom_manager create: ${createRes.status}`)
    }

    // Update should be permitted (200/501)
    const upd = await request(app)
      .patch(`/api/tenants/${tenantId}/ecommerce/products/${sku}`)
      .set('Authorization', `Bearer ${ecomManager}`)
      .set('Content-Type', 'application/json')
      .send({ price: 1500 })

    if (![200, 404, 501].includes(upd.status)) {
      throw new Error(`Unexpected status for ecom_manager update: ${upd.status}`)
    }
  }

  // 3) Order status change: PDG forbidden, ECOM OPS allowed (but may 404 if order not found)
  {
    const pdg = await getToken('pdg')
    await request(app)
      .patch(`/api/tenants/${tenantId}/ecommerce/orders/ORDER-NOPE`)
      .set('Authorization', `Bearer ${pdg}`)
      .set('Content-Type', 'application/json')
      .send({ status: 'prepared' })
      .expect(403)

    const ecomOps = await getToken('ecom_ops')
    const res = await request(app)
      .patch(`/api/tenants/${tenantId}/ecommerce/orders/ORDER-NOPE`)
      .set('Authorization', `Bearer ${ecomOps}`)
      .set('Content-Type', 'application/json')
      .send({ status: 'prepared' })

    if (![200, 404].includes(res.status)) {
      throw new Error(`Unexpected status for ecom_ops status_change: ${res.status}`)
    }
  }

  console.log('\n[RBAC] Ecommerce authz tests passed.\n')
}

run().catch((e) => { console.error(e); process.exit(1) })
