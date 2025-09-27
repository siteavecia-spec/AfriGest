// Simple happy-path integration checks (memory mode)
// Requires API running locally at http://localhost:4000

const BASE = process.env.API_URL || 'http://localhost:4000'

function log(msg) { console.log(`[TEST] ${msg}`) }

function assert(cond, msg) { if (!cond) { throw new Error(`Assertion failed: ${msg}`) } }

async function json(res) {
  const txt = await res.text()
  try { return JSON.parse(txt) } catch { throw new Error(`Invalid JSON: ${txt}`) }
}

async function run() {
  // Health
  log('Health check')
  let r = await fetch(`${BASE}/health`)
  assert(r.ok, 'health ok')
  const h = await json(r)
  assert(h.status === 'ok', 'health status ok')

  // Products: create + list
  log('Products: create')
  r = await fetch(`${BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku: 'TEST-SKU', name: 'Produit Test', price: 1000, cost: 700 })
  })
  assert(r.ok, 'create product ok')

  log('Products: list')
  r = await fetch(`${BASE}/products`)
  assert(r.ok, 'list products ok')
  const products = await json(r)
  assert(Array.isArray(products) && products.find(p => p.sku === 'TEST-SKU'), 'product found')

  // Stock: entry + summary + adjust + audit
  log('Stock: entry')
  const testProdId = (products.find(p => p.sku === 'TEST-SKU') || {}).id
  assert(testProdId, 'test product id exists')
  r = await fetch(`${BASE}/stock/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boutiqueId: 'bq-1', items: [{ productId: testProdId, quantity: 2, unitCost: 700 }] })
  })
  assert(r.ok, 'stock entry ok')

  log('Stock: summary')
  r = await fetch(`${BASE}/stock/summary?boutiqueId=bq-1`)
  assert(r.ok, 'stock summary ok')
  const sum = await json(r)
  assert(Array.isArray(sum.summary), 'stock summary list')

  log('Stock: adjust')
  r = await fetch(`${BASE}/stock/adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boutiqueId: 'bq-1', productId: testProdId, delta: -1, reason: 'test-adjust' })
  })
  assert(r.ok, 'stock adjust ok')

  log('Stock: audit')
  r = await fetch(`${BASE}/stock/audit?productId=${encodeURIComponent(testProdId)}&limit=5`)
  assert(r.ok, 'stock audit ok')
  const audit = await json(r)
  assert(Array.isArray(audit), 'audit list')

  // Sales: create + summary
  log('Sales: create')
  r = await fetch(`${BASE}/sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      boutiqueId: 'bq-1',
      items: [{ productId: testProdId, quantity: 1, unitPrice: 1000 }],
      paymentMethod: 'cash',
      currency: 'GNF'
    })
  })
  assert(r.ok, 'create sale ok')

  log('Sales: summary')
  r = await fetch(`${BASE}/sales/summary`)
  assert(r.ok, 'sales summary ok')
  const summary = await json(r)
  assert(summary.today && typeof summary.today.count === 'number', 'sales summary today ok')

  // Suppliers: CRUD
  log('Suppliers: create')
  r = await fetch(`${BASE}/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Fournisseur Test', email: 'f@test.local' })
  })
  assert(r.ok, 'create supplier ok')
  const created = await json(r)

  log('Suppliers: update')
  r = await fetch(`${BASE}/suppliers/${encodeURIComponent(created.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+224000000' })
  })
  assert(r.ok, 'update supplier ok')

  log('Suppliers: list')
  r = await fetch(`${BASE}/suppliers?limit=10&offset=0`)
  assert(r.ok, 'list suppliers ok')

  log('Suppliers: delete')
  r = await fetch(`${BASE}/suppliers/${encodeURIComponent(created.id)}`, { method: 'DELETE' })
  assert(r.status === 204, 'delete supplier ok')

  console.log('\nAll happy-path API checks passed.\n')
}

run().catch(e => { console.error(e); process.exit(1) })
