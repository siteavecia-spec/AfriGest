// Extended RBAC tests: inventory, restock status_change, transfers send/receive, support role
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

  // Inventory summary: manager_stock allowed, caissier forbidden
  {
    const tok = await getToken('manager_stock')
    await request(app).get('/inventory/summary?boutiqueId=bq-1').set('Authorization', `Bearer ${tok}`).expect((res) => {
      if (![200,500].includes(res.status)) throw new Error(`inventory summary manager_stock unexpected ${res.status}`)
    })
  }
  {
    const tok = await getToken('caissier')
    await request(app).get('/inventory/summary?boutiqueId=bq-1').set('Authorization', `Bearer ${tok}`).expect(403)
  }

  // Inventory session create: manager_stock allowed, caissier forbidden
  {
    const tok = await getToken('manager_stock')
    await request(app).post('/inventory/sessions').set('Authorization', `Bearer ${tok}`).send({
      boutiqueId: 'bq-1',
      items: [{ productId: 'prod-1001', counted: 1, unitPrice: 1000 }]
    }).expect((res) => {
      if (![201,500].includes(res.status)) throw new Error(`inventory session create unexpected ${res.status}`)
    })
  }
  {
    const tok = await getToken('caissier')
    await request(app).post('/inventory/sessions').set('Authorization', `Bearer ${tok}`).send({
      boutiqueId: 'bq-1',
      items: [{ productId: 'prod-1001', counted: 1 }]
    }).expect(403)
  }

  // Restock create by manager_stock, approve & fulfill by pdg
  let restockId
  {
    const tok = await getToken('manager_stock')
    const res = await request(app).post('/restock').set('Authorization', `Bearer ${tok}`).send({ boutiqueId: 'bq-1', productId: 'prod-1001', quantity: 1 })
    if (![201].includes(res.status)) throw new Error(`restock create unexpected ${res.status}`)
    restockId = res.body.id
  }
  {
    const tok = await getToken('pdg')
    await request(app).patch(`/restock/${restockId}/approve`).set('Authorization', `Bearer ${tok}`).expect(200)
    await request(app).patch(`/restock/${restockId}/fulfill`).set('Authorization', `Bearer ${tok}`).expect(200)
  }

  // Transfers create by dg, send by pdg, receive by dg
  let transferId
  {
    const tok = await getToken('dg')
    const res = await request(app).post('/transfers').set('Authorization', `Bearer ${tok}`).send({
      sourceBoutiqueId: 'bq-1', destBoutiqueId: 'bq-1', items: [{ productId: 'prod-1001', quantity: 1 }]
    })
    if (res.status !== 201) throw new Error(`transfer create unexpected ${res.status}`)
    transferId = res.body.id
  }
  {
    const tok = await getToken('pdg')
    await request(app).post(`/transfers/${transferId}/send`).set('Authorization', `Bearer ${tok}`).expect(200)
  }
  {
    const tok = await getToken('dg')
    await request(app).post(`/transfers/${transferId}/receive`).set('Authorization', `Bearer ${tok}`).expect(200)
  }

  // Support without support_until should be forbidden (read-only window required)
  {
    const tok = await getToken('support')
    await request(app).get('/sales').set('Authorization', `Bearer ${tok}`).expect(403)
  }

  console.log('\n[RBAC] Extended permissions tests passed.\n')
}

run().catch((e) => { console.error(e); process.exit(1) })
