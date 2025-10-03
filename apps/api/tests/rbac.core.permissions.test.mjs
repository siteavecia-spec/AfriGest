// RBAC core permissions tests across modules
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

  // Users list: PDG, DG, Super Admin allowed; Caissier forbidden
  for (const role of ['pdg','dg','super_admin']) {
    const tok = await getToken(role)
    const res = await request(app).get('/users').set('Authorization', `Bearer ${tok}`)
    if (![200,500].includes(res.status)) throw new Error(`users list ${role} unexpected: ${res.status}`)
  }
  {
    const tok = await getToken('caissier')
    await request(app).get('/users').set('Authorization', `Bearer ${tok}`).expect(403)
  }

  // Products list: manager_stock allowed; super_admin forbidden; caissier forbidden
  {
    const tok = await getToken('manager_stock')
    await request(app).get('/products').set('Authorization', `Bearer ${tok}`).expect(200)
  }
  {
    const tok = await getToken('super_admin')
    await request(app).get('/products').set('Authorization', `Bearer ${tok}`).expect(403)
  }
  {
    const tok = await getToken('caissier')
    await request(app).get('/products').set('Authorization', `Bearer ${tok}`).expect(403)
  }

  // Sales GET list: caissier and employee allowed; super_admin forbidden
  {
    const tok = await getToken('caissier')
    await request(app).get('/sales').set('Authorization', `Bearer ${tok}`).expect(200)
  }
  {
    const tok = await getToken('employee')
    await request(app).get('/sales').set('Authorization', `Bearer ${tok}`).expect(200)
  }
  {
    const tok = await getToken('super_admin')
    await request(app).get('/sales').set('Authorization', `Bearer ${tok}`).expect(403)
  }

  // Sales POST create: caissier allowed (201), employee forbidden (403), super_admin forbidden (403)
  const salePayload = {
    boutiqueId: 'bq-1',
    items: [{ productId: 'prod-1001', quantity: 1, unitPrice: 1000 }],
    paymentMethod: 'cash',
    currency: 'GNF'
  }
  {
    const tok = await getToken('caissier')
    await request(app).post('/sales').set('Authorization', `Bearer ${tok}`).send(salePayload).expect((res) => {
      if (![201,400].includes(res.status)) throw new Error(`sales create caissier unexpected ${res.status}`)
    })
  }
  {
    const tok = await getToken('employee')
    await request(app).post('/sales').set('Authorization', `Bearer ${tok}`).send(salePayload).expect(403)
  }
  {
    const tok = await getToken('super_admin')
    await request(app).post('/sales').set('Authorization', `Bearer ${tok}`).send(salePayload).expect(403)
  }

  // Suppliers POST: manager_stock allowed; caissier forbidden
  {
    const tok = await getToken('manager_stock')
    await request(app).post('/suppliers').set('Authorization', `Bearer ${tok}`).send({ name: 'Test Fournisseur' }).expect((res) => {
      if (![201,400].includes(res.status)) throw new Error(`suppliers create manager_stock unexpected ${res.status}`)
    })
  }
  {
    const tok = await getToken('caissier')
    await request(app).post('/suppliers').set('Authorization', `Bearer ${tok}`).send({ name: 'X' }).expect(403)
  }

  // Restock POST: manager_stock allowed (create), employee forbidden
  {
    const tok = await getToken('manager_stock')
    await request(app).post('/restock').set('Authorization', `Bearer ${tok}`).send({ boutiqueId: 'bq-1', productId: 'prod-1001', quantity: 1 }).expect(201)
  }
  {
    const tok = await getToken('employee')
    await request(app).post('/restock').set('Authorization', `Bearer ${tok}`).send({ boutiqueId: 'bq-1', productId: 'prod-1001', quantity: 1 }).expect(403)
  }

  // Transfers POST create: dg allowed; caissier forbidden
  {
    const tok = await getToken('dg')
    await request(app).post('/transfers').set('Authorization', `Bearer ${tok}`).send({ sourceBoutiqueId: 'bq-1', destBoutiqueId: 'bq-1', items: [{ productId: 'prod-1001', quantity: 1 }] }).expect(201)
  }
  {
    const tok = await getToken('caissier')
    await request(app).post('/transfers').set('Authorization', `Bearer ${tok}`).send({ sourceBoutiqueId: 'bq-1', destBoutiqueId: 'bq-1', items: [{ productId: 'prod-1001', quantity: 1 }] }).expect(403)
  }

  console.log('\n[RBAC] Core permissions tests passed.\n')
}

run().catch((e) => { console.error(e); process.exit(1) })
