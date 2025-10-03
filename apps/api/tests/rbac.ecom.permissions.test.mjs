// RBAC tests for E-commerce permissions
import request from 'supertest'
import { createServer } from 'http'

async function getApp() {
  const appMod = await import('../dist/app.js')
  const app = appMod.default || appMod
  return createServer(app)
}

async function getToken(role) {
  const tokens = await import('../dist/services/tokens.js')
  return tokens.signAccessToken('test-user', role)
}

async function run() {
  const app = await getApp()
  const tenant = 'demo'

  // Products read: ecom_manager allowed; ecom_ops forbidden
  {
    const tok = await getToken('ecom_manager')
    await request(app).get(`/api/tenants/${tenant}/ecommerce/products`).set('Authorization', `Bearer ${tok}`).expect((res) => {
      if (![200].includes(res.status)) throw new Error(`ecom products read (manager) unexpected ${res.status}`)
    })
  }
  {
    const tok = await getToken('ecom_ops')
    await request(app).get(`/api/tenants/${tenant}/ecommerce/products`).set('Authorization', `Bearer ${tok}`).expect(403)
  }

  // Products create: ecom_manager allowed; ecom_ops forbidden
  {
    const tok = await getToken('ecom_manager')
    await request(app).post(`/api/tenants/${tenant}/ecommerce/products`).set('Authorization', `Bearer ${tok}`).send({
      sku: 'SKU-E-1', title: 'Produit en ligne', price: 1000, currency: 'GNF'
    }).expect((res) => {
      if (![200,201,501,500].includes(res.status)) throw new Error(`ecom products create unexpected ${res.status}`)
    })
  }
  {
    const tok = await getToken('ecom_ops')
    await request(app).post(`/api/tenants/${tenant}/ecommerce/products`).set('Authorization', `Bearer ${tok}`).send({
      sku: 'SKU-E-2', title: 'Produit 2', price: 1000, currency: 'GNF'
    }).expect(403)
  }

  // Orders read: ecom_manager and ecom_ops allowed; super_admin forbidden
  {
    const tok = await getToken('ecom_manager')
    await request(app).get(`/api/tenants/${tenant}/ecommerce/orders`).set('Authorization', `Bearer ${tok}`).expect((res) => {
      if (![200].includes(res.status)) throw new Error(`ecom orders read (manager) unexpected ${res.status}`)
    })
  }
  {
    const tok = await getToken('ecom_ops')
    await request(app).get(`/api/tenants/${tenant}/ecommerce/orders`).set('Authorization', `Bearer ${tok}`).expect(200)
  }
  {
    const tok = await getToken('super_admin')
    await request(app).get(`/api/tenants/${tenant}/ecommerce/orders`).set('Authorization', `Bearer ${tok}`).expect(403)
  }

  // Orders status change: ecom_manager and ecom_ops allowed; marketing forbidden
  {
    const tok = await getToken('ecom_manager')
    await request(app).patch(`/api/tenants/${tenant}/ecommerce/orders/order-1`).set('Authorization', `Bearer ${tok}`).send({ status: 'prepared' }).expect((res) => {
      if (![200,404].includes(res.status)) throw new Error(`ecom order status (manager) unexpected ${res.status}`)
    })
  }
  {
    const tok = await getToken('ecom_ops')
    await request(app).patch(`/api/tenants/${tenant}/ecommerce/orders/order-2`).set('Authorization', `Bearer ${tok}`).send({ status: 'shipped' }).expect((res) => {
      if (![200,404].includes(res.status)) throw new Error(`ecom order status (ops) unexpected ${res.status}`)
    })
  }
  {
    const tok = await getToken('marketing')
    await request(app).patch(`/api/tenants/${tenant}/ecommerce/orders/order-3`).set('Authorization', `Bearer ${tok}`).send({ status: 'delivered' }).expect(403)
  }

  console.log('\n[RBAC] E-commerce permissions tests passed.\n')
}

run().catch((e) => { console.error(e); process.exit(1) })
